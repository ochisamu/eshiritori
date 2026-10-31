import { describe, it, expect } from "vitest";
import { activeAssets as assets } from "../../src/game/content";
import {
  generateBoard,
  boardPosition,
  verifyBoard,
} from "../../src/game/boardGenerator";
import {
  initialState,
  reducer,
  position,
  recordKey,
} from "../../src/game/state";
import { legalMoves, advance } from "../../src/game/rules";
import { exportReplay, importReplay } from "../../src/game/replay";
import { validSave } from "../../src/storage/save";
import { boardSlots, REFILL_COUNTS } from "../../src/game/refill";
import { randomOpening } from "../../src/game/opening";
import type { Mode } from "../../src/game/types";

describe("CPU opener and untimed refill", () => {
  it.each(["easy", "normal", "hard"] as const)(
    "verifies bounded random CPU openings on %s",
    (difficulty) => {
      const seen = new Set<string>();
      for (let i = 0; i < 30; i++) {
        const o = {
          seed: `opening-${i}`,
          round: i % 2,
          difficulty,
          discovered: [],
          cpuOpening: true,
        };
        const board = generateBoard(assets, o);
        expect(board.opening).toBeDefined();
        expect(board.proof!.states).toBeLessThanOrEqual(20000);
        expect(verifyBoard(assets, board, o)).not.toBeNull();
        const move = legalMoves(assets, boardPosition(board)).find(
          (m) => m.reading.id === board.opening!.readingId,
        )!;
        expect(move.assetId).toBe(board.opening!.assetId);
        expect(move.reading.kind).toBe("basic");
        expect(
          legalMoves(assets, advance(boardPosition(board), move)).length,
        ).toBeGreaterThan(0);
        seen.add(board.opening!.assetId);
        if (i === 0) expect(generateBoard(assets, o)).toEqual(board);
      }
      expect(seen.size).toBeGreaterThan(10);
    },
  );
  it("uses a finite shallow opening budget, including forced fallbacks", () => {
    const board = generateBoard(assets, {
      seed: "opening-fallback",
      round: 0,
      difficulty: "normal",
      discovered: [],
      cpuOpening: true,
      maxStates: 0,
    });
    expect(board.fallback).toBe(true);
    expect(board.opening).toBeDefined();
    expect(board.proof!.states).toBeLessThanOrEqual(20000);
    expect(
      randomOpening(assets, boardPosition(board), "x", { states: 0, limit: 0 }),
    ).toBeUndefined();
  });
  it.each([
    "standard",
    "refill",
    "refillPractice",
    "practice",
    "accessible",
  ] as Mode[])("starts CPU first and preserves replay in %s", (mode) => {
    let s = initialState();
    s = reducer(
      s,
      { type: "START", seed: "cpu-opener", settings: { ...s.settings, mode } },
      assets,
    );
    const board = generateBoard(assets, {
      seed: s.seed,
      round: s.round,
      difficulty: s.settings.difficulty,
      discovered: [],
      cpuOpening: true,
    });
    s = reducer(s, { type: "BOARD", board }, assets);
    s = reducer(s, { type: "READY" }, assets);
    expect(s.phase).toBe("cpuThinking");
    expect(s.actor).toBe("cpu");
    expect(validSave(s)).toBe(true);
    const imported = importReplay(exportReplay(s), assets);
    expect(imported.board.opening).toEqual(s.board!.opening);
    expect(imported.settings.mode).toBe(mode);
    const replayed = reducer(
      s,
      { type: "IMPORT_REPLAY", session: imported },
      assets,
    );
    expect(replayed.actor).toBe("cpu");
    expect(replayed.board!.reserve).toEqual(s.board!.reserve);
  });
  it.each(["easy", "normal", "hard"] as const)(
    "keeps the clock still and replaces panels on %s untimed refill",
    (difficulty) => {
      let s = initialState();
      s.settings = { ...s.settings, mode: "refillPractice", difficulty };
      s.phase = "loadingRound";
      s = reducer(
        s,
        {
          type: "BOARD",
          board: generateBoard(assets, {
            seed: "no-clock",
            round: 0,
            difficulty,
            discovered: [],
          }),
        },
        assets,
      );
      s = reducer(s, { type: "READY" }, assets);
      const remaining = s.remaining;
      s = reducer(s, { type: "TICK", elapsed: 3600000 }, assets);
      expect(s.phase).toBe("playerTurn");
      expect(s.remaining).toBe(remaining);
      const wrong = reducer(
        { ...s, head: "ん" },
        {
          type: "SUBMIT",
          actor: "player",
          assetId: s.board!.ids[0],
          moveId: "wrong",
        },
        assets,
      );
      expect(wrong.remaining).toBe(remaining);
      expect(wrong.message).not.toContain("−5秒");
      expect(wrong.phase).toBe("roundResult");
      expect(wrong.winner).toBe("player");
      expect(wrong.stats.played).toBe(s.stats.played + 1);

      expect(s.board!.reserve).toHaveLength(REFILL_COUNTS[difficulty]);
      const m = legalMoves(assets, position(s))[0],
        slot = s.board!.ids.indexOf(m.assetId);
      s = reducer(
        s,
        {
          type: "SUBMIT",
          actor: "player",
          assetId: m.assetId,
          readingId: m.reading.id,
          moveId: "one",
        },
        assets,
      );
      expect(boardSlots(s.board, s.moves)[slot]).toBe(s.board!.reserve![0]);
      expect(validSave(s)).toBe(true);
      expect(recordKey(s)).toContain("refillPractice:");
    },
  );
});
