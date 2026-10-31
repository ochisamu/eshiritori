import { describe, it, expect } from "vitest";
import {
  loadGame,
  saveGame,
  SAVE_KEY,
  validSave,
  type StorageLike,
} from "../../src/storage/save";
import { assets } from "../../src/game/content";
import { initialState } from "../../src/game/state";
function memory(): StorageLike {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
}
const ids = assets.map((a) => a.id),
  rids = assets.flatMap((a) => a.readings.map((r) => r.id));
describe("versioned recoverable saves", () => {
  it("upgrades the terminal-word rule without clearing an existing board, discovered readings or records", () => {
    const m = memory(),
      s = initialState();
    delete s.rulesVersion;
    s.stats.played = 7;
    s.discovered = [rids[0]];
    s.phase = "playerTurn";
    s.head = "か";
    s.board = {
      ids: ids.slice(0, 24),
      head: "か",
      seed: "legacy-rules",
      version: "fixture",
      fallback: false,
    };
    const raw = JSON.stringify(s);
    m.setItem(SAVE_KEY, raw);
    const loaded = loadGame(m, ids, rids);
    expect(loaded.state?.board?.ids).toEqual(s.board.ids);
    expect(loaded.state?.stats.played).toBe(7);
    expect(loaded.state?.discovered).toEqual(s.discovered);
    expect(loaded.state?.rulesVersion).toBe(initialState().rulesVersion);
    expect(loaded.warning).toContain("連勝と早押しの得点");
    expect(m.getItem(SAVE_KEY)).toBe(raw);
  });
  it("round trips, pauses restoration and does not duplicate move ids", () => {
    const m = memory();
    const s = initialState();
    s.phase = "cpuThinking";
    s.board = {
      ids: ids.slice(0, 24),
      head: "か",
      seed: "restore",
      version: "fixture",
      fallback: false,
    };
    s.head = "か";
    s.actor = "cpu";
    s.remaining = 23456;
    expect(saveGame(m, s)).toBeNull();
    const r = loadGame(m, ids, rids);
    expect(r.state?.phase).toBe("paused");
    expect(r.state?.resumePhase).toBe("cpuThinking");
    expect(r.state?.remaining).toBe(23456);
    expect(r.warning).toBeNull();
  });
  it("restores healthy backup after corrupt/interrupted current write", () => {
    const m = memory();
    const s = initialState();
    saveGame(m, s);
    saveGame(m, { ...s, round: 1 });
    m.setItem(SAVE_KEY, "{");
    const r = loadGame(m, ids, rids);
    expect(r.state?.round).toBe(0);
    expect(r.warning).toContain("復旧");
    expect(saveGame(m, s)).toBeNull();
  });
  it("keeps progress when dictionary changes", () => {
    const m = memory();
    const s = initialState();
    s.contentVersion = "old";
    s.stats.played = 42;
    s.discovered = ["removed"];
    saveGame(m, s);
    const r = loadGame(m, ids, rids);
    expect(r.state?.stats.played).toBe(42);
    expect(r.state?.discovered).toEqual([]);
    expect(r.warning).toContain("更新");
  });
  it("reports storage failure and preserves broken originals", () => {
    const m: StorageLike = {
      getItem: () => {
        throw Error("unavailable");
      },
      setItem: () => {
        throw Error("denied");
      },
    };
    expect(saveGame(m, initialState())).toContain("保存できません");
    expect(loadGame(m, ids, rids).warning).not.toBeNull();
    const broken = memory();
    broken.setItem(SAVE_KEY, "broken");
    expect(loadGame(broken, ids, rids).state).toBeNull();
    expect(broken.getItem(SAVE_KEY)).toBe("broken");
    expect(saveGame(broken, initialState())).toBeNull();
    expect(broken.getItem(`${SAVE_KEY}.damaged`)).toBe("broken");
    expect(loadGame(broken, ids, rids).state?.schema).toBe(1);
    broken.setItem(SAVE_KEY, "different broken snapshot");
    expect(saveGame(broken, initialState())).toBeNull();
    expect(broken.getItem(`${SAVE_KEY}.damaged`)).toBe("broken");
    expect(broken.getItem(`${SAVE_KEY}.damaged.1`)).toBe(
      "different broken snapshot",
    );
    expect(loadGame(memory(), ids, rids)).toEqual({
      state: null,
      warning: null,
    });
  });
  it("rejects invalid and oversized snapshots", () => {
    for (const bad of [
      null,
      {},
      [],
      { ...initialState(), schema: 0 },
      { ...initialState(), remaining: -1 },
      { ...initialState(), round: -1 },
      { ...initialState(), round: Number.MAX_SAFE_INTEGER + 1 },
      { ...initialState(), phase: "typo" },
      {
        ...initialState(),
        stats: { played: 1, wins: 2, streak: 0, best: 0, byMode: {} },
      },
      {
        ...initialState(),
        settings: { ...initialState().settings, muted: "yes" },
      },
      { ...initialState(), moves: [null] },
      { ...initialState(), discovered: [17] },
      { ...initialState(), phase: "paused", resumePhase: "cpuThinking" },
      { ...initialState(), phase: "cpuThinking" },
      {
        ...initialState(),
        stats: { ...initialState().stats, byMode: { bad: null } },
      },
    ])
      expect(validSave(bad)).toBe(false);
    const m = memory();
    m.setItem(SAVE_KEY, JSON.stringify({ ...initialState(), schema: 0 }));
    expect(loadGame(m, ids, rids).state).toBeNull();
  });
  it("leaves the original untouched if damaged-data archive is full or cannot be written", () => {
    const m = memory();
    m.setItem(SAVE_KEY, "original damaged snapshot");
    for (let i = 0; i < 20; i++)
      m.setItem(`${SAVE_KEY}.damaged${i ? "." + i : ""}`, "older damage " + i);
    expect(saveGame(m, initialState())).toContain("保護");
    expect(m.getItem(SAVE_KEY)).toBe("original damaged snapshot");
    const quota: StorageLike = {
      getItem: (key) => (key === SAVE_KEY ? "original" : null),
      setItem: () => {
        throw Error("quota");
      },
    };
    expect(saveGame(quota, initialState())).toContain("保存できません");
    expect(quota.getItem(SAVE_KEY)).toBe("original");
  });
  it("migrates ordinal reading IDs without losing discoveries or committed moves", () => {
    const m = memory();
    const s = initialState();
    s.discovered = ["card-0001-r0"];
    const apple = assets[0].readings.find((r) => r.kana === "りんご")!;
    saveGame(m, s);
    const r = loadGame(m, ids, rids);
    expect(r.state!.discovered).toEqual([apple.id]);
  });
  it("preserves results and discoveries from the older 16-card format", () => {
    const m = memory();
    const s = initialState();
    s.stats.played = 7;
    s.discovered = [rids[0]];
    s.board = {
      ids: ids.slice(0, 16),
      head: "か",
      seed: "old-4x4",
      version: "path-first-v1",
      fallback: false,
    };
    saveGame(m, s);
    const r = loadGame(m, ids, rids);
    expect(r.state!.board).toBeNull();
    expect(r.state!.phase).toBe("title");
    expect(r.state!.stats.played).toBe(7);
    expect(r.state!.discovered).toEqual([rids[0]]);
    expect(r.warning).toContain("再配布");
  });
});
