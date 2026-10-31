import { it, expect } from "vitest";
import {
  answerPoints,
  emptyScore,
  rankRound,
  scoreKey,
} from "../../src/game/scoring";
import { activeAssets as assets } from "../../src/game/content";
import { initialState, reducer } from "../../src/game/state";
it("scores panels, alternatives and bounded speed; untimed never gains speed", () => {
  expect(answerPoints("basic", 0, 45, true).total).toBe(200);
  expect(answerPoints("wordplay", 22500, 45, true)).toEqual({
    base: 100,
    alternative: 150,
    speed: 50,
    total: 300,
  });
  expect(answerPoints("basic", 999999, 45, true).total).toBe(100);
  expect(answerPoints("basic", 0, 45, false).total).toBe(100);
  expect(answerPoints("part", 0, 45, false).total).toBe(250);
});
it("keeps ranked attempts separated by help/time/difficulty and limits each category to ten", () => {
  let s = initialState();
  s.score = { ...emptyScore(), points: 500, panels: 3 };
  for (let i = 0; i < 15; i++) {
    s.round = i;
    s.seed = `attempt-${i}`;
    s.stats.rankings = rankRound(s);
  }
  expect(s.stats.rankings).toHaveLength(10);
  const previous = scoreKey(s);
  s.hintUsed = 1;
  expect(scoreKey(s)).not.toBe(previous);
  s.stats.rankings = rankRound(s);
  expect(s.stats.rankings).toHaveLength(11);
  s.stats.rankings = rankRound(s);
  expect(s.stats.rankings).toHaveLength(11);
});

it("commits points once, excludes CPU and terminal answers, resets after a loss", () => {
  const asset = assets.find((a) => a.conceptKey === "umbrella")!;
  const state = {
    ...initialState(),
    phase: "playerTurn" as const,
    head: "か",
    board: {
      ids: assets.slice(0, 24).map((a) => a.id),
      head: "か",
      seed: "score",
      version: "test",
      fallback: false,
    },
  };
  const action = {
    type: "SUBMIT" as const,
    actor: "player" as const,
    assetId: asset.id,
    moveId: "scored",
  };
  const next = reducer(state, action, assets);
  expect(next.score?.points).toBe(200);
  expect(next.score?.panels).toBe(1);
  expect(reducer(next, action, assets).score).toEqual(next.score);
  const cpu = reducer(
    { ...state, actor: "cpu", phase: "cpuThinking" },
    { ...action, actor: "cpu" },
    assets,
  );
  expect(cpu.score?.points).toBe(0);
  const paused = reducer(next, { type: "PAUSE" }, assets);
  expect(
    reducer(paused, { type: "TICK", elapsed: 9999 }, assets).score,
  ).toEqual(paused.score);
  const expired = reducer(
    { ...state, score: next.score },
    { type: "TICK", elapsed: 50000 },
    assets,
  );
  expect(expired.stats.rankings?.[0].points).toBe(200);
  const loading = reducer(
    reducer(expired, { type: "NEXT" }, assets),
    { type: "BOARD", board: state.board },
    assets,
  );
  expect(loading.score?.points).toBe(0);
});
