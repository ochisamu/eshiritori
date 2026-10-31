import { writeFileSync, mkdirSync } from "node:fs";
import { activeAssets as assets } from "../src/game/content";
import { generateBoard, boardPosition } from "../src/game/boardGenerator";
import { chooseCpu } from "../src/game/cpu";
import { advance, legalMoves, validateMove } from "../src/game/rules";
import { initialState, reducer, CONTENT_VERSION } from "../src/game/state";
import { rng, RNG_VERSION } from "../src/game/rng";
import { MIN_REACHABLE_CARDS } from "../src/game/config";
import { CPU_VERSION } from "../src/game/cpu";
import { GENERATOR_VERSION } from "../src/game/boardGenerator";
// @ts-expect-error Shared dependency-free release helper.
import { runtimeHash } from "./runtime-files.mjs";
import type { Board, Difficulty } from "../src/game/types";
mkdirSync("reports", { recursive: true });
const seeds = Number(process.env.AUDIT_SEEDS ?? 10000);
const seedStart = Number(process.env.AUDIT_SEED_START ?? 0);
const difficulties = (process.env.AUDIT_DIFFICULTIES ?? "easy,normal,hard").split(",") as Difficulty[];
if (difficulties.some(d=>!["easy","normal","hard"].includes(d))) throw Error("Invalid difficulty");
const runStart = Number(process.env.SIM_RUN_START ?? 0);
const runCount = Number(process.env.SIM_RUNS ?? 10);
const rounds = Number(process.env.STRESS_ROUNDS ?? 1000);
const started = new Date().toISOString();
const start = performance.now();
const report: {
  started: string;
  contentVersion: string;
  buildHash: string;
  environment: unknown;
  assets: number;
  boards: number;
  fallbacks: number;
  failures: unknown[];
  maxGenerationMs: number;
  cpuOutputs: number;
  simulations: unknown[];
  durationMs: number;
} = {
  started,
  contentVersion: CONTENT_VERSION,
  buildHash: runtimeHash(),
  environment: {
    platform: process.platform,
    node: process.version,
    rng: RNG_VERSION,
    cpu: CPU_VERSION,
    generator: GENERATOR_VERSION,
    seedsPerDifficulty: seeds,
    seedStart,
    difficulties,
    runStart,
    runCount,
    roundsPerSimulation: rounds,
    timing:
      "wall-clock generation including bounded proof search, no rendering",
  },
  assets: assets.length,
  boards: 0,
  fallbacks: 0,
  failures: [],
  maxGenerationMs: 0,
  cpuOutputs: 0,
  simulations: [],
  durationMs: 0,
};
for (const difficulty of difficulties)
  for (let i = seedStart; i < seedStart + seeds; i++) {
    try {
      const begin = performance.now();
      const b = generateBoard(assets, {
        seed: `acceptance-${i}`,
        round: i % 2,
        difficulty,
        discovered: [],
      });
      report.maxGenerationMs = Math.max(
        report.maxGenerationMs,
        performance.now() - begin,
      );
      report.boards++;
      report.fallbacks += Number(b.fallback);
      if (
        !b.proof ||
        b.proof.path.length < MIN_REACHABLE_CARDS ||
        b.proof.branches < 2 ||
        b.proof.playerWin === undefined
      )
        throw Error("invalid proof");
    } catch (e) {
      report.failures.push({
        type: "generation",
        difficulty,
        seed: i,
        error: (e as Error).message,
      });
    }
    if (i % 1000 === 999)
      console.log(`boards ${difficulty}: ${i + 1}/${seeds}`);
  }
for (let run = runStart; run < runStart + runCount; run++) {
  let s = initialState();
  s.settings.difficulty = (["easy", "normal", "hard"] as Difficulty[])[run % 3];
  const random = rng(`stress-${run}`);
  let moves = 0,
    wins = 0,
    losses = 0,
    fallbacks = 0,
    repeats = 0;
  const recent: Board[] = [];
  const begin = performance.now();
  for (let round = 0; round < rounds; round++)
    try {
      const b = generateBoard(assets, {
        seed: `stress-${run}`,
        round,
        difficulty: s.settings.difficulty,
        discovered: s.discovered,
        recent,
      });
      fallbacks += Number(b.fallback);
      repeats += Number(
        recent.some((x) => x.head === b.head && x.ids.join() === b.ids.join()),
      );
      s = { ...s, round, phase: "loadingRound" };
      s = reducer(s, { type: "BOARD", board: b }, assets);
      s = reducer(s, { type: "READY" }, assets);
      let pos = boardPosition(b, s.discovered);
      for (let step = 0; step < 24 && s.phase !== "roundResult"; step++) {
        const legal = legalMoves(assets, pos);
        if (!legal.length) throw Error("engine left empty active turn");
        const d =
          s.actor === "cpu"
            ? chooseCpu(
                assets,
                pos,
                s.settings.difficulty,
                `${b.seed}:cpu:${step}`,
              )
            : null;
        const m = d ? d.move! : legal[Math.floor(random() * legal.length)];
        if (
          !m ||
          !validateMove(
            assets.find((a) => a.id === m.assetId),
            pos,
            { readingId: m.reading.id },
          ).ok
        )
          throw Error("non executable move");
        if (d) report.cpuOutputs++;
        const actor = s.actor;
        const a = {
          type: "SUBMIT" as const,
          actor,
          assetId: m.assetId,
          readingId: m.reading.id,
          moveId: `${b.seed}:move:${step}`,
        };
        s = reducer(s, a, assets);
        if (reducer(s, a, assets) !== s)
          throw Error("duplicate delivery modified state");
        if (s.moves.length !== step + 1) throw Error("move failed consumption");
        pos = advance(pos, m);
        moves++;
        s = reducer(s, { type: "RESOLVED" }, assets);
        if (s.remaining < 0) throw Error("negative time");
      }
      if (s.phase !== "roundResult") throw Error("no result");
      if (s.winner === "player") wins++;
      else losses++;
      recent.push({ ...b, proof: undefined, initialDiscovered: undefined });
      if (recent.length > 100) recent.shift();
      if (s.moves.length > 24) throw Error("unbounded round log");
    } catch (e) {
      report.failures.push({
        type: "stress",
        run,
        round,
        error: (e as Error).message,
      });
    }
  const entry = {
    run,
    seed: `stress-${run}`,
    difficulty: s.settings.difficulty,
    rounds,
    moves,
    wins,
    losses,
    fallbacks,
    repeats,
    durationMs: performance.now() - begin,
  };
  report.simulations.push(entry);
  console.log(entry);
}
report.durationMs = performance.now() - start;
writeFileSync(process.env.STRESS_OUTPUT ?? "reports/stress-results.json", JSON.stringify(report, null, 2));
console.log({
  boards: report.boards,
  failures: report.failures.length,
  fallbackRate: report.fallbacks / Math.max(1, report.boards),
  ms: report.durationMs,
});
if (report.failures.length || report.fallbacks / report.boards >= 0.01)
  process.exitCode = 1;
