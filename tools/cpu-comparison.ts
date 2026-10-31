import { strict as assert } from "node:assert";
import { writeFileSync } from "node:fs";
import { activeAssets as assets } from "../src/game/content";
import { generateBoard, boardPosition } from "../src/game/boardGenerator";
import { chooseCpu } from "../src/game/cpu";
import { legalMoves, advance, validateMove } from "../src/game/rules";
import { rng } from "../src/game/rng";
import { CONTENT_VERSION } from "../src/game/state";
import type { Difficulty } from "../src/game/types";
// @ts-expect-error Shared dependency-free release helper.
import { runtimeHash } from "./runtime-files.mjs";
const startedAt = new Date().toISOString();
const cases: {
  seed: string;
  difficulty: Difficulty;
  moves: number;
  winner: string;
  maxStates: number;
}[] = [];
for (let i = 0; i < 100; i++) {
  const board = generateBoard(assets, {
    seed: `cpu-compare-${i}`,
    round: i % 2,
    difficulty: "normal",
    discovered: [],
  });
  for (const difficulty of ["easy", "normal", "hard"] as Difficulty[]) {
    let position = boardPosition(board, []),
      actor = i % 2 ? "cpu" : "player",
      moves = 0,
      maxStates = 0;
    const random = rng(`same-opponent-${i}`);
    let winner = "";
    while (moves < 24) {
      const options = legalMoves(assets, position);
      if (!options.length) {
        winner = actor === "cpu" ? "player" : "cpu";
        break;
      }
      const decision =
        actor === "cpu"
          ? chooseCpu(
              assets,
              position,
              difficulty,
              `${board.seed}:cpu:${moves}`,
            )
          : null;
      const move = decision
        ? decision.move!
        : options[Math.floor(random() * options.length)];
      assert(move);
      assert(
        options.some(
          (m) => m.assetId === move.assetId && m.reading.id === move.reading.id,
        ),
      );
      assert(
        validateMove(
          assets.find((a) => a.id === move.assetId),
          position,
          { readingId: move.reading.id },
        ).ok,
      );
      maxStates = Math.max(maxStates, decision?.states ?? 0);
      position = advance(position, move);
      moves++;
      if (moves === 24) {
        winner = actor;
        break;
      }
      actor = actor === "cpu" ? "player" : "cpu";
    }
    assert(winner);
    cases.push({ seed: board.seed, difficulty, moves, winner, maxStates });
  }
}
const summary = Object.fromEntries(
  (["easy", "normal", "hard"] as Difficulty[]).map((d) => {
    const selected = cases.filter((c) => c.difficulty === d);
    return [
      d,
      {
        rounds: selected.length,
        cpuWins: selected.filter((c) => c.winner === "cpu").length,
        meanMoves: selected.reduce((n, c) => n + c.moves, 0) / selected.length,
        maxStates: Math.max(...selected.map((c) => c.maxStates)),
      },
    ];
  }),
);
writeFileSync(
  "reports/cpu-comparison.json",
  JSON.stringify(
    {
      startedAt,
      endedAt: new Date().toISOString(),
      contentVersion: CONTENT_VERSION,
      buildHash: runtimeHash(),
      opponent:
        "Seeded uniform random common executable move; matched 100 normal-generated boards and opponent RNG seeds across all three CPU levels. This is not human win-rate evidence.",
      summary,
      cases,
      failures: [],
    },
    null,
    2,
  ),
);
console.log(summary);
