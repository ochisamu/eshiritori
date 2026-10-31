import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import type { GameVoiceView } from "../../src/voice/protocol";
import { VoiceController } from "../../src/voice/VoiceController";
function input() {
  const messages: any[] = [];
  let Processor: any;
  class Base {
    port = { postMessage: (m: any) => messages.push(m) };
  }
  runInNewContext(readFileSync("src/voice/input.worklet.js", "utf8"), {
    AudioWorkletProcessor: Base,
    sampleRate: 24000,
    registerProcessor: (_: string, processor: any) => {
      Processor = processor;
    },
  });
  const processor = new Processor();
  const frames = (value: number, count: number) => {
    for (let i = 0; i < count; i++)
      processor.process(
        [[new Float32Array(240).fill(value)]],
        [[new Float32Array(240)]],
      );
  };
  return { messages, frames };
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("local microphone feedback", () => {
  it("meters input without turning level events into speech or leaking samples", () => {
    const { messages, frames } = input();
    frames(0.005, 50);
    expect(messages.length).toBeGreaterThan(0);
    expect(
      messages.every(
        (m) => m.type === "level" && m.value > 0 && Object.keys(m).length === 2,
      ),
    ).toBe(true);
  });
  it("signals an interruption once and closes the same speech sequence after silence", () => {
    const { messages, frames } = input();
    frames(0.04, 30);
    frames(0, 100);
    expect(messages.filter((m) => m.type !== "level")).toEqual([
      { active: true, sequence: 1 },
      { active: false, sequence: 1 },
    ]);
    expect(
      messages
        .filter((m) => m.type === "level")
        .every((m) => m.value >= 0 && m.value <= 1),
    ).toBe(true);
  });
  it("cancels title board preparation before requesting a microphone or API session", async () => {
    vi.useFakeTimers();
    const microphone = vi.fn();
    vi.stubGlobal("isSecureContext", true);
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: microphone } });
    vi.stubGlobal(
      "AudioContext",
      class {
        resume = async () => {};
        close = async () => {};
        state = "running";
      },
    );
    const controller = new VoiceController();
    controller.status = async () => ({
      available: true,
      paired: true,
      busy: false,
      lan: false,
      maxSeconds: 900,
    });
    const starting = controller.start(true);
    await vi.advanceTimersByTimeAsync(100);
    expect(controller.ui.step).toBe("board");
    await controller.stop();
    await vi.advanceTimersByTimeAsync(100);
    await starting;
    expect(microphone).not.toHaveBeenCalled();
    expect(controller.ui.state).toBe("off");
    expect(controller.ui.inputLevel).toBe(0);
  });
  it("keeps a spoken-turn permit through card changes before the first reply audio", () => {
    const controller = new VoiceController();
    const postMessage = vi.fn();
    const internal = controller as any;
    internal.output = { port: { postMessage } };
    const view = {
      gameId: "g",
      boardEpoch: "b",
      revision: 1,
      moveCount: 0,
      phase: "playerTurn",
      eligible: true,
    } as GameVoiceView;
    controller.sync(view);
    internal.receive({ type: "permit", scope: "conversation" });
    postMessage.mockClear();
    controller.sync({
      ...view,
      revision: 2,
      moveCount: 1,
      phase: "cpuThinking",
    });
    expect(postMessage).not.toHaveBeenCalled();
  });
  it("rejects old game audio and connection audio while allowing an ordinary reply through a board change", () => {
    const controller = new VoiceController();
    const postMessage = vi.fn();
    const internal = controller as any;
    internal.output = { port: { postMessage } };
    controller.sync({ boardEpoch: "new", revision: 2 } as GameVoiceView);
    internal.receive({ type: "slot", connectionEpoch: "current" });
    const packet = {
      type: "audio",
      boardEpoch: "old",
      revision: 1,
      connectionEpoch: "current",
      rate: 24000,
      data: "AAAA",
    };
    internal.receive({ ...packet, scope: "game" });
    expect(postMessage).not.toHaveBeenCalled();
    internal.receive({
      ...packet,
      scope: "conversation",
      connectionEpoch: "old-connection",
    });
    expect(postMessage).not.toHaveBeenCalled();
    internal.receive({ ...packet, scope: "conversation" });
    expect(postMessage).toHaveBeenCalledTimes(1);
  });
});
