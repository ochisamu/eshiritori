import { describe, it, expect } from "vitest";
import { initialState, reducer, position } from "../../src/game/state";
import { activeAssets as assets } from "../../src/game/content";
import { generateBoard } from "../../src/game/boardGenerator";
import { legalMoves } from "../../src/game/rules";
import { hintActions, hintPresentation } from "../../src/game/hintPresentation";
import {
  projectGameView,
  voiceEligible,
} from "../../src/voice/projectGameView";
import { deriveGameEvents } from "../../src/voice/deriveGameEvents";
import { sameStamp } from "../../src/voice/protocol";
import { loadConfig } from "../../server/voice/config";
import { Pairing } from "../../server/voice/pairing";
import { UsageBook } from "../../server/voice/usage";
import {
  parseView,
  parseHintResult,
  allowedIntent,
  byteChunks,
} from "../../server/voice/context";
import { authorizedTool } from "../../server/voice/backendService";
import { mediaConfig } from "../../server/voice/openaiLiveAdapter";
function game(): import("../../src/game/types").GameState {
  let s = initialState();
  s.settings = { ...s.settings, mode: "practice", opponent: "turns" };
  s = reducer(
    s,
    { type: "START", seed: "voice-unit", settings: s.settings },
    assets,
  );
  const board = generateBoard(assets, {
    seed: s.seed,
    round: 0,
    difficulty: "normal",
    discovered: [],
    cpuOpening: false,
  });
  s = reducer(
    reducer(s, { type: "BOARD", board }, assets),
    { type: "READY" },
    assets,
  );
  return { ...s, actor: "player" as const, phase: "playerTurn" as const };
}
const stamp = {
  gameId: "game",
  boardEpoch: "board",
  revision: 1,
  turnId: "turn",
};
describe("optional voice boundaries", () => {
  it("projects visible cards without dictionary, planned CPU move, reserve or proof", () => {
    const s = game();
    s.board!.reserve = assets.slice(30, 40).map((a) => a.id);
    const view = projectGameView(s, assets, stamp, "cat");
    expect(view.cards).toHaveLength(24);
    expect(Object.keys(view.cards[0]).sort()).toEqual([
      "available",
      "description",
      "id",
      "slot",
    ]);
    const json = JSON.stringify(view);
    for (const key of [
      "readings",
      "proof",
      "reserve",
      "cpuDecision",
      "initialDiscovered",
      "OPENAI_API_KEY",
    ])
      expect(json).not.toContain(key);
    expect(view.hint).not.toHaveProperty("answer");
    expect(
      parseView({ ...view, proof: "secret", reserve: ["hidden"] }),
    ).toEqual(view);
  });
  it("only supports alternating untimed modes", () => {
    const s = game();
    expect(voiceEligible(s)).toBe(true);
    s.settings.mode = "refillPractice";
    expect(voiceEligible(s)).toBe(true);
    for (const mode of ["standard", "refill"] as const) {
      s.settings.mode = mode;
      expect(voiceEligible(s)).toBe(false);
    }
    s.settings.mode = "practice";
    s.settings.opponent = "race";
    expect(voiceEligible(s)).toBe(false);
  });
  it("shares hint consumption with screen and never dispatches REFERENCE", () => {
    let s = game();
    const move = legalMoves(assets, position(s))[0];
    for (const mode of ["open", "repeat", "next", "answer"] as const) {
      const before = s.hintUsed;
      const actions = hintActions(s, mode);
      expect(actions.every((a) => a.type === "HINT")).toBe(true);
      for (const a of actions) s = reducer(s, a, assets);
      const hint = hintPresentation(s, assets)!;
      expect(hint.used).toBe(s.hintUsed);
      if (mode === "repeat") expect(s.hintUsed).toBe(before);
      if (hint.level < 3) {
        expect(Object.keys(hint).sort()).toEqual([
          "level",
          "targetId",
          "text",
          "used",
        ]);
        if (hint.level === 2)
          expect(hint.text).not.toContain(move.reading.display);
      }
      expect(s.answerReferenced).toBe(false);
    }
    expect(hintPresentation(s, assets)?.explanation).toBe(
      move.reading.explanation,
    );
    expect(s.hintLevel).toBe(3);
    expect(s.hintUsed).toBe(3);
    expect(hintActions(s, "answer")).toEqual([]);
  });
  it("does not consume hints outside the player turn", () => {
    const s = { ...game(), phase: "cpuThinking" as const };
    expect(hintActions(s, "answer")).toEqual([]);
    expect(hintPresentation(s, assets)).toBeUndefined();
  });
  it.each([
    "ヒントはいらない",
    "答えは言わないで",
    "ヒントって何？",
    "もう少し、じゃなくてヒントはいらない",
    "ヒントの意味を教えて",
    "もう少し考えるね",
    "もう少し待って",
  ])("does not authorize negated or meta request: %s", (text) => {
    expect(allowedIntent(text, 1)).toBeUndefined();
    const view = projectGameView(game(), assets, stamp, "cat");
    expect(
      authorizedTool(
        { name: "game_request_hint", arguments: '{"mode":"answer"}' },
        text,
        view,
      ),
    ).toBeUndefined();
  });
  it.each([
    ["ヒントちょうだい", "open"],
    ["同じヒントをもう一度言って", "repeat"],
    ["もう少しヒントを教えて", "next"],
    ["答えを教えて", "answer"],
  ])("separates explicit hint request %s", (text, mode) =>
    expect(allowedIntent(text, 1)).toEqual({ action: "hint", mode }),
  );
  it("routes an explicit reading explanation to approved facts without consuming hints", () => {
    expect(allowedIntent("いまの読みはどういう意味？", 3)).toEqual({
      action: "explain",
    });
    expect(allowedIntent("ヒントの意味を教えて", 1)).toBeUndefined();
    const config = loadConfig({});
    const book = new UsageBook(config);
    book.voice(0, true);
    book.reserve("backend", "pending");
    book.reserve("backend", "pending");
    expect(book.snapshot().backend.uncertain).toBe(1);
    expect(book.estimate()).toBe(0.02);
    book.tokens("backend", "pending", { input_tokens: 10, output_tokens: 1 });
    expect(book.snapshot().backend).toMatchObject({ calls: 1, uncertain: 0 });
    expect(book.estimate()).toBeLessThan(0.02);
  });
  it("transports only published answer reasons and strips them from lower hint levels", () => {
    expect(
      parseHintResult({
        level: 3,
        used: 3,
        text: "やく",
        explanation: "パンを焼く動作",
      }).explanation,
    ).toBe("パンを焼く動作");
    expect(
      parseHintResult({
        level: 2,
        used: 2,
        text: "?く",
        explanation: "unpublished reason",
      }),
    ).not.toHaveProperty("explanation");
    expect(() => parseHintResult({ level: 7 })).toThrow("invalid_hint");
  });
  it("blocks a model-selected escalation that the user did not request", () => {
    const view = projectGameView(game(), assets, stamp, "cat");
    expect(
      authorizedTool(
        { name: "game_request_hint", arguments: '{"mode":"answer"}' },
        "ヒントちょうだい",
        view,
      ),
    ).toBeUndefined();
    expect(
      authorizedTool({ name: "submit", arguments: "{}" }, "りんご", view),
    ).toBeUndefined();
  });
  it("identifies replay/new-board epochs and deduplicable semantic events", () => {
    const view = projectGameView(game(), assets, stamp, "cat");
    expect(deriveGameEvents(view, { ...view })).toEqual([]);
    const after = { ...view, ...stamp, boardEpoch: "new", revision: 2 };
    expect(sameStamp(view, after)).toBe(false);
    expect(
      deriveGameEvents(view, after).some((e) => e.type === "board.ready"),
    ).toBe(true);
  });
  it("counts cumulative voice duration once and each token request once", () => {
    const config = loadConfig({});
    const book = new UsageBook(config);
    book.voice(10);
    book.voice(12);
    book.voice(12, true);
    expect(book.seconds).toBe(12);
    book.tokens("backend", "same", { input_tokens: 20, output_tokens: 10 });
    book.tokens("backend", "same", { input_tokens: 20, output_tokens: 10 });
    expect(book.snapshot().backend).toEqual({
      calls: 1,
      input: 20,
      output: 10,
      cached: 0,
      uncertain: 0,
    });
    expect(book.snapshot().finalized).toBe(true);
  });
  it("uses expiring one-time pairing and rejects guessing", () => {
    let now = 1000;
    const pairing = new Pairing(() => now),
      code = pairing.code;
    const device = pairing.pair(code, "a");
    expect(pairing.device("eshiritori_voice=" + device.id)?.csrf).toBe(
      device.csrf,
    );
    expect(() => pairing.pair(code, "b")).toThrow();
    pairing.rotate();
    now += 300001;
    expect(() => pairing.pair(pairing.code, "c")).toThrow();
    for (let i = 0; i < 5; i++)
      expect(() => pairing.pair("000000", "d")).toThrow();
    expect(() => pairing.pair("000000", "d")).toThrow("pair_rate_limit");
  });
  it("requires explicit HTTPS and exact origins for LAN", () => {
    expect(() => loadConfig({ VOICE_LAN: "true" })).toThrow();
    expect(() =>
      loadConfig({ VOICE_ALLOWED_ORIGINS: "http://evil.example" }),
    ).toThrow();
    expect(() =>
      loadConfig({
        VOICE_LAN: "true",
        VOICE_TLS_CERT: "cert",
        VOICE_TLS_KEY: "key",
        VOICE_ALLOWED_ORIGINS: "http://192.168.1.2:4174",
      }),
    ).toThrow();
    expect(
      loadConfig({
        VOICE_LAN: "true",
        VOICE_TLS_CERT: "cert",
        VOICE_TLS_KEY: "key",
        VOICE_ALLOWED_ORIGINS: "https://192.168.1.2:4174",
      }).lan,
    ).toBe(true);
  });
  it("restricts the frontend Live data channel and stores no recording", () => {
    const config = mediaConfig(loadConfig({}));
    expect(config.store).toBe(false);
    expect(config.delegation?.type).toBe("client");
    expect(config.client?.data_channel.allowed_client_events).toEqual([]);
    expect(config).not.toHaveProperty("apiKey");
  });
  it("keeps context appends within the documented 500-token upper bound by bytes", () => {
    const original = "絵🐈の説明".repeat(200);
    const parts = byteChunks(original);
    expect(parts.join("")).toBe(original);
    expect(parts.every((p) => Buffer.byteLength(p) <= 480)).toBe(true);
  });
});
