import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import type { ServerEvent } from "openai/resources/live/live";
import { ConversationDirector } from "../../server/voice/conversationDirector";
import {
  OpenAILiveAdapter,
  type LiveLink,
} from "../../server/voice/openaiLiveAdapter";
import { loadConfig } from "../../server/voice/config";
import {
  defaultVoiceOptions,
  type GameVoiceView,
} from "../../src/voice/protocol";
const request = vi.hoisted(() => vi.fn());
const moodRequest = vi.hoisted(() => vi.fn());
vi.mock("../../server/voice/decisionsService", () => ({
  decideMood: moodRequest,
}));
vi.mock("../../server/voice/backendService", async (original) => {
  const actual =
    await original<typeof import("../../server/voice/backendService")>();
  return { ...actual, backendRequest: request };
});
const view: GameVoiceView = {
  gameId: "g",
  boardEpoch: "b",
  revision: 1,
  turnId: "b:0:player",
  phase: "playerTurn",
  actor: "player",
  head: "あ",
  moveCount: 0,
  eligible: true,
  cards: [],
  hint: { level: 0, used: 0, canRequest: true },
  opponent: { variant: "cat" },
};
const response = {
  id: "response-test",
  usage: { input_tokens: 40, output_tokens: 12 },
  output_text: "",
  output: [
    {
      type: "function_call",
      name: "game_request_hint",
      arguments: '{"mode":"open"}',
      call_id: "c",
    },
  ],
};
async function setup(decisions = false) {
  const config = loadConfig({ VOICE_DECISIONS_ENABLED: String(decisions) }),
    adapter = new OpenAILiveAdapter(config),
    messages: Record<string, any>[] = [],
    sent: Record<string, any>[] = [];
  let emit: (event: ServerEvent) => void = () => {};
  adapter.create = async () => ({ id: "fake", sdp: "fake" });
  adapter.attach = async (_id, callback) => {
    emit = callback;
    return {
      send: (event: { type: string; event_id?: string }) => {
        sent.push(event);
        if (event.type.endsWith(".append"))
          queueMicrotask(() =>
            emit({
              type: event.type + "ed",
              event_id: "ack",
              client_event_id: event.event_id,
            } as ServerEvent),
          );
      },
      close: async () => {
        emit({
          type: "session.closed",
          event_id: "closed",
          session: { id: "fake" } as never,
          reason: "close_requested",
          usage: { seconds: 3 },
        });
        return true;
      },
    } as unknown as LiveLink;
  };
  const director = new ConversationDirector(
    config,
    adapter,
    (message) => messages.push(message),
    { ...defaultVoiceOptions, decisions },
    () => 0,
  );
  director.update({ ...view });
  await director.connect("v=0");
  director.startConversation();
  await vi.advanceTimersByTimeAsync(10);
  return {
    director,
    messages,
    sent,
    emit,
    transcript: (text: string, id = "t") =>
      emit({
        type: "session.input_transcript.delta",
        event_id: id,
        start_ms: 1000,
        end_ms: 1800,
        delta: text,
      }),
  };
}
beforeEach(() => {
  vi.useFakeTimers();
  request.mockReset();
  moodRequest.mockReset();
  moodRequest.mockResolvedValue({
    mood: "happy",
    usage: { input_tokens: 10, output_tokens: 0 },
  });
  request.mockResolvedValue(response);
});
afterEach(() => vi.useRealTimers());
describe("voice temporal safety", () => {
  it("does not treat reflected context as user speech or a control request", async () => {
    const x = await setup();
    x.emit({
      type: "session.input_transcript.delta",
      event_id: "context",
      client_event_id: "context-command",
      start_ms: 500,
      end_ms: 500,
      delta: "ヒントちょうだい",
    });
    x.director.inputActivity(true, 1);
    x.director.inputActivity(false, 1);
    await vi.advanceTimersByTimeAsync(2200);
    expect(request).not.toHaveBeenCalled();
    expect(
      x.messages.filter((m) => m.type === "caption" && m.direction === "user"),
    ).toHaveLength(0);
    expect(x.director.metrics.contextEchoes).toBe(1);
    await x.director.stop();
  });
  it("waits for local speech end and stable transcripts before any hint operation", async () => {
    const x = await setup();
    x.director.inputActivity(true, 1);
    x.transcript("ヒントちょうだい");
    await vi.advanceTimersByTimeAsync(2500);
    expect(request).not.toHaveBeenCalled();
    x.director.inputActivity(false, 1);
    await vi.advanceTimersByTimeAsync(1200);
    expect(request).toHaveBeenCalledTimes(1);
    expect(x.messages.filter((m) => m.type === "operation")).toHaveLength(1);
    await x.director.stop();
  });
  it("does not re-execute a consumed request for duplicate delegations", async () => {
    const x = await setup();
    x.director.inputActivity(true, 1);
    x.transcript("ヒントちょうだい");
    x.director.inputActivity(false, 1);
    await vi.advanceTimersByTimeAsync(1200);
    const op = x.messages.find((m) => m.type === "operation")!.operation;
    x.director.operationResult({
      requestId: op.requestId,
      connectionEpoch: x.director.epoch,
      status: "ok",
      view: {
        ...view,
        revision: 2,
        hint: { level: 1, used: 1, canRequest: true },
      },
      hint: { level: 1, used: 1, text: "絵の説明" },
    });
    await vi.advanceTimersByTimeAsync(20);
    for (const id of ["same", "same", "late"])
      x.emit({
        type: "session.delegation.created",
        event_id: id,
        offset_ms: 2000,
        delegation: { id, type: "delegation", target: "client" },
      });
    await vi.advanceTimersByTimeAsync(1200);
    expect(x.messages.filter((m) => m.type === "operation")).toHaveLength(1);
    await x.director.stop();
  });
  it("discards a slow backend result after a new board", async () => {
    let resolve!: (value: typeof response) => void;
    request.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const x = await setup();
    x.director.inputActivity(true, 1);
    x.transcript("ヒントちょうだい");
    x.director.inputActivity(false, 1);
    await vi.advanceTimersByTimeAsync(1200);
    x.director.update({
      ...view,
      boardEpoch: "new",
      turnId: "new:0:player",
      revision: 2,
    });
    resolve(response);
    await vi.advanceTimersByTimeAsync(20);
    expect(x.messages.filter((m) => m.type === "operation")).toHaveLength(0);
    expect(x.director.metrics.staleResults).toBe(1);
    await x.director.stop();
  });
  it("does not act on a negation or an unfinished fragment", async () => {
    const x = await setup();
    x.director.inputActivity(true, 1);
    x.transcript("ヒントはいらない。まだ考えるね");
    x.director.inputActivity(false, 1);
    await vi.advanceTimersByTimeAsync(2000);
    expect(request).not.toHaveBeenCalled();
    await x.director.stop();
  });
  it("returns approved revealed-answer reasons and forgets them on the next board", async () => {
    const x = await setup();
    x.director.inputActivity(true, 1);
    x.transcript("ヒントちょうだい");
    x.director.inputActivity(false, 1);
    await vi.advanceTimersByTimeAsync(1200);
    const op = x.messages.find((m) => m.type === "operation")!.operation;
    x.director.operationResult({
      requestId: op.requestId,
      connectionEpoch: x.director.epoch,
      status: "ok",
      view: {
        ...view,
        revision: 2,
        hint: { level: 3, used: 3, canRequest: false },
      },
      hint: {
        level: 3,
        used: 3,
        text: "答えは「やく」",
        explanation: "パンを焼く動作",
      },
    });
    await vi.advanceTimersByTimeAsync(30);
    request.mockResolvedValue({
      ...response,
      output: [
        {
          type: "function_call",
          name: "game_explain_last_move",
          arguments: "{}",
          call_id: "why",
        },
      ],
    });
    async function explain(sequence: number) {
      x.director.inputActivity(true, sequence);
      x.transcript("いまの読みはどういう意味？", "t" + sequence);
      x.director.inputActivity(false, sequence);
      await vi.advanceTimersByTimeAsync(1200);
    }
    await explain(2);
    expect(
      x.sent.some(
        (e) =>
          e.type === "session.commentary.append" &&
          e.content?.includes("パンを焼く動作"),
      ),
    ).toBe(true);
    x.sent.length = 0;
    x.director.update({
      ...view,
      boardEpoch: "next",
      turnId: "next:0:player",
      revision: 3,
    });
    await vi.advanceTimersByTimeAsync(30);
    await explain(3);
    expect(
      x.sent.some(
        (e) =>
          e.type === "session.commentary.append" &&
          e.content?.includes("まだ確定した読みはありません"),
      ),
    ).toBe(true);
    expect(x.sent.some((e) => e.content?.includes("パンを焼く動作"))).toBe(
      false,
    );
    await x.director.stop();
  });
  it("restores the existing face when Decisions fails, and off prevents new calls", async () => {
    const x = await setup(true);
    moodRequest.mockRejectedValue(Error("permission_denied"));
    x.director.inputActivity(true, 1);
    x.transcript("ヒントはいらない。まだ考えるね");
    x.director.inputActivity(false, 1);
    await vi.advanceTimersByTimeAsync(1200);
    expect(moodRequest).toHaveBeenCalledTimes(1);
    expect(x.messages.some((m) => m.type === "mood" && m.mood === null)).toBe(
      true,
    );
    expect(
      x.messages.some(
        (m) => m.type === "notice" && m.code === "decisions_unavailable",
      ),
    ).toBe(true);
    x.director.setOptions({ ...defaultVoiceOptions, decisions: false });
    x.director.inputActivity(true, 2);
    x.transcript("いいね", "second");
    x.director.inputActivity(false, 2);
    await vi.advanceTimersByTimeAsync(1500);
    expect(moodRequest).toHaveBeenCalledTimes(1);
    await x.director.stop();
  });
  it("does not play a speculative hint while waiting for an engine-confirmed result", async () => {
    let resolve!: (value: typeof response) => void;
    request.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const x = await setup();
    x.director.inputActivity(true, 1);
    x.transcript("ヒントちょうだい");
    x.director.inputActivity(false, 1);
    await vi.advanceTimersByTimeAsync(1600);
    x.emit({
      type: "session.output_transcript.delta",
      event_id: "speculative",
      start_ms: 2000,
      end_ms: 2500,
      delta: "unconfirmed clue",
    });
    x.emit({
      type: "session.output_audio.delta",
      event_id: "speculative-audio",
      delta: "AAAA",
    } as ServerEvent);
    expect(
      x.messages.some(
        (m) => m.type === "caption" && m.text.includes("unconfirmed"),
      ),
    ).toBe(false);
    expect(x.messages.some((m) => m.type === "audio")).toBe(false);
    resolve(response);
    await vi.advanceTimersByTimeAsync(20);
    expect(x.messages.filter((m) => m.type === "operation")).toHaveLength(1);
    await x.director.stop();
  });
  it("keeps an ordinary answer audible when a move changes the turn during the question", async () => {
    const x = await setup();
    x.director.inputActivity(true, 1);
    x.transcript("好きな色は何色？");
    x.director.update({
      ...view,
      revision: 2,
      moveCount: 1,
      phase: "cpuThinking",
      turnId: "b:1:cpu",
      actor: "cpu",
    });
    x.director.inputActivity(false, 1);
    await vi.advanceTimersByTimeAsync(1100);
    x.emit({
      type: "session.output_audio.delta",
      event_id: "reply",
      delta: "AAAA",
    } as ServerEvent);
    expect(x.messages.filter((m) => m.type === "audio")).toHaveLength(1);
    expect(
      x.sent
        .filter((e) => e.type === "session.instructions.append")
        .some((e) => e.content?.includes("静かにし")),
    ).toBe(false);
    await x.director.stop();
  });
  it("does not discard ordinary reply audio on a CPU move after recognition", async () => {
    const x = await setup();
    x.director.inputActivity(true, 1);
    x.transcript("今日はちょっと疲れたな");
    x.director.inputActivity(false, 1);
    await vi.advanceTimersByTimeAsync(1200);
    x.messages.length = 0;
    x.director.update({
      ...view,
      revision: 2,
      moveCount: 1,
      turnId: "b:1:player",
    });
    await vi.advanceTimersByTimeAsync(100);
    x.emit({
      type: "session.output_audio.delta",
      event_id: "reply",
      delta: "AAAA",
    } as ServerEvent);
    expect(x.messages.some((m) => m.type === "audio")).toBe(true);
    expect(x.messages.some((m) => m.type === "discard")).toBe(false);
    await x.director.stop();
  });
  it("treats a casual comment about a panel as conversation rather than an engine hint request", async () => {
    const x = await setup();
    x.director.inputActivity(true, 1);
    x.transcript("このパネル、かわいいね");
    x.director.inputActivity(false, 1);
    await vi.advanceTimersByTimeAsync(1200);
    x.messages.length = 0;
    x.director.update({
      ...view,
      revision: 2,
      moveCount: 1,
      turnId: "b:1:player",
    });
    await vi.advanceTimersByTimeAsync(100);
    x.emit({
      type: "session.output_audio.delta",
      event_id: "casual",
      delta: "AAAA",
    } as ServerEvent);
    expect(
      x.messages.some((m) => m.type === "audio" && m.scope === "conversation"),
    ).toBe(true);
    expect(request).not.toHaveBeenCalled();
    await x.director.stop();
  });
});
