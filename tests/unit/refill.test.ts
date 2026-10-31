import { describe, it, expect } from "vitest";
import { activeAssets as assets } from "../../src/game/content";
import { initialState, position, reducer } from "../../src/game/state";
import {
  boardSlots,
  withReserve,
  reserveRemaining,
  REFILL_COUNTS,
} from "../../src/game/refill";
import {
  cpuThinkDuration,
  cpuSearchCard,
} from "../../src/game/cpuPresentation";
import { rescueHead } from "../../src/game/rescue";
import { legalMoves } from "../../src/game/rules";
import {
  validSave,
  loadGame,
  saveGame,
  SAVE_KEY,
} from "../../src/storage/save";
import type { Board, Difficulty, GameState } from "../../src/game/types";
const board: Board = {
  ids: assets.slice(0, 24).map((a) => a.id),
  head: "か",
  seed: "refill-fixture",
  version: "test",
  fallback: false,
};
const reduce = (s: GameState, a: Parameters<typeof reducer>[1]) =>
  reducer(s, a, assets);
function start(difficulty: Difficulty = "normal") {
  let s = initialState();
  s = reduce(s, {
    type: "START",
    seed: "refill-fixture",
    settings: { ...s.settings, mode: "refill", difficulty, tutorialSeen: true },
  });
  s = reduce(s, { type: "BOARD", board });
  return reduce(s, { type: "READY" });
}
describe("finite replacement stack and CPU presentation", () => {
  it("deals deterministic distinct hidden cards by difficulty without mutating the original", () => {
    for (const difficulty of ["easy", "normal", "hard"] as const) {
      const a = withReserve(board, difficulty, assets);
      expect(a).toEqual(withReserve(board, difficulty, assets));
      expect(a.reserve).toHaveLength(REFILL_COUNTS[difficulty]);
      expect(new Set([...a.ids, ...a.reserve!]).size).toBe(
        24 + REFILL_COUNTS[difficulty],
      );
      expect(withReserve(a, difficulty, assets)).toBe(a);
      if (difficulty === "easy")
        expect(
          a.reserve!.every(
            (id) => assets.find((a) => a.id === id)!.difficulty !== "advanced",
          ),
        ).toBe(true);
    }
    expect(board.reserve).toBeUndefined();
    expect(boardSlots(null, [])).toEqual([]);
  });
  it("replaces precisely the consumed slot, leaves 24 pictures and rejects old cards and duplicate commits", () => {
    const s = start(),
      m = legalMoves(assets, position(s))[0];
    const action = {
      type: "SUBMIT" as const,
      actor: s.actor,
      assetId: m.assetId,
      readingId: m.reading.id,
      moveId: "a",
    };
    const n = reduce(s, action),
      slots = boardSlots(n.board, n.moves);
    expect(n.phase).toBe("resolvingMove");
    expect(slots).toHaveLength(24);
    expect(slots[s.board!.ids.indexOf(m.assetId)]).toBe(s.board!.reserve![0]);
    expect(slots).not.toContain(m.assetId);
    expect(reserveRemaining(n)).toBe(23);
    expect(reduce(n, action)).toBe(n);
    expect(
      legalMoves(assets, position(n)).every(
        (m) => m.assetId !== action.assetId,
      ),
    ).toBe(true);
  });
  it("persists replacements and restarts the identical hidden stack on replay", () => {
    let s = start();
    const m = legalMoves(assets, position(s))[0];
    s = reduce(s, {
      type: "SUBMIT",
      actor: s.actor,
      assetId: m.assetId,
      moveId: "a",
    });
    expect(validSave(s)).toBe(true);
    const map = new Map<string, string>();
    const storage = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => {
        map.set(k, v);
      },
    };
    expect(saveGame(storage, s)).toBe(null);
    const loaded = loadGame(
      storage,
      assets.map((a) => a.id),
      assets.flatMap((a) => a.readings.map((r) => r.id)),
    ).state!;
    expect(boardSlots(loaded.board, loaded.moves)).toEqual(
      boardSlots(s.board, s.moves),
    );
    const result = reduce(
      { ...s, head:rescueHead(assets,position(s),"end")!, phase: "playerTurn", actor: "player", settings: {...s.settings,mode:"refill"} },
      { type: "TICK", elapsed: 999999 },
    );
    const replay = reduce(result, { type: "REPLAY" });
    expect(replay.moves).toEqual([]);
    expect(replay.board?.reserve).toEqual(s.board?.reserve);
    const broken = JSON.parse(map.get(SAVE_KEY)!);
    broken.board.reserve[0] = broken.board.ids[0];
    expect(validSave(broken)).toBe(false);
  });
  it("uses the timer and penalty in replacement mode; training remains untimed", () => {
    const s = start();
    expect(reduce(s, { type: "TICK", elapsed: 250 }).remaining).toBe(
      s.remaining - 250,
    );
    expect(
      reduce({ ...s, remaining: 1 }, { type: "TICK", elapsed: 2 }).winner,
    ).toBe("cpu");
    expect(
      reduce(
        { ...s, remaining: 4000, head: "か" },
        {
          type: "SUBMIT",
          actor: "player",
          assetId: assets[0].id,
          moveId: "bad",
        },
      ).reason,
    ).toBe("時間切れ");
  });
  it("has a bounded variable thinking interval, scans live cards, retraces, then commits visibly", () => {
    for (const difficulty of ["easy", "normal", "hard"] as const) {
      const s = start(difficulty),
        duration = cpuThinkDuration(s);
      expect(duration).toBeGreaterThanOrEqual(2200);
      expect(duration).toBeLessThanOrEqual(3400);
      expect(cpuThinkDuration(s)).toBe(duration);
      const visited = [0, 300, 600, 1100, 1600, 2100].map((elapsed) =>
        cpuSearchCard(
          { ...s, cpuRemaining: duration - elapsed },
          s.board!.ids[0],
        ),
      );
      expect(new Set(visited).size).toBeGreaterThan(2);
      expect(
        visited.every((id) => boardSlots(s.board, s.moves).includes(id!)),
      ).toBe(true);
      expect(cpuSearchCard({ ...s, cpuRemaining: 100 }, "target")).toBe(
        "target",
      );
    }
    expect(cpuSearchCard({ ...start(), board: null })).toBeUndefined();
  });
  it("finishes 300 deterministic replacement games without reusing a picture or word", () => {
    let moves = 0,
      refills = 0;
    for (let game = 0; game < 300; game++) {
      let s = start((["easy", "normal", "hard"] as const)[game % 3]);
      s = {
        ...s,
        board: withReserve(
          { ...board, seed: "refill-sim-" + game },
          s.settings.difficulty,
          assets,
        ),
      };
      while (s.phase !== "roundResult") {
        if (s.phase === "resolvingMove") {
          s = reduce(s, { type: "RESOLVED" });
          continue;
        }
        if (s.phase === "rescuing") { s = reduce(s, {type:"TICK",elapsed:2000}); continue; }
        const legal = legalMoves(assets, position(s));
        if (!legal.length && s.phase === "cpuThinking") {
          s = reduce(s, { type: "TICK", elapsed: s.cpuRemaining });
          continue;
        }
        expect(legal.length).toBeGreaterThan(0);
        const m = legal[(game + s.moves.length) % legal.length];
        const before = s.moves.length;
        s = reduce(s, {
          type: "SUBMIT",
          actor: s.actor,
          assetId: m.assetId,
          readingId: m.reading.id,
          moveId: "sim-" + before,
        });
        expect(s.moves.length).toBe(before + 1);
        expect(s.moves.length).toBeLessThanOrEqual(72);
        moves++;
        if (before < (s.board!.reserve?.length ?? 0)) refills++;
        expect(new Set(s.moves.map((m) => m.assetId)).size).toBe(
          s.moves.length,
        );
        expect(new Set(s.moves.map((m) => m.word)).size).toBe(s.moves.length);
        expect(validSave(s)).toBe(true);
      }
      expect(s.stats.played).toBe(1);
    }
    expect(moves).toBeGreaterThan(500);
    expect(refills).toBeGreaterThan(400);
  });
  it("keeps replacing through all 48 reserve cards, then consumes the remaining panels and finishes on move 72", () => {
    const letters = [
      ..."あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ",
    ];
    const deck = Array.from({ length: 72 }, (_, i) => {
      const word =
        "か" +
        letters[i % letters.length] +
        letters[Math.floor(i / letters.length)] +
        "か";
      return {
        ...assets[0],
        id: "card-test-" + i,
        readings: [
          {
            ...assets[0].readings[0],
            id: "test-" + i,
            kana: word,
            display: word,
          },
        ],
      };
    });
    const play = (s: GameState, a: Parameters<typeof reducer>[1]) =>
      reducer(s, a, deck);
    let s: GameState = {
      ...initialState(),
      settings: {
        ...initialState().settings,
        mode: "refill",
        difficulty: "hard",
      },
      phase: "loadingRound",
    };
    s = play(s, {
      type: "BOARD",
      board: {
        ...board,
        ids: deck.slice(0, 24).map((a) => a.id),
        reserve: deck.slice(24).map((a) => a.id),
      },
    });
    s = play(s, { type: "READY" });
    for (let i = 0; i < 72; i++) {
      const m = legalMoves(deck, position(s))[0];
      expect(m).toBeDefined();
      s = play(s, {
        type: "SUBMIT",
        actor: s.actor,
        assetId: m.assetId,
        moveId: "all-" + i,
      });
      if (i < 71) s = play(s, { type: "RESOLVED" });
    }
    expect(s.moves).toHaveLength(72);
    expect(s.phase).toBe("roundResult");
    expect(s.winner).toBe("player");
    expect(reserveRemaining(s)).toBe(0);
  });
});
