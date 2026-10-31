import { writeFileSync } from "node:fs";
import { activeAssets as assets } from "../src/game/content";
import { chooseCpu, LONG_PLAY_CPU_VERSION } from "../src/game/cpu";
import { chooseCpu as baseline } from "./front-reading-cpu-baseline";
import { legalMoves, advance } from "../src/game/rules";
import { rng } from "../src/game/rng";
import oldBoards from "../content/fallbacks.json" with { type: "json" };
import { verifyBoard, boardPosition } from "../src/game/boardGenerator";
import type { Board, Difficulty } from "../src/game/types";
let decisions = 0,
  verifiedBoards = 0;
for (const board of oldBoards as Board[]) {
  const difficulty = board.fallbackFor!.difficulty,
    round = board.fallbackFor!.parity;
  if (!verifyBoard(assets, board, { difficulty, round, discovered: [] }))
    throw Error("Old replay board rejected");
  verifiedBoards++;
  for (const discovered of [
    [],
    assets.flatMap((a) => a.readings.map((r) => r.id)),
  ]) {
    let p = boardPosition(board, discovered);
    const random = rng(board.seed);
    for (let i = 0; i < 24; i++) {
      const ms = legalMoves(assets, p);
      if (!ms.length) break;
      for (const d of ["easy", "normal", "hard"] as Difficulty[]) {
        const seed = `compat-${board.seed}-${i}`;
        if (
          JSON.stringify(
            chooseCpu(assets, p, d, seed, undefined, LONG_PLAY_CPU_VERSION),
          ) !== JSON.stringify(baseline(assets, p, d, seed))
        )
          throw Error("v3 policy drift");
        decisions++;
      }
      p = advance(p, ms[Math.floor(random() * ms.length)]);
    }
  }
}
writeFileSync(
  "reports/front-reading/compatibility.json",
  JSON.stringify(
    {
      verifiedBoards,
      decisions,
      policy: LONG_PLAY_CPU_VERSION,
      differences: 0,
    },
    null,
    2,
  ),
);
console.log({ verifiedBoards, decisions });
