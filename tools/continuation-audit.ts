import { writeFileSync, readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { activeAssets as assets } from "../src/game/content";
import { generateBoard, boardPosition } from "../src/game/boardGenerator";
import { chooseCpu, PREVIOUS_CPU_VERSION } from "../src/game/cpu";
import { legalMoves, advance } from "../src/game/rules";
import { rng } from "../src/game/rng";
import type { Board, Difficulty, ExecutableMove } from "../src/game/types";
import { generateBoard as generateBaselineBoard } from "./continuation-baseline";
const mode = process.argv[2] ?? "baseline";
const count = Number(process.env.AUDIT_SEEDS ?? 30);
const startedAt = new Date().toISOString();
const boards: {
  board: Board;
  difficulty: Difficulty;
  index: number;
  generationMs: number;
}[] = ["cpu-only", "legacy-recheck"].includes(mode)
  ? JSON.parse(
      readFileSync("reports/continuation/baseline-boards.json", "utf8"),
    )
  : [];
const failures: unknown[] = [];
if (!boards.length)
  for (const difficulty of ["easy", "normal", "hard"] as Difficulty[])
    for (let i = 0; i < count; i++) {
      const start = performance.now();
      try {
        boards.push({
          board: (mode === "baseline-expanded" ? generateBaselineBoard : generateBoard)(assets, {
            seed: `continuation-study-${i}`,
            round: i % 2,
            difficulty,
            discovered: [],
          }),
          difficulty,
          index: i,
          generationMs: performance.now() - start,
        });
      } catch (e) {
        failures.push({ difficulty, index: i, error: String(e) });
      }
    }
if (!["cpu-only", "legacy-recheck"].includes(mode))
  writeFileSync(
    `reports/continuation/${mode}-boards.json`,
    JSON.stringify(boards),
  );
const cpuMs: number[] = [];
const cases: {
  difficulty: Difficulty;
  index: number;
  player: string;
  turns: number;
  maxStates: number;
  openingTraps: number;
  openingChoices: number;
}[] = [];
for (const { board, difficulty, index } of boards)
  for (const player of ["common-random", "all-random"]) {
    let p = boardPosition(board),
      actor = index % 2 ? "cpu" : "player",
      turns = 0,
      maxStates = 0;
    const random = rng(`matched-player-${index}-${player}`);
    const opening = legalMoves(assets, p);
    const openingTraps = opening.filter(
      (m) => !legalMoves(assets, advance(p, m)).length,
    ).length;
    while (turns < 24) {
      const options = legalMoves(assets, p);
      if (!options.length) break;
      let move: ExecutableMove;
      if (actor === "cpu") {
        const start = performance.now();
        const decision = chooseCpu(
          assets,
          p,
          difficulty,
          `${board.seed}:cpu:${turns}`,
          undefined,
          ["legacy-recheck","baseline-expanded"].includes(mode) ? PREVIOUS_CPU_VERSION : undefined,
        );
        cpuMs.push(performance.now() - start);
        maxStates = Math.max(maxStates, decision.states);
        move = decision.move!;
        if (
          !options.some(
            (m) =>
              m.assetId === move.assetId && m.reading.id === move.reading.id,
          )
        )
          throw Error("Illegal CPU move");
      } else {
        const familiar = options.filter(
          (m) =>
            ["basic", "synonym"].includes(m.reading.kind) &&
            m.reading.difficulty !== "advanced",
        );
        const choices =
          player === "common-random" && familiar.length ? familiar : options;
        move = choices[Math.floor(random() * choices.length)];
      }
      p = advance(p, move);
      turns++;
      actor = actor === "cpu" ? "player" : "cpu";
    }
    cases.push({
      difficulty,
      index,
      player,
      turns,
      maxStates,
      openingTraps,
      openingChoices: opening.length,
    });
  }
const percentile = (xs: number[], q: number) => {
  const a = [...xs].sort((a, b) => a - b);
  return a[Math.min(a.length - 1, Math.floor(q * a.length))] ?? 0;
};
const summary = Object.fromEntries(
  (["easy", "normal", "hard"] as Difficulty[]).map((d) => [
    d,
    Object.fromEntries(
      ["common-random", "all-random"].map((player) => {
        const cs = cases.filter(
          (c) => c.difficulty === d && c.player === player,
        );
        return [
          player,
          {
            games: cs.length,
            meanTurns: cs.reduce((n, c) => n + c.turns, 0) / cs.length,
            medianTurns: percentile(
              cs.map((c) => c.turns),
              0.5,
            ),
            endedWithin4: cs.filter((c) => c.turns <= 4).length,
            endedWithin6: cs.filter((c) => c.turns <= 6).length,
            maxStates: Math.max(...cs.map((c) => c.maxStates)),
          },
        ];
      }),
    ),
  ]),
);
const used = new Set(boards.flatMap((b) => b.board.ids));
const result = {
  startedAt,
  endedAt: new Date().toISOString(),
  mode,
  description:
    "Seeded simulations of legal moves, not human play. Common-random chooses basic/synonym when available. Same board and per-game opponent RNG for CPU-only comparison.",
  boards: boards.length,
  failures,
  summary,
  generationMs: {
    p50: percentile(
      boards.map((b) => b.generationMs),
      0.5,
    ),
    p95: percentile(
      boards.map((b) => b.generationMs),
      0.95,
    ),
    max: Math.max(...boards.map((b) => b.generationMs)),
  },
  cpuMs: {
    calls: cpuMs.length,
    p50: percentile(cpuMs, 0.5),
    p95: percentile(cpuMs, 0.95),
    max: Math.max(...cpuMs),
  },
  fallbacks: boards.filter((b) => b.board.fallback).length,
  varietyByDifficulty: Object.fromEntries(
    (["easy", "normal", "hard"] as Difficulty[]).map((d) => {
      const bs = boards.filter((b) => b.difficulty === d);
      return [
        d,
        {
          boards: bs.length,
          uniqueBoards: new Set(bs.map((b) => b.board.ids.join("|"))).size,
          uniquePictures: new Set(bs.flatMap((b) => b.board.ids)).size,
        },
      ];
    }),
  ),
  variety: {
    uniquePictures: used.size,
    totalPictures: assets.length,
    uniqueOrderedBoards: new Set(boards.map((b) => b.board.ids.join("|"))).size,
  },
  cases,
};
writeFileSync(
  `reports/continuation/${mode}.json`,
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify({ ...result, cases: undefined }, null, 2));

if(mode==="legacy-recheck"){
 const baseline=JSON.parse(readFileSync("reports/continuation/baseline.json","utf8"));
 if(JSON.stringify(baseline.cases)!==JSON.stringify(cases))throw Error("Legacy v2 simulation changed");
 console.log("All 180 legacy v2 simulation outcomes exactly preserved.");
}
