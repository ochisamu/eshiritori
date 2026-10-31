import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { activeAssets as assets } from "../src/game/content";
import { generateBoard, GENERATOR_VERSION } from "../src/game/boardGenerator";
import { readingGraph } from "../src/game/readingGraph";
import { withReserve } from "../src/game/refill";
import { rng, shuffle } from "../src/game/rng";
import type { Board, Difficulty } from "../src/game/types";
const outputDir = process.env.DIVERSITY_OUTPUT_DIR ?? "reports/diversity";
const count = Number(process.env.DIVERSITY_BOARDS ?? 300);
const graph = readingGraph(assets);
const allDiscovered = assets.flatMap((a) => a.readings.map((r) => r.id));
const groups: any[] = [];
const union = new Set<string>();
function summarize(exposures: Map<string, number>, totalBoards: number) {
  const total = [...exposures.values()].reduce((s, n) => s + n, 0);
  const ordered = [...exposures].sort((a, b) => b[1] - a[1]);
  const entropy = -[...exposures.values()].reduce(
    (s, n) => s + (n / total) * Math.log(n / total),
    0,
  );
  return {
    uniqueAssets: exposures.size,
    effectiveAssetCount: Math.exp(entropy),
    top10SlotShare: ordered.slice(0, 10).reduce((s, [, n]) => s + n, 0) / total,
    top10: ordered.slice(0, 10).map(([id, n]) => ({
      id,
      word: assets
        .find((a) => a.id === id)!
        .readings.find((r) => r.kind === "basic")?.display,
      boards: n,
      boardRate: n / totalBoards,
    })),
    missing: assets
      .filter((a) => !exposures.has(a.id))
      .map((a) => ({
        id: a.id,
        word: a.readings.find((r) => r.kind === "basic")?.display,
        safeFront: (graph.front.get(a.id)?.length ?? 0) > 0,
      })),
    exposureCounts: Object.fromEntries(ordered),
  };
}
const scenarios = [
  {
    name: "fresh-normal",
    difficulty: "normal",
    history: false,
    discovered: [],
  },
  {
    name: "continuous-normal",
    difficulty: "normal",
    history: true,
    discovered: [],
  },
  { name: "fresh-easy", difficulty: "easy", history: false, discovered: [] },
  { name: "fresh-hard", difficulty: "hard", history: false, discovered: [] },
  {
    name: "all-discovered-normal",
    difficulty: "normal",
    history: false,
    discovered: allDiscovered,
  },
] as const;
for (const scenario of scenarios) {
  const exposures = new Map<string, number>(),
    reserveExposures = new Map<string, number>(),
    heads = new Map<string, number>();
  const recent: Board[] = [],
    sets = new Set<string>(),
    layouts = new Set<string>(),
    openings = new Map<string, number>();
  const coverage: any[] = [],
    times: number[] = [],
    rows: any[] = [],
    errors: any[] = [];
  let fallbacks = 0,
    adjacentOverlap = 0,
    previous: Board | undefined;
  const sessionSeed = "diversity-20261031-continuous";
  for (let i = 0; i < count; i++) {
    const start = performance.now();
    try {
      const b = generateBoard(assets, {
        seed: scenario.history ? sessionSeed : `diversity-20261031-fresh-${i}`,
        round: scenario.history ? i : 0,
        difficulty: scenario.difficulty as Difficulty,
        discovered: [...scenario.discovered],
        recent,
        cpuOpening: true,
      });
      times.push(performance.now() - start);
      fallbacks += Number(b.fallback);
      if (previous)
        adjacentOverlap += b.ids.filter((id) =>
          previous!.ids.includes(id),
        ).length;
      previous = b;
      if (scenario.history) {
        recent.push(b);
        if (recent.length > 20) recent.shift();
      }
      for (const id of b.ids) {
        exposures.set(id, (exposures.get(id) ?? 0) + 1);
        union.add(id);
      }
      const reserve = withReserve(
        b,
        scenario.difficulty as Difficulty,
        assets,
      ).reserve!;
      for (const id of [...b.ids, ...reserve])
        reserveExposures.set(id, (reserveExposures.get(id) ?? 0) + 1);
      sets.add([...b.ids].sort().join("|"));
      layouts.add(b.ids.join("|"));
      heads.set(b.head, (heads.get(b.head) ?? 0) + 1);
      if (b.opening)
        openings.set(
          b.opening.assetId,
          (openings.get(b.opening.assetId) ?? 0) + 1,
        );
      if ([10, 25, 50, 100, 200, 300, 500, 1000].includes(i + 1))
        coverage.push({
          boards: i + 1,
          assets: exposures.size,
          withReserve: reserveExposures.size,
        });
      rows.push({
        i,
        ids: b.ids,
        head: b.head,
        fallback: b.fallback,
        opening: b.opening,
        states: b.proof?.states,
      });
    } catch (e) {
      errors.push({ i, error: String(e) });
    }
  }
  const sorted = [...times].sort((a, b) => a - b);
  const report = {
    name: scenario.name,
    difficulty: scenario.difficulty,
    boards: rows.length,
    errors,
    fallbacks,
    uniqueSets: sets.size,
    uniqueLayouts: layouts.size,
    meanAdjacentOverlap: adjacentOverlap / Math.max(1, rows.length - 1),
    uniqueOpeningPanels: openings.size,
    heads: Object.fromEntries(heads),
    coverage,
    generationP95Ms: sorted[Math.floor(sorted.length * 0.95)],
    initial: summarize(exposures, rows.length),
    withReserve: summarize(reserveExposures, rows.length),
  };
  groups.push(report);
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(
    `${outputDir}/${scenario.name}-boards.json`,
    JSON.stringify(rows),
  );
  console.log(
    JSON.stringify({
      ...report,
      initial: {
        ...report.initial,
        exposureCounts: undefined,
        missing: report.initial.missing.length,
      },
      withReserve: {
        ...report.withReserve,
        exposureCounts: undefined,
        missing: report.withReserve.missing.length,
      },
    }),
  );
}
const random = rng("diversity-uniform-baseline");
const baseline = new Map<string, number>();
for (let i = 0; i < count; i++)
  for (const a of shuffle(assets, random).slice(0, 24))
    baseline.set(a.id, (baseline.get(a.id) ?? 0) + 1);
const report = {
  dictionarySha256: createHash("sha256")
    .update(JSON.stringify(assets))
    .digest("hex"),
  generator: GENERATOR_VERSION,
  dictionaryAssets: assets.length,
  safeFrontAssets: [...graph.front.values()].filter((es) => es.length > 0)
    .length,
  boardsPerScenario: count,
  unionInitialAssets: union.size,
  groups,
  uniform24CardReference: summarize(baseline, count),
  notes: [
    "Finite deterministic seeds: empirical coverage is not proof of uniformity or a lower bound on all possible boards.",
    "Fresh easy/normal/hard deliberately use identical seeds to compare difficulty; do not pool them as independent layouts.",
    "Reserve coverage counts the hidden draw pile, not pictures necessarily reached during play.",
    "This audit measures board and reserve coverage; gameplay continuation is measured separately.",
  ],
};
writeFileSync(
  `${outputDir}/verification.json`,
  JSON.stringify(report, null, 2),
);
console.log(
  JSON.stringify({
    finished: true,
    unionInitialAssets: union.size,
    uniformEffective: report.uniform24CardReference.effectiveAssetCount,
    uniformTop10: report.uniform24CardReference.top10SlotShare,
  }),
);
