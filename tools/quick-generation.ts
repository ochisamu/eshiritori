import { activeAssets } from "../src/game/content";
import { generateBoard } from "../src/game/boardGenerator";
const start = performance.now();
let failures = 0;
for (let i = 0; i < 30; i++) {
  try {
    const b = generateBoard(activeAssets, {
      seed: `quick-${i}`,
      round: i % 2,
      difficulty: "normal",
      discovered: [],
    });
    console.log(i, b.head, b.proof?.path.length, b.proof?.states);
  } catch (e) {
    failures++;
    console.log("FAIL", i, (e as Error).message);
  }
}
console.log({
  assets: activeAssets.length,
  failures,
  ms: performance.now() - start,
});
