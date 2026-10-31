import { describe, it, expect } from "vitest";
import {
  activeAssets as assets,
  validateContent,
} from "../../src/game/content";
import {
  boardPosition,
  generateBoard,
  verifyBoard,
} from "../../src/game/boardGenerator";
import { chooseCpu } from "../../src/game/cpu";
import { advance, legalMoves, validateMove } from "../../src/game/rules";
import { rng, seedHash, shuffle } from "../../src/game/rng";
import type { Board, Difficulty } from "../../src/game/types";
describe("seeded boards and fair CPU", () => {
  it("recovers the actual acceptance-3901 easy/CPU-first regression with a verified fallback", () => {
    const options = {
      seed: "acceptance-3901",
      round: 1,
      difficulty: "easy" as const,
      discovered: [],
    };
    const direct = generateBoard(assets, options);
    expect(verifyBoard(assets, direct, options)).not.toBeNull();
    // More approved readings can make the old seed succeed without fallback.
    // Force the same fallback branch to retain the original seed/parity regression.
    const board = generateBoard(assets, { ...options, maxStates: 0 });
    expect(board.fallback).toBe(true);
    expect(board.fallbackFor).toEqual({ difficulty: "easy", parity: 1 });
    expect(board.seed).toMatch(/^safety-easy-1-/);
    expect(board.proof!.states).toBeLessThanOrEqual(20000);
    expect(verifyBoard(assets, board, options)).not.toBeNull();
    expect(generateBoard(assets, { ...options, maxStates: 0 })).toEqual(board);
  }, 30000);
  it("deterministic PRNG and independent shuffle without input mutation", () => {
    expect(seedHash("abc")).toBe(seedHash("abc"));
    expect(seedHash("abc")).not.toBe(seedHash("def"));
    const a = rng("abc"),
      b = rng("abc");
    expect(Array.from({ length: 100 }, () => a())).toEqual(
      Array.from({ length: 100 }, () => b()),
    );
    const values = [1, 2, 3, 4];
    expect(shuffle(values, rng("x")).sort()).toEqual(values);
    expect(values).toEqual([1, 2, 3, 4]);
  });
  it.each(["easy", "normal", "hard"] as Difficulty[])(
    "generates verified 24-card %s boards, uses only executable moves and replays identically",
    (difficulty) => {
      for (let i = 0; i < 20; i++) {
        const options = {
          seed: `property-${i}`,
          round: i % 2,
          difficulty,
          discovered: [],
        };
        const board = generateBoard(assets, options);
        expect(board.ids).toHaveLength(24);
        expect(new Set(board.ids).size).toBe(24);
        expect(board.proof!.path.length).toBeGreaterThanOrEqual(18);
        let frontPosition = boardPosition(board);
        for (const id of board.proof!.path) {
          const m = legalMoves(assets, frontPosition).find(
            (m) => m.assetId === id && m.reading.kind === "basic",
          );
          expect(m).toBeDefined();
          frontPosition = advance(frontPosition, m!);
        }
        expect(board.proof!.branches).toBeGreaterThanOrEqual(2);
        expect(board.proof!.quality?.samples).toBe(8);
        expect(board.proof!.quality!.meanTurns).toBeGreaterThanOrEqual(9);
        expect(board.proof!.quality!.shortGames).toBeLessThanOrEqual(1);
        expect(board.proof!.playerWin).toBeDefined();
        expect(verifyBoard(assets, board, options)).not.toBeNull();
        expect(generateBoard(assets, options)).toEqual(board);
        let p = boardPosition(board);
        for (let turn = 0; turn < 24; turn++) {
          const moves = legalMoves(assets, p);
          const cpu = chooseCpu(
            assets,
            p,
            difficulty,
            `${board.seed}:cpu:${turn}`,
          );
          expect(cpu.states).toBeLessThanOrEqual(5000);
          expect(cpu).toEqual(
            chooseCpu(assets, p, difficulty, `${board.seed}:cpu:${turn}`),
          );
          if (!moves.length) {
            expect(cpu.move).toBeNull();
            break;
          }
          expect(cpu.move).not.toBeNull();
          const m = cpu.move!;
          expect(
            moves.some(
              (x) => x.assetId === m.assetId && x.reading.id === m.reading.id,
            ),
          ).toBe(true);
          expect(
            validateMove(
              assets.find((a) => a.id === m.assetId),
              p,
              { readingId: m.reading.id },
            ).ok,
          ).toBe(true);
          p = advance(p, m);
        }
      }
    },
    30000,
  );
  it("validates fallback against the actual state and CPU seed", () => {
    const b = generateBoard(assets, {
      seed: "force-fallback",
      round: 0,
      difficulty: "hard",
      discovered: [],
      maxStates: 0,
    });
    expect(b.fallback).toBe(true);
    expect(b.proof?.playerWin).toBeDefined();
    expect(
      verifyBoard(assets, b, { round: 0, difficulty: "hard", discovered: [] }),
    ).not.toBeNull();
  });
  it("revalidates each difficulty/starter fallback after discoveries and avoids recent safety boards", () => {
    const discoveries = [
      [],
      assets.slice(0, 150).flatMap((a) => a.readings.map((r) => r.id)),
      assets.flatMap((a) => a.readings.map((r) => r.id)),
    ];
    for (const difficulty of ["easy", "normal", "hard"] as Difficulty[])
      for (const round of [0, 1])
        for (const discovered of discoveries) {
          const options = {
            seed: `fallback-state-${difficulty}-${round}-${discovered.length}`,
            round,
            difficulty,
            discovered,
            maxStates: 0,
          };
          const first = generateBoard(assets, options);
          expect(verifyBoard(assets, first, options)).not.toBeNull();
          expect(first.proof!.states).toBeLessThanOrEqual(20000);
          const next = generateBoard(assets, { ...options, recent: [first] });
          expect(next.ids.join()).not.toBe(first.ids.join());
          expect(verifyBoard(assets, next, options)).not.toBeNull();
        }
  }, 30000);
  it("rejects missing, duplicate, terminal-only and empty boards", () => {
    expect(() =>
      generateBoard([], {
        seed: "x",
        round: 0,
        difficulty: "easy",
        discovered: [],
      }),
    ).toThrow();
    const board: Board = {
      ids: Array(24).fill(assets[0].id),
      head: "り",
      seed: "x",
      version: "x",
      fallback: false,
    };
    expect(
      verifyBoard(assets, board, {
        round: 0,
        difficulty: "easy",
        discovered: [],
      }),
    ).toBeNull();
    expect(
      verifyBoard(
        assets,
        { ...board, ids: assets.slice(0, 24).map((a) => a.id), head: "を" },
        { round: 0, difficulty: "easy", discovered: [] },
      ),
    ).toBeNull();
    expect(() =>
      generateBoard(assets.slice(0, 24), {
        seed: "impossible",
        round: 0,
        difficulty: "hard",
        discovered: [],
        maxStates: 0,
      }),
    ).toThrow();
  });
  it("bounded history changes later boards while preserving proofs", () => {
    const recent: Board[] = [];
    for (let i = 0; i < 8; i++) {
      const b = generateBoard(assets, {
        seed: "history",
        round: i,
        difficulty: "normal",
        discovered: [],
        recent,
      });
      expect(
        recent.some((x) => x.head === b.head && x.ids.join() === b.ids.join()),
      ).toBe(false);
      recent.push(b);
    }
  });
  it("content schema rejects duplicates and unjustified taxonomy", () => {
    for (const element of [
      { x: -0.1, y: 0, w: 0.2, h: 0.2 },
      { x: 0.9, y: 0.9, w: 0.2, h: 0.2 },
      { x: 0, y: 0, w: 0, h: 0.3 },
    ])
      expect(() =>
        validateContent([
          { ...assets[0], readings: [{ ...assets[0].readings[0], element }] },
        ]),
      ).toThrow();
    expect(() => validateContent([...assets, assets[0]])).toThrow();
    expect(() =>
      validateContent([
        { ...assets[0], readings: [{ ...assets[0].readings[0], kana: "abc" }] },
      ]),
    ).toThrow();
    expect(() =>
      validateContent([
        {
          ...assets[0],
          readings: [...assets[0].readings, assets[0].readings[0]],
        },
      ]),
    ).toThrow();
    expect(() =>
      validateContent([
        {
          ...assets[0],
          readings: [
            { ...assets[0].readings[0], kind: "category", kana: "もの" },
          ],
        },
      ]),
    ).toThrow();
  });
});
