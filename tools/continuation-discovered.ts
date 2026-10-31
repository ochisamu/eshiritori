import { activeAssets as assets } from "../src/game/content";
import { generateBoard, boardPosition } from "../src/game/boardGenerator";
import { chooseCpu, CPU_STATE_LIMITS } from "../src/game/cpu";
import { legalMoves } from "../src/game/rules";
import { writeFileSync } from "node:fs";
const discovered = assets.flatMap((a) => a.readings.map((r) => r.id)),
  failures: string[] = [],
  cases = [];
const timings: number[] = [];
let maxStates = 0;
for (const difficulty of ["easy", "normal", "hard"] as const)
  for (let seed = 0; seed < 15; seed++) {
    try {
      const start = performance.now(),
        board = generateBoard(assets, {
          seed: `known-study-${seed}`,
          round: seed % 2,
          difficulty,
          discovered,
        });
      const p = boardPosition(board, discovered);
      for (let trial = 0; trial < 10; trial++) {
        const t = performance.now(),
          decision = chooseCpu(assets, p, difficulty, `known-${trial}`);
        timings.push(performance.now() - t);
        maxStates = Math.max(maxStates, decision.states);
        if (
          decision.states > CPU_STATE_LIMITS[difficulty] ||
          !legalMoves(assets, p).some(
            (m) =>
              m.assetId === decision.move?.assetId &&
              m.reading.id === decision.move?.reading.id,
          )
        )
          throw Error("Invalid/full-knowledge decision");
      }
      cases.push({
        difficulty,
        seed,
        states: board.proof!.states,
        fallback: board.fallback,
        ms: performance.now() - start,
      });
    } catch (e) {
      failures.push(String(e));
    }
  }
const sorted = timings.sort((a, b) => a - b),
  result = {
    at: new Date().toISOString(),
    discovered: discovered.length,
    generated: cases.length,
    failures,
    cpu: {
      calls: timings.length,
      p95Ms: sorted[Math.floor(sorted.length * 0.95)],
      maxMs: sorted.at(-1),
      maxStates,
    },
    cases,
  };
writeFileSync(
  "reports/continuation/discovered.json",
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify({ ...result, cases: undefined }, null, 2));
if (failures.length) process.exitCode = 1;
