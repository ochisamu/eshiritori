import { describe, it, expect } from "vitest";
import { activeAssets as assets } from "../../src/game/content";
import { initialState, reducer, recordKey } from "../../src/game/state";
import {
  emptyScore,
  totalScore,
  scoreKey,
  rankRound,
} from "../../src/game/scoring";
import { saveGame, loadGame, validSave } from "../../src/storage/save";
import type { Asset, GameState, Mode } from "../../src/game/types";
const reduce = (s: GameState, a: Parameters<typeof reducer>[1]) =>
  reducer(s, a, assets);
function blocked(
  opponent: "turns" | "solo" | "race",
  mode: Mode,
  actor: "player" | "cpu",
): GameState {
  const s = initialState();
  s.settings = { ...s.settings, opponent, mode };
  s.actor = actor;
  s.phase = actor === "cpu" ? "cpuThinking" : "playerTurn";
  s.board = {
    ids: assets.slice(0, 24).map((a) => a.id),
    head: "ゔ",
    seed: "blocked",
    version: "test",
    fallback: false,
  };
  if (mode === "refill" || mode === "refillPractice")
    s.board.reserve = assets.slice(24, 48).map((a) => a.id);
  s.head = "ゔ";
  s.cpuRemaining = 2000;
  s.remaining = 45000;
  s.score = { points: 200, panels: 2, alternatives: 0, elapsedMs: 600 };
  s.carriedScore = {
    points: 8000,
    panels: 80,
    alternatives: 0,
    elapsedMs: 20000,
  };
  s.stats = {
    played: 7,
    wins: 4,
    streak: 2,
    best: 3,
    byMode: { [recordKey(s)]: { played: 7, wins: 4, streak: 2, best: 3 } },
  };
  return s;
}
const deck: Asset[] = assets.slice(0, 24).map((a, i) => ({
  ...a,
  readings: [
    {
      ...a.readings[0],
      kana: i === 0 ? "あか" : i === 1 ? "かき" : "ぬん",
      display: i === 0 ? "あか" : i === 1 ? "かき" : "ぬん",
      kind: "basic",
      difficulty: "common",
    },
  ],
}));
function board(s: GameState) {
  return {
    ids: deck.map((a) => a.id),
    head: "あ",
    seed: `chain:${s.round}`,
    version: "test",
    fallback: false,
  };
}
const play = (s: GameState, a: Parameters<typeof reducer>[1]) =>
  reducer(s, a, deck);
