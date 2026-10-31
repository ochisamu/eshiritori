import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { activeAssets as assets } from "../src/game/content";
import {
  initialState,
  reducer,
  position,
  CONTENT_VERSION,
} from "../src/game/state";
import { generateBoard } from "../src/game/boardGenerator";
import { chooseCpu } from "../src/game/cpu";
import { legalMoves } from "../src/game/rules";
import type { Difficulty } from "../src/game/types";
// @ts-expect-error Shared dependency-free release helper.
import { runtimeHash } from "./runtime-files.mjs";
const digest = (x: unknown) =>
  createHash("sha256").update(JSON.stringify(x)).digest("hex");
const startedAt = new Date().toISOString();
const injectedTimes = [137, 411, 73, 820, 251, 154];
function trace(seed: string, difficulty: Difficulty, reducedMotion: boolean) {
  let s = initialState();
  s = reducer(
    s,
    {
      type: "START",
      seed,
      settings: { ...s.settings, difficulty, reducedMotion, muted: true },
    },
    assets,
  );
  const board = generateBoard(assets, {
    seed,
    round: 0,
    difficulty,
    discovered: [],
  });
  s = reducer(s, { type: "BOARD", board }, assets);
  s = reducer(s, { type: "READY" }, assets);
  const choices: unknown[] = [];
  for (let step = 0; step < 24 && s.phase !== "roundResult"; step++) {
    s = reducer(
      s,
      { type: "TICK", elapsed: injectedTimes[step % injectedTimes.length] },
      assets,
    );
    if (step === 2) {
      s = reducer(s, { type: "PAUSE", elapsed: 19 }, assets);
      s = reducer(s, { type: "RESUME" }, assets);
    }
    const moves = legalMoves(assets, position(s));
    const move =
      s.actor === "cpu"
        ? chooseCpu(
            assets,
            position(s),
            difficulty,
            `${board.seed}:cpu:${step}`,
          ).move!
        : moves[step % moves.length];
    assert(move, "active turn must have a common executable move");
    choices.push({
      actor: s.actor,
      asset: move.assetId,
      reading: move.reading.id,
    });
    s = reducer(
      s,
      {
        type: "SUBMIT",
        actor: s.actor,
        assetId: move.assetId,
        readingId: move.reading.id,
        moveId: `${seed}:${step}`,
      },
      assets,
    );
    s = reducer(s, { type: "RESOLVED" }, assets);
  }
  assert.equal(s.phase, "roundResult");
  return {
    board: digest(board),
    choices,
    result: { winner: s.winner, reason: s.reason, moves: s.moves },
    saved: JSON.stringify(s),
  };
}
const cases = [];
for (const difficulty of ["easy", "normal", "hard"] as Difficulty[])
  for (let i = 0; i < 30; i++) {
    const seed = `determinism-final-${i}`,
      a = trace(seed, difficulty, false),
      b = trace(seed, difficulty, false),
      c = trace(seed, difficulty, true);
    assert.deepEqual(
      a,
      b,
      "same injected clock/input/state must produce identical saved state",
    );
    for (const key of ["board", "choices", "result"] as const)
      assert.deepEqual(
        a[key],
        c[key],
        "motion settings must not alter gameplay",
      );
    cases.push({
      seed,
      difficulty,
      boardHash: a.board,
      traceHash: digest(a),
      moves: a.choices.length,
      winner: a.result.winner,
    });
  }
writeFileSync(
  "reports/determinism-results.json",
  JSON.stringify(
    {
      startedAt,
      endedAt: new Date().toISOString(),
      contentVersion: CONTENT_VERSION,
      buildHash: runtimeHash(),
      injectedTimes,
      cases,
      failures: [],
      runs: cases.length * 3,
      reviewerType: "automated deterministic engine verification",
    },
    null,
    2,
  ),
);
console.log(
  `Verified ${cases.length} cases × 3 executions, full save equality and motion-independent gameplay.`,
);
