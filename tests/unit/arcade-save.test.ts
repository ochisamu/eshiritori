import { it, expect } from "vitest";
import { validSave, saveGame, loadGame } from "../../src/storage/save";
import { initialState, reducer } from "../../src/game/state";
import { activeAssets as assets } from "../../src/game/content";
it("roundtrips new rescue/race/score fields and preserves old saves without them", () => {
  const s = initialState();
  s.board = {
    ids: assets.slice(0, 24).map((a) => a.id),
    head: "か",
    seed: "save",
    version: "test",
    fallback: false,
  };
  s.settings.opponent = "race";
  s.cpuRemaining = 9200;
  s.score = { points: 350, panels: 1, alternatives: 1, elapsedMs: 900 };
  s.phase = "rescuing";
  s.rescue = { from: "ゔ", to: "か", count: 1, remaining: 900 };
  expect(validSave(s)).toBe(true);
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
  };
  saveGame(storage, s);
  const n = loadGame(
    storage,
    assets.map((a) => a.id),
    assets.flatMap((a) => a.readings.map((r) => r.id)),
  ).state!;
  expect(n.phase).toBe("paused");
  expect(n.resumePhase).toBe("rescuing");
  expect(n.score).toEqual(s.score);
  expect(n.rescue).toEqual(s.rescue);
  delete s.score;
  delete s.rescue;
  delete s.settings.opponent;
  s.phase = "title";
  s.cpuRemaining = 1400;
  expect(validSave(s)).toBe(true);
  const bad = {
    ...s,
    score: { points: NaN, panels: 2, alternatives: 0, elapsedMs: 1 },
  };
  expect(validSave(bad)).toBe(false);
});
it("new sessions retain bounded exposure history and discoveries", () => {
  const s = initialState();
  s.board = {
    ids: assets.slice(0, 24).map((a) => a.id),
    head: "か",
    seed: "old",
    version: "test",
    fallback: false,
  };
  s.discovered = ["found"];
  const n = reducer(
    s,
    { type: "START", seed: "fresh", settings: s.settings },
    assets,
  );
  expect(n.recentBoards).toHaveLength(1);
  expect(n.discovered).toEqual(s.discovered);
});
