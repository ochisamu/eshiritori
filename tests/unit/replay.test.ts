import { describe, it, expect } from "vitest";
import { assets } from "../../src/game/content";
import { exportReplay, importReplay } from "../../src/game/replay";
import { generateBoard } from "../../src/game/boardGenerator";
import {
  initialState,
  reducer,
  currentRecord,
  recordKey,
} from "../../src/game/state";
import { validSave } from "../../src/storage/save";
import { withReserve } from "../../src/game/refill";
function session() {
  const s = initialState();
  s.seed = "再挑戦の庭";
  s.round = 3;
  s.settings = { ...s.settings, mode: "practice", difficulty: "easy" };
  s.discovered = assets.slice(0, 5).map((a) => a.readings[0].id);
  s.recentBoards = [
    generateBoard(assets, {
      seed: s.seed,
      round: 2,
      difficulty: "easy",
      discovered: s.discovered,
    }),
  ];
  s.board = generateBoard(assets, {
    seed: s.seed,
    round: s.round,
    difficulty: "easy",
    discovered: s.discovered,
    recent: s.recentBoards,
  });
  return s;
}
function change(code: string, edit: (v: Record<string, any>) => void) {
  const p = JSON.parse(Buffer.from(code.slice(5), "base64url").toString());
  edit(p);
  return "ESR1-" + Buffer.from(JSON.stringify(p)).toString("base64url");
}
describe("portable replay and record categories", () => {
  it("preserves the exact replacement stack and rejects mismatched or duplicate reserve cards", () => {
    const s = session();
    s.settings.mode = "refill";
    s.board = withReserve(s.board!, s.settings.difficulty, assets);
    const code = exportReplay(s),
      imported = importReplay(code, assets);
    expect(imported.board.reserve).toEqual(s.board.reserve);
    expect(() =>
      importReplay(
        change(code, (p) => {
          p.board.reserve.pop();
        }),
        assets,
      ),
    ).toThrow(/補充札/);
    expect(() =>
      importReplay(
        change(code, (p) => {
          p.board.reserve[0] = p.board.ids[0];
        }),
        assets,
      ),
    ).toThrow(/盤面/);
    expect(() =>
      importReplay(
        change(code, (p) => {
          p.settings.mode = "standard";
        }),
        assets,
      ),
    ).toThrow(/補充札/);
  });
  it("restores board order, head, starter, settings, history and initial discovery exactly", () => {
    const s = session(),
      code = exportReplay(s),
      r = importReplay(code, assets);
    expect(r.seed).toBe(s.seed);
    expect(r.round).toBe(3);
    expect(r.settings).toEqual(s.settings);
    expect(r.board.ids).toEqual(s.board!.ids);
    expect(r.board.head).toBe(s.board!.head);
    expect(r.board.cpuVersion).toBe(s.board!.cpuVersion);
    expect(r.board.initialDiscovered).toEqual(s.discovered);
    expect(r.recentBoards[0].ids).toEqual(s.recentBoards[0].ids);
    const regenerated = generateBoard(assets, {
      seed: r.seed,
      round: r.round,
      difficulty: r.settings.difficulty,
      discovered: r.board.initialDiscovered!,
      recent: r.recentBoards,
    });
    expect(regenerated.ids).toEqual(r.board.ids);
  });
  it("preserves the local collection while replay uses the original discovery", () => {
    const s = session(),
      r = importReplay(exportReplay(s), assets),
      local = {
        ...initialState(),
        discovered: [assets[20].readings[0].id],
        stats: { ...initialState().stats, played: 8 },
      };
    const n = reducer(local, { type: "IMPORT_REPLAY", session: r }, assets);
    expect(n.discovered).toEqual(local.discovered);
    expect(n.replayDiscovery).toEqual(s.discovered);
    expect(n.actor).toBe("cpu");
    expect(n.stats.played).toBe(8);
    expect(n.phase).toBe("loadingRound");
    expect(validSave(n)).toBe(true);
  });
  it.each(["content", "rng", "rules"])(
    "rejects mismatched %s versions",
    (field) => {
      const code = exportReplay(session());
      expect(() =>
        importReplay(
          change(code, (p) => (p[field] = "wrong")),
          assets,
        ),
      ).toThrow("版");
    },
  );
  it.each(["not-a-code", "ESR1-____", "ESR1-e30", "x".repeat(500001)])(
    "rejects corrupt or oversized data",
    (code) => expect(() => importReplay(code, assets)).toThrow("再挑戦コード"),
  );
  it("rejects duplicate cards, absent readings, invalid settings and unsupported CPU", () => {
    const code = exportReplay(session());
    for (const edit of [
      (p: any) => (p.board.ids[1] = p.board.ids[0]),
      (p: any) => (p.board.initialDiscovered = ["unknown"]),
      (p: any) => (p.settings.seconds = -1),
      (p: any) => (p.board.cpuVersion = "unknown"),
      (p: any) => (p.board.version = "unknown"),
      (p: any) => (p.round = -1),
    ])
      expect(() => importReplay(change(code, edit), assets)).toThrow(
        "再挑戦コード",
      );
  });
  it("rejects an impossible board and missing board export", () => {
    const s = session();
    expect(() => exportReplay(initialState())).toThrow();
    expect(() =>
      importReplay(
        change(exportReplay(s), (p) => (p.board.head = "を")),
        assets,
      ),
    ).toThrow("成立");
  });
  it("keeps replay, time, mode, reference and hint streaks separate and preserves old totals", () => {
    const s = session();
    let ended = {
      ...s,
      phase: "playerTurn" as const,
      stats: {
        played: 4,
        wins: 3,
        streak: 3,
        best: 3,
        byMode: { [recordKey(s)]: { played: 2, wins: 2, streak: 2, best: 2 } },
      },
    };
    const replay = { ...ended, replay: true };
    expect(currentRecord(replay).streak).toBe(3);
    const lost = reducer({...replay,head:"れ",board:{...replay.board!,ids:[assets.find(a=>a.conceptKey==="lemon")!.id]}}, { type:"SUBMIT",actor:"player",assetId:assets.find(a=>a.conceptKey==="lemon")!.id,moveId:"terminal-record" }, assets);
    expect(currentRecord(lost).played).toBe(1);
    expect(currentRecord(lost).streak).toBe(0);
    expect(lost.stats.byMode[recordKey(s)].streak).toBe(2);
    expect(lost.stats.played).toBe(5);
    for (const other of [
      { ...s, hintUsed: 1 },
      { ...s, answerReferenced: true },
      { ...s, settings: { ...s.settings, seconds: 60 } },
      { ...s, settings: { ...s.settings, mode: "standard" as const } },
    ])
      expect(recordKey(other)).not.toBe(recordKey(s));
  });
});
