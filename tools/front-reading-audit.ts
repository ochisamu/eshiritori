import { writeFileSync, mkdirSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { activeAssets as assets } from "../src/game/content";
import { generateBoard, boardPosition } from "../src/game/boardGenerator";
import { chooseCpu, CPU_STATE_LIMITS } from "../src/game/cpu";
import { advance, legalMoves } from "../src/game/rules";
import {
  headKana,
  tailKana,
  normalizeReading,
} from "../src/game/normalization";
import { withReserve } from "../src/game/refill";
import { rng } from "../src/game/rng";
import type { Board, Difficulty } from "../src/game/types";
const label = process.argv[2] ?? "after",
  count = Number(process.env.AUDIT_SEEDS ?? 100);
const exposures = new Map<string, number>(),
  configurations = new Set<string>(),
  failures: unknown[] = [],
  rows: any[] = [];
const vocabulary = assets.flatMap((a) =>
  a.readings
    .filter((r) => r.kind === "basic")
    .map((r) => ({
      asset: a.id,
      word: normalizeReading(r.kana),
      head: headKana(r.kana),
      tail: tailKana(r.kana),
    })),
);
for (const difficulty of ["easy", "normal", "hard"] as Difficulty[]) {
  const recent: Board[] = [];
  for (let i = 0; i < count; i++) {
    const start = performance.now();
    try {
      const b = generateBoard(assets, {
        seed: `front-study-${i}`,
        round: i,
        difficulty,
        discovered: [],
        cpuOpening: true,
        recent,
      });
      const generationMs = performance.now() - start;
      recent.push(b);
      if (recent.length > 20) recent.shift();
      b.ids.forEach((id) => exposures.set(id, (exposures.get(id) ?? 0) + 1));
      configurations.add([...b.ids].sort().join("|"));
      for (const refill of [false, true])
        for (const player of ["front-random", "all-random"]) {
          const board = refill ? withReserve(b, difficulty, assets) : b;
          let p = {
              ...boardPosition(board),
              ...(board.reserve ? { reserve: board.reserve } : {}),
            },
            actor = "cpu",
            turns = 0,
            basicCpu = 0,
            altCpu = 0,
            priorityViolations = 0,
            maxStates = 0,
            cpuMs = 0;
          const random = rng(`front-player-${i}-${player}`);
          while (turns < 72) {
            const ms = legalMoves(assets, p);
            if (!ms.length) break;
            let m;
            if (turns === 0 && board.opening)
              m = ms.find(
                (m) =>
                  m.assetId === board.opening!.assetId &&
                  m.reading.id === board.opening!.readingId,
              )!;
            else if (actor === "cpu") {
              const t = performance.now(),
                d = chooseCpu(
                  assets,
                  p,
                  difficulty,
                  `${board.seed}:cpu:${turns}`,
                  undefined,
                  board.cpuVersion,
                );
              cpuMs = Math.max(cpuMs, performance.now() - t);
              maxStates = Math.max(maxStates, d.states);
              m = d.move!;
              if (d.states > CPU_STATE_LIMITS[difficulty])
                throw Error("CPU cap exceeded");
            } else {
              const front = ms.filter((m) => m.reading.kind === "basic"),
                pool = player === "front-random" && front.length ? front : ms;
              m = pool[Math.floor(random() * pool.length)];
            }
            if (
              !m ||
              !ms.some(
                (x) => x.assetId === m.assetId && x.reading.id === m.reading.id,
              )
            )
              throw Error("illegal move");
            if (actor === "cpu") {
              if (m.reading.kind === "basic") basicCpu++;
              else {
                altCpu++;
                if (ms.some((m) => m.reading.kind === "basic"))
                  priorityViolations++;
              }
            }
            p = advance(p, m);
            turns++;
            actor = actor === "cpu" ? "player" : "cpu";
          }
          rows.push({
            difficulty,
            i,
            refill,
            player,
            turns,
            basicCpu,
            altCpu,
            priorityViolations,
            maxStates,
            cpuMs,
            generationMs,
            states: b.proof!.states,
            fallback: b.fallback,
          });
        }
    } catch (e) {
      failures.push({ difficulty, i, error: String(e) });
    }
  }
  console.log(label, difficulty, rows.length, failures.length);
}
const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b),
  pct = (xs: number[], q: number) =>
    sorted(xs)[Math.min(xs.length - 1, Math.floor(xs.length * q))] ?? 0;
const groups = [];
for (const difficulty of ["easy", "normal", "hard"])
  for (const refill of [false, true])
    for (const player of ["front-random", "all-random"]) {
      const r = rows.filter(
        (r) =>
          r.difficulty === difficulty &&
          r.refill === refill &&
          r.player === player,
      );
      groups.push({
        difficulty,
        refill,
        player,
        cases: r.length,
        meanTurns: r.reduce((s, r) => s + r.turns, 0) / r.length,
        medianTurns: pct(
          r.map((r) => r.turns),
          0.5,
        ),
        shortGames: r.filter((r) => r.turns <= 4).length,
        basicCpu: r.reduce((s, r) => s + r.basicCpu, 0),
        altCpu: r.reduce((s, r) => s + r.altCpu, 0),
        priorityViolations: r.reduce((s, r) => s + r.priorityViolations, 0),
        cpuP95Ms: pct(
          r.map((r) => r.cpuMs),
          0.95,
        ),
        maxStates: Math.max(...r.map((r) => r.maxStates)),
      });
    }
const boards = rows.filter((r) => !r.refill && r.player === "front-random");
const report = {
  label,
  count,
  failures,
  boards: boards.length,
  uniqueConfigurations: configurations.size,
  uniqueAssets: exposures.size,
  topExposures: [...exposures].sort((a, b) => b[1] - a[1]).slice(0, 20),
  fallbacks: boards.filter((r) => r.fallback).length,
  generationP95Ms: pct(
    boards.map((r) => r.generationMs),
    0.95,
  ),
  maxGenerationStates: Math.max(...boards.map((r) => r.states)),
  vocabulary: {
    assets: assets.length,
    basicReadings: vocabulary.length,
    uniqueBasicWords: new Set(vocabulary.map((v) => v.word)).size,
    safeBasicAssets: new Set(
      vocabulary.filter((v) => v.tail !== "ん").map((v) => v.asset),
    ).size,
    headCounts: Object.fromEntries(
      [...new Set(vocabulary.map((v) => v.head))]
        .map((h) => [
          h,
          vocabulary.filter((v) => v.head === h && v.tail !== "ん").length,
        ])
        .sort((a, b) => Number(a[1]) - Number(b[1])),
    ),
  },
  groups,
};
mkdirSync("reports/front-reading", { recursive: true });
writeFileSync(
  `reports/front-reading/${label}.json`,
  JSON.stringify(report, null, 2),
);
writeFileSync(`reports/front-reading/${label}-rows.json`, JSON.stringify(rows));
console.log(JSON.stringify(report, null, 2));
