import { writeFileSync, mkdirSync } from "node:fs";
import { activeAssets } from "../src/game/content";
import { generateBoard } from "../src/game/boardGenerator";
import type { Board, Difficulty } from "../src/game/types";
const outputDir = process.env.FALLBACK_OUTPUT_DIR ?? "reports";
mkdirSync(outputDir, { recursive: true });
const boards: Board[] = [];
for (const difficulty of ["easy", "normal", "hard"] as Difficulty[])
  for (let parity = 0; parity < 2; parity++) {
    let found = 0;
    for (let i = 0; i < 300 && found < 32; i++)
      try {
        const b = generateBoard(activeAssets, {
          seed: `safety-${difficulty}-${parity}-${i}`,
          round: parity,
          difficulty,
          discovered: [],
        });
        if (!b.fallback) {
          boards.push({ ...b, fallbackFor: { difficulty, parity } });
          found++;
        }
      } catch {}
    if (found < 32)
      throw Error(
        `Only ${found} fallback candidates for ${difficulty}/${parity}`,
      );
  }
writeFileSync(
  `${outputDir}/fallback-proofs.json`,
  JSON.stringify(boards, null, 2),
);
writeFileSync(
  "content/fallbacks.json",
  JSON.stringify(
    boards.map((b) => ({
      ...b,
      proof: undefined,
      initialDiscovered: undefined,
    })),
    null,
    2,
  ),
);
console.log(
  `Saved ${boards.length} fallback candidates and separate proof ledger. Runtime revalidates exact CPU seed and discovery state.`,
);
