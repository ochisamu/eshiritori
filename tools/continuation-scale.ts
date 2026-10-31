import { performance } from "node:perf_hooks";
import { writeFileSync } from "node:fs";
import { activeAssets as base } from "../src/game/content";
import { readingGraph } from "../src/game/readingGraph";
import { generateBoard, boardPosition } from "../src/game/boardGenerator";
import { chooseCpu, CPU_STATE_LIMITS } from "../src/game/cpu";
import type { Asset } from "../src/game/types";
const rows = [];
const quantile = (ns: number[], q: number) =>
  [...ns].sort((a, b) => a - b)[
    Math.min(ns.length - 1, Math.floor(ns.length * q))
  ] ?? 0;
for (const multiplier of [1, 4, 8]) {
  // Synthetic additions preserve head/tail topology but have distinct kana words.
  // They measure dictionary/index growth, not new real artwork or editorial quality.
  const assets: Asset[] = [...base];
  for (let copy = 1; copy < multiplier; copy++)
    for (const asset of base)
      assets.push({
        ...asset,
        id: `${asset.id}-scale${copy}`,
        conceptKey: `${asset.conceptKey}-scale${copy}`,
        readings: asset.readings.map((r) => ({
          ...r,
          id: `${r.id}-scale${copy}`,
          kana:
            r.kana.slice(0, 1) +
            "あ" +
            "いうえおかきくけ"[copy] +
            r.kana.slice(1),
        })),
      });
  const before = process.memoryUsage().heapUsed,
    start = performance.now(),
    graph = readingGraph(assets);
  const indexMs = performance.now() - start,
    indexHeapBytes = process.memoryUsage().heapUsed - before;
  const generationMs: number[] = [],
    generationStates: number[] = [],
    failures: string[] = [];
  for (let i = 0; i < 5; i++) {
    const t = performance.now();
    try {
      const b = generateBoard(assets, {
        seed: `scale-${i}`,
        round: i % 2,
        difficulty: "normal",
        discovered: [],
      });
      generationStates.push(b.proof!.states);
    } catch (e) {
      failures.push(String(e));
    }
    generationMs.push(performance.now() - t);
  }
  // Identical 24 slots across dictionary sizes: added off-board assets cannot change a CPU move.
  const original = generateBoard(base, {
    seed: "scale-same-board",
    round: 0,
    difficulty: "normal",
    discovered: [],
  });
  const p = boardPosition(original),
    cpuMs: number[] = [];
  let maxCpuStates = 0;
  for (let i = 0; i < 100; i++) {
    const t = performance.now(),
      decision = chooseCpu(assets, p, "hard", `scale-cpu-${i}`);
    cpuMs.push(performance.now() - t);
    maxCpuStates = Math.max(maxCpuStates, decision.states);
    const expected = chooseCpu(base, p, "hard", `scale-cpu-${i}`);
    if (
      decision.move?.reading.id !== expected.move?.reading.id ||
      decision.move?.assetId !== expected.move?.assetId
    )
      throw Error("Off-board dictionary changed the CPU decision");
    if (decision.states > CPU_STATE_LIMITS.hard)
      throw Error("CPU cap exceeded");
  }
  const known = assets.flatMap((a) => a.readings.map((r) => r.id)),
    baseKnown = base.flatMap((a) => a.readings.map((r) => r.id)),
    knownMs: number[] = [];
  let maxKnownStates = 0;
  for (let i = 0; i < 30; i++) {
    const t = performance.now(),
      decision = chooseCpu(
        assets,
        { ...p, discovered: known },
        "hard",
        `scale-known-${i}`,
      );
    knownMs.push(performance.now() - t);
    maxKnownStates = Math.max(maxKnownStates, decision.states);
    const expected = chooseCpu(
      base,
      { ...p, discovered: baseKnown },
      "hard",
      `scale-known-${i}`,
    );
    if (
      decision.move?.reading.id !== expected.move?.reading.id ||
      decision.move?.assetId !== expected.move?.assetId ||
      decision.states > CPU_STATE_LIMITS.hard
    )
      throw Error(
        "Full-discovery scaling changed the legal decision or exceeded the cap",
      );
  }
  rows.push({
    pictures: assets.length,
    readingEdges: graph.edges,
    indexMs,
    indexHeapBytes,
    fullDiscoveryCpu: {
      discovered: known.length,
      samples: knownMs.length,
      p95Ms: quantile(knownMs, 0.95),
      maxMs: Math.max(...knownMs),
      maxStates: maxKnownStates,
    },
    generation: {
      samples: 5,
      p95Ms: quantile(generationMs, 0.95),
      maxStates: Math.max(...generationStates),
      failures,
    },
    cpu: {
      samples: 100,
      p95Ms: quantile(cpuMs, 0.95),
      maxMs: Math.max(...cpuMs),
      maxStates: maxCpuStates,
    },
  });
  console.log(JSON.stringify(rows.at(-1)));
}
const result = {
  at: new Date().toISOString(),
  description:
    "PC Node benchmark with synthetic unique-word dictionary expansion; fixed 24-slot boards, no game-state graph persisted. Mobile performance is measured separately.",
  rows,
};
writeFileSync(
  "reports/continuation/scaling.json",
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result, null, 2));
