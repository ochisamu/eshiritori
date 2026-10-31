import { describe, it, expect } from "vitest";
import { activeAssets as assets } from "../../src/game/content";
import { initialState, reducer } from "../../src/game/state";
import { discoveryProgress } from "../../src/game/discovery";
import {
  cpuSearchCard,
  cpuSelectionStage,
  cpuThinkDuration,
} from "../../src/game/cpuPresentation";
import { headKana, tailKana } from "../../src/game/normalization";
import { validSave, saveGame, loadGame } from "../../src/storage/save";
import type { GameState } from "../../src/game/types";
const asset = assets
  .slice(0, 12)
  .find(
    (a) =>
      a.readings.length > 2 &&
      a.readings.some((r) => r.kind !== "basic" && tailKana(r.kana) !== "ん"),
  )!;
const reading = asset.readings.find(
  (r) => r.kind !== "basic" && tailKana(r.kana) !== "ん",
)!;
function state(
  known: string[] = [],
  actor: "player" | "cpu" = "player",
): GameState {
  const s = initialState();
  return {
    ...s,
    phase: actor === "player" ? "playerTurn" : "cpuThinking",
    actor,
    head: headKana(reading.kana),
    discovered: known,
    settings: { ...s.settings, mode: "practice" },
    board: {
      ids: assets.slice(0, 24).map((a) => a.id),
      head: headKana(reading.kana),
      seed: "discovery-fixture",
      version: "test",
      fallback: false,
    },
  };
}
const answer = (s: GameState) =>
  reducer(
    s,
    {
      type: "SUBMIT",
      actor: s.actor,
      assetId: asset.id,
      input: reading.kana,
      moveId: "one",
    },
    assets,
  );
describe("first discovery and collection rewards", () => {
  it("awards an unseen alternative once, and not again across sessions or repeated commits", () => {
    const s = state(),
      n = answer(s);
    expect(n.lastMove!.discovery).toBe("new");
    expect(n.discovered).toContain(reading.id);
    expect(answer(n)).toBe(n);
    expect(answer(state(n.discovered)).lastMove!.discovery).toBeUndefined();
    expect(answer(state([], "cpu")).lastMove!.discovery).toBeUndefined();
  });
  it("marks a complete picture only from actual discovered IDs", () => {
    const known = asset.readings
      .filter((r) => r.id !== reading.id)
      .map((r) => r.id);
    expect(discoveryProgress(asset, new Set(known)).complete).toBe(false);
    const n = answer(state(known));
    expect(n.lastMove!.discovery).toBe("complete");
    expect(discoveryProgress(asset, new Set(n.discovered))).toEqual({
      found: asset.readings.length,
      total: asset.readings.length,
      complete: true,
    });
    expect(discoveryProgress(asset, new Set(["not-a-reading"])).found).toBe(0);
  });
  it("restores the earned reward metadata and remains compatible with earlier saves", () => {
    const s = answer(
      state(asset.readings.filter((r) => r.id !== reading.id).map((r) => r.id)),
    );
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
    expect(saveGame(storage, s)).toBeNull();
    const loaded = loadGame(
      storage,
      assets.map((a) => a.id),
      assets.flatMap((a) => a.readings.map((r) => r.id)),
    ).state!;
    expect(loaded.lastMove!.discovery).toBe("complete");
    expect(discoveryProgress(asset, new Set(loaded.discovered)).complete).toBe(
      true,
    );
    const old = structuredClone(s);
    delete old.lastMove!.discovery;
    old.moves.forEach((m) => delete m.discovery);
    expect(validSave(old)).toBe(true);
    expect(
      validSave({ ...s, lastMove: { ...s.lastMove, discovery: "invalid" } }),
    ).toBe(false);
  });
  it("stages the opening scan, comparison and lock without changing its duration", () => {
    const s = state();
    s.board!.opening = {
      policy: "cpu-random-v1",
      assetId: asset.id,
      readingId: reading.id,
    };
    const duration = cpuThinkDuration(s);
    expect(cpuSelectionStage({ cpuRemaining: duration })).toBe("scan");
    expect(cpuSelectionStage({ cpuRemaining: 800 })).toBe("compare");
    expect(cpuSelectionStage({ cpuRemaining: 300 })).toBe("locked");
    const focus = [950, 600, 300].map((cpuRemaining) =>
      cpuSearchCard({ ...s, cpuRemaining }, asset.id),
    );
    expect(focus[0]).toBe(asset.id);
    expect(focus[1]).not.toBe(asset.id);
    expect(focus[2]).toBe(asset.id);
    expect(cpuThinkDuration(s)).toBe(duration);
  });
});