function open(s = initialState(), mode: Mode = "practice") {
  s = {
    ...s,
    settings: { ...s.settings, opponent: "solo", mode },
    phase: "loadingRound",
  };
  return play(play(s, { type: "BOARD", board: board(s) }), { type: "READY" });
}
function takeTwo(s: GameState) {
  for (let i = 0; i < 2; i++) {
    s = play(s, {
      type: "SUBMIT",
      actor: "player",
      assetId: deck[i].id,
      moveId: `${s.round}-${i}`,
    });
    s = play(s, { type: "RESOLVED" });
  }
  return s;
}
describe("no-move round boundaries and continuous scoring", () => {
  it("ends for every opponent and timing/refill setting without changing the head and credits a board win", () => {
    for (const opponent of ["turns", "solo", "race"] as const)
      for (const mode of [
        "standard",
        "practice",
        "refill",
        "refillPractice",
        "accessible",
      ] as const)
        for (const actor of ["player", "cpu"] as const) {
          const s = blocked(opponent, mode, actor);
          const n = reduce(s, {
            type: "TICK",
            elapsed: actor === "cpu" ? s.cpuRemaining : 999999,
          });
          expect(n.phase).toBe("roundResult");
          expect(n.winner).toBe("player");
          expect(n.head).toBe(s.head);
          expect(n.rescue).toBeUndefined();
          expect(n.stats.played).toBe(8);
          expect(n.stats.wins).toBe(5);
          expect(n.stats.streak).toBe(3);
          expect(totalScore(n)).toEqual(totalScore(s));
          expect(n.stats.rankings).toHaveLength(
            mode === "standard" || mode === "refill" ? 1 : 0,
          );
          if (n.stats.rankings?.length)
            expect(n.stats.rankings[0].points).toBe(8200);
          expect(reduce(n, { type: "TICK", elapsed: 99999 })).toBe(n);
          expect(validSave(n)).toBe(true);
        }
  });
  it("lets the CPU finish its search before ending, with no changed-letter intermission", () => {
    const s = blocked("turns", "standard", "cpu"),
      looking = reduce(s, { type: "TICK", elapsed: 900 });
    expect(looking.phase).toBe("cpuThinking");
    expect(looking.stats.played).toBe(s.stats.played);
    const end = reduce(looking, { type: "TICK", elapsed: 1100 });
    expect(end.phase).toBe("roundResult");
    expect(end.head).toBe("ゔ");
  });
  it("carries points, panels, alternatives and time across 100 rounds while keeping only one board of moves", () => {
    let s = open();
    for (let i = 0; i < 100; i++) {
      s = takeTwo(s);
      expect(s.phase).toBe("roundResult");
      expect(s.winner).toBe("player");
      expect(totalScore(s).points).toBe((i + 1) * 200);
      expect(totalScore(s).panels).toBe((i + 1) * 2);
      expect(s.moves).toHaveLength(2);
      expect(s.stats.rankings).toHaveLength(0);
      expect(validSave(s)).toBe(true);
      s = play(s, { type: "NEXT" });
      expect(totalScore(s).points).toBe((i + 1) * 200);
      s = open(s);
      expect(s.moves).toHaveLength(0);
      expect(totalScore(s).panels).toBe((i + 1) * 2);
    }
  });
  it("keeps a full-board clear and a CPU loss on the same score run", () => {
    const s = {
      ...open(),
      carriedScore: { points: 500, panels: 2, alternatives: 2, elapsedMs: 333 },
    };
    const last = {
      ...s,
      board: { ...s.board!, ids: [deck[0].id] },
      head: "あ",
    };
    let n = play(last, {
      type: "SUBMIT",
      actor: "player",
      assetId: deck[0].id,
      moveId: "last",
    });
    expect(n.winner).toBe("player");
    expect(totalScore(n).points).toBe(600);
    n = play(n, { type: "NEXT" });
    n = open(n);
    expect(totalScore(n)).toEqual({
      points: 600,
      panels: 3,
      alternatives: 2,
      elapsedMs: 333,
    });
    const cpuLoss = play(
      { ...n, actor: "cpu", phase: "cpuThinking", head: "ぬ" },
      {
        type: "SUBMIT",
        actor: "cpu",
        assetId: deck[2].id,
        moveId: "cpu-terminal",
      },
    );
    expect(cpuLoss.winner).toBe("player");
    expect(totalScore(play(cpuLoss, { type: "NEXT" })).points).toBe(600);
  });
  it("keeps the final total on loss but starts a new score run on the next board", () => {
    let s = takeTwo(open());
    s = open(play(s, { type: "NEXT" }));
    const loss = play(
      { ...s, head: "ぬ" },
      {
        type: "SUBMIT",
        actor: "player",
        assetId: deck[2].id,
        moveId: "terminal",
      },
    );
    expect(loss.winner).toBe("cpu");
    expect(totalScore(loss).points).toBe(200);
    expect(loss.stats.rankings).toEqual([]);
    const next = play(loss, { type: "NEXT" });
    expect(totalScore(next)).toEqual(emptyScore());
    expect(next.scoreStartRound).toBe(loss.round + 1);
    const timed = play(
      { ...s, settings: { ...s.settings, mode: "standard" }, remaining: 1 },
      { type: "TICK", elapsed: 2 },
    );
    expect(timed.winner).toBe("cpu");
    expect(totalScore(timed).points).toBe(200);
    expect(totalScore(play(timed, { type: "NEXT" })).points).toBe(0);
  });
  it("replay and a new session cannot append the same board to a previous carry", () => {
    let s = takeTwo(open());
    s = open(play(s, { type: "NEXT" }));
    s = takeTwo(s);
    const replay = play(s, { type: "REPLAY" });
    expect(totalScore(replay)).toEqual(emptyScore());
    expect(replay.replay).toBe(true);
    const fresh = play(s, { type: "START", seed: "new", settings: s.settings });
    expect(totalScore(fresh)).toEqual(emptyScore());
  });
  it("retains totals, assistance and ranking identity when a failed board is replaced", () => {
    let s = open(play(takeTwo(open()), { type: "NEXT" }));
    s = {
      ...s,
      score: { points: 100, panels: 1, alternatives: 0, elapsedMs: 200 },
      hintUsed: 1,
    };
    const failed = play(s, { type: "LOAD_ERROR", message: "image failure" });
    const retry = play(failed, { type: "RETRY_LOAD" });
    expect(retry.phase).toBe("loadingRound");
    expect(retry.board).toBeNull();
    expect(retry.round).toBe(s.round + 1);
    expect(retry.seed).toBe(s.seed);
    expect(retry.scoreStartRound).toBe(s.scoreStartRound);
    expect(retry.stats).toEqual(s.stats);
    expect(totalScore(retry)).toEqual(totalScore(s));
    expect(scoreKey(retry)).toBe(scoreKey(s));
    expect(totalScore(open(retry))).toEqual(totalScore(s));
    expect(play(s, { type: "RETRY_LOAD" })).toBe(s);
  });
  it("preserves the accumulated help category after per-board hints reset", () => {
    let s = takeTwo({ ...open(), hintUsed: 1 });
    const assisted = scoreKey(s);
    s = open(play(s, { type: "NEXT" }));
    expect(s.hintUsed).toBe(0);
    expect(scoreKey(s)).toBe(assisted);
    s = play(s, { type: "REFERENCE" });
    s = takeTwo(s);
    const reference = scoreKey(s);
    s = open(play(s, { type: "NEXT" }));
    expect(scoreKey(s)).toBe(reference);
    expect(reference).not.toBe(assisted);
  });
  it("roundtrips totals above 72 panels, including a paused next-board load and active board", () => {
    const values = new Map<string, string>(),
      storage = {
        getItem: (k: string) => values.get(k) ?? null,
        setItem: (k: string, v: string) => {
          values.set(k, v);
        },
      };
    const s = blocked("solo", "practice", "player");
    let n = reduce(reduce(s, { type: "TICK", elapsed: 1 }), { type: "NEXT" });
    expect(saveGame(storage, n)).toBeNull();
    let restored = loadGame(
      storage,
      assets.map((a) => a.id),
      assets.flatMap((a) => a.readings.map((r) => r.id)),
    ).state!;
    expect(totalScore(restored).points).toBe(8200);
    expect(restored.resumePhase).toBe("loadingRound");
    n = reduce(reduce(restored, { type: "RESUME" }), {
      type: "BOARD",
      board: board(restored),
    });
    expect(saveGame(storage, n)).toBeNull();
    restored = loadGame(
      storage,
      assets.map((a) => a.id),
      assets.flatMap((a) => a.readings.map((r) => r.id)),
    ).state!;
    expect(totalScore(restored)).toEqual(totalScore(n));
    expect(
      validSave({
        ...n,
        carriedScore: {
          points: Number.MAX_SAFE_INTEGER,
          panels: 80,
          alternatives: 0,
          elapsedMs: 0,
        },
        score: { points: 1, panels: 1, alternatives: 0, elapsedMs: 0 },
      }),
    ).toBe(false);
  });
  it("updates one record per score run and preserves older per-board records as a separate category", () => {
    let s = open(initialState(), "standard");
    s.stats.rankings = [
      {
        ...emptyScore(),
        points: 999,
        panels: 5,
        id: "legacy",
        key: scoreKey(s).replace(/^chain-v1:/, ""),
        round: 0,
        seed: "legacy",
      },
    ];
    s = takeTwo(s);
    s = open(play(s, { type: "NEXT" }), "standard");
    s = takeTwo(s);
    expect(s.stats.rankings).toHaveLength(2);
    expect(
      s.stats.rankings!.find((r) => r.key.startsWith("chain-v1:"))!.points,
    ).toBe(800);
    expect(rankRound(s)).toEqual(s.stats.rankings);
  });
  it("ends legacy reconnect timers once, rejects invalid elapsed time and preserves old totals", () => {
    for (const rescue of [
      undefined,
      { from: "ゔ", to: "あ", remaining: 1000, count: 1 },
    ]) {
      const s: GameState = {
        ...blocked("solo", "practice", "player"),
        phase: "rescuing",
        rescue,
      };
      for (const elapsed of [NaN, -1, Infinity])
        expect(reduce(s, { type: "TICK", elapsed })).toBe(s);
      const n = reduce(s, { type: "TICK", elapsed: 10 });
      expect(n.phase).toBe("roundResult");
      expect(n.head).toBe(rescue?.from ?? s.head);
      expect(totalScore(n)).toEqual(totalScore(s));
      expect(n.stats.played).toBe(s.stats.played + 1);
      expect(reduce(n, { type: "TICK", elapsed: 1000 })).toBe(n);
      const resumed = reduce(
        { ...s, phase: "paused", resumePhase: "rescuing" },
        { type: "RESUME" },
      );
      expect(resumed.head).toBe(rescue?.from ?? s.head);
    }
  });
  it("starts from missing legacy score fields without NaN or duplicate awards", () => {
    const s = {
      ...open(),
      score: undefined,
      turnElapsedMs: undefined,
      scoreStartRound: undefined,
    };
    const ticked = play(s, { type: "TICK", elapsed: 500 });
    expect(totalScore(ticked)).toEqual({ ...emptyScore(), elapsedMs: 500 });
    expect(ticked.turnElapsedMs).toBe(500);
    const answered = play(s, {
      type: "SUBMIT",
      actor: "player",
      assetId: deck[0].id,
      moveId: "old-score",
    });
    expect(totalScore(answered)).toEqual({
      ...emptyScore(),
      panels: 1,
      points: 100,
    });
    const end = takeTwo(s);
    const next = play(end, { type: "NEXT" });
    expect(next.scoreStartRound).toBe(s.round);
    expect(totalScore(next).points).toBe(200);
    const retry = play(play(s, { type: "LOAD_ERROR", message: "image" }), {
      type: "RETRY_LOAD",
    });
    expect(retry.scoreStartRound).toBe(s.round);
    expect(totalScore(retry)).toEqual(emptyScore());
  });
  it("keeps pause neutral, credits no-move clears and imports replay discoveries without a carry", () => {
    const s = open();
    expect(play(s, { type: "SURRENDER" }).phase).toBe("paused");
    const blockedState = { ...s, head: "ゔ" };
    const end = play(blockedState, { type: "SURRENDER" });
    expect(end.winner).toBe("player");
    expect(end.stats.wins).toBe(1);
    expect(end.stats.played).toBe(1);
    const imported = play(
      {
        ...s,
        carriedScore: {
          points: 1000,
          panels: 10,
          alternatives: 0,
          elapsedMs: 100,
        },
      },
      {
        type: "IMPORT_REPLAY",
        session: {
          seed: "replay-old",
          round: 5,
          settings: s.settings,
          recentBoards: [],
          board: board(s),
        },
      },
    );
    expect(imported.replayDiscovery).toEqual([]);
    expect(totalScore(imported)).toEqual(emptyScore());
    const answered = play(play(imported, { type: "READY" }), {
      type: "SUBMIT",
      actor: "player",
      assetId: deck[0].id,
      moveId: "replay-discovery",
    });
    expect(answered.replayDiscovery).toEqual([deck[0].readings[0].id]);
    expect(totalScore(answered).points).toBe(100);
  });
  it("restores an old reconnect save as a no-move result exactly once", () => {
    const s = {
      ...blocked("turns", "practice", "player"),
      phase: "paused" as const,
      resumePhase: "rescuing" as const,
      head: "か",
      rescue: { from: "ゔ", to: "か", remaining: 1000, count: 1 },
    };
    const n = reduce(s, { type: "RESUME" });
    expect(n.phase).toBe("roundResult");
    expect(n.winner).toBe("player");
    expect(n.head).toBe("ゔ");
    expect(n.stats.played).toBe(s.stats.played + 1);
    expect(reduce(n, { type: "RESUME" })).toBe(n);
  });
});
