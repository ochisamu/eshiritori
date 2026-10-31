import { createHash } from "node:crypto";
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { activeAssets as currentAssets } from "../src/game/content";
import { initialState, reducer, position } from "../src/game/state";
import { generateBoard } from "../src/game/boardGenerator";
import { chooseCpu, CPU_STATE_LIMITS } from "../src/game/cpu";
import { legalMoves } from "../src/game/rules";
import { cpuRoundScore } from "../src/game/scoring";
import { rng } from "../src/game/rng";
import { validSave } from "../src/storage/save";
const outputDir = process.env.ARCADE_OUTPUT_DIR ?? "reports/arcade-update";
mkdirSync(outputDir, { recursive: true });
const assets: typeof currentAssets = process.env.ARCADE_DICTIONARY
  ? JSON.parse(readFileSync(process.env.ARCADE_DICTIONARY, "utf8"))
  : currentAssets;
const modes = process.env.ARCADE_ALL_MODES
  ? ([
      "standard",
      "practice",
      "refill",
      "refillPractice",
      "accessible",
    ] as const)
  : (["standard", "practice", "refill", "refillPractice"] as const);
const rows: any[] = [],
  failures: any[] = [];
for (const opponent of ["turns", "solo", "race"] as const)
  for (const difficulty of ["easy", "normal", "hard"] as const)
    for (const mode of modes)
      for (let i = 0; i < 10; i++) {
        const seed = `arcade-study-${opponent}-${difficulty}-${mode}-${i}`,
          random = rng(seed);
        try {
          let s = initialState();
          s = reducer(
            s,
            {
              type: "START",
              seed,
              settings: {
                ...s.settings,
                opponent,
                difficulty,
                mode,
                tutorialSeen: true,
              },
            },
            assets,
          );
          const b = generateBoard(assets, {
            seed,
            round: 0,
            difficulty,
            discovered: [],
            cpuOpening: opponent === "turns",
          });
          s = reducer(s, { type: "BOARD", board: b }, assets);
          s = reducer(s, { type: "READY" }, assets);
          let steps = 0,
            rescues = 0,
            maxCpuStates = 0;
          while (s.phase !== "roundResult" && steps++ < 400) {
            if (!validSave(s)) throw Error("Invalid serializable state");
            if (s.phase === "resolvingMove") {
              s = reducer(s, { type: "RESOLVED" }, assets);
              continue;
            }
            if (s.phase === "rescuing") {
              rescues++;
              s = reducer(s, { type: "TICK", elapsed: 1600 }, assets);
              continue;
            }
            const elapsed =
              opponent === "race" && random() < 0.35
                ? s.cpuRemaining
                : 500 + Math.floor(random() * 2500);
            s = reducer(s, { type: "TICK", elapsed }, assets);
            if (s.phase !== "playerTurn" && s.phase !== "cpuThinking") continue;
            const ms = legalMoves(assets, position(s));
            if (!ms.length) {
              s = reducer(s, { type: "TICK", elapsed: s.cpuRemaining }, assets);
              continue;
            }
            const actor =
              s.actor === "cpu" || (opponent === "race" && s.cpuRemaining === 0)
                ? "cpu"
                : "player";
            let m;
            if (actor === "cpu") {
              if (s.moves.length === 0 && b.opening)
                m = ms.find(
                  (m) =>
                    m.assetId === b.opening!.assetId &&
                    m.reading.id === b.opening!.readingId,
                )!;
              else {
                const d = chooseCpu(
                  assets,
                  position(s),
                  difficulty,
                  `${b.seed}:cpu:${s.moves.length}`,
                );
                maxCpuStates = Math.max(maxCpuStates, d.states);
                if (d.states > CPU_STATE_LIMITS[difficulty])
                  throw Error("CPU budget exceeded");
                m = d.move!;
                if (
                  m.reading.kind !== "basic" &&
                  ms.some((m) => m.reading.kind === "basic")
                )
                  throw Error("Front priority violation");
              }
            } else {
              const front = ms.filter((m) => m.reading.kind === "basic"),
                pool = front.length ? front : ms;
              m = pool[Math.floor(random() * pool.length)];
            }
            const before = s.moves.length;
            s = reducer(
              s,
              {
                type: "SUBMIT",
                actor,
                assetId: m.assetId,
                readingId: m.reading.id,
                moveId: `audit-${before}`,
              },
              assets,
            );
            if (s.moves.length !== before + 1)
              throw Error("Rejected legal answer");
          }
          if (s.phase !== "roundResult") throw Error("No bounded termination");
          if (opponent === "race") {
            const player = s.score?.points ?? 0,
              cpu = cpuRoundScore(s).points;
            if (
              s.winner !==
              (player > cpu ? "player" : cpu > player ? "cpu" : null)
            )
              throw Error("Incorrect race winner");
            if (
              s.moves
                .filter((m) => m.actor === "cpu")
                .reduce((n, m) => n + (m.points?.total ?? 0), 0) !== cpu
            )
              throw Error("CPU score mismatch");
          } else if (s.winner !== "player")
            throw Error("Unexpected non-clear in a safe walk");
          if (
            new Set(s.moves.map((m) => m.assetId)).size !== s.moves.length ||
            new Set(s.moves.map((m) => m.word)).size !== s.moves.length
          )
            throw Error("Duplicate panel or word");
          const player = s.moves.filter(
            (m) => m.actor === "player" && m.tail !== "ん",
          );
          if (
            player.length !== s.score?.panels ||
            player.reduce((n, m) => n + (m.points?.total ?? 0), 0) !==
              s.score?.points
          )
            throw Error("Score mismatch");
          if (opponent === "solo" && s.moves.some((m) => m.actor === "cpu"))
            throw Error("CPU leaked into solo");
          rows.push({
            opponent,
            difficulty,
            mode,
            i,
            winner: s.winner,
            moves: s.moves.length,
            playerPanels: player.length,
            score: s.score?.points,
            cpuScore: cpuRoundScore(s).points,
            rescues,
            maxCpuStates,
            fallback: b.fallback,
          });
        } catch (e) {
          failures.push({ seed, error: String(e) });
        }
      }
const report = {
  dictionarySha256: createHash("sha256")
    .update(JSON.stringify(assets))
    .digest("hex"),
  dictionarySource:
    process.env.ARCADE_DICTIONARY ?? "src/generated/content.json",
  cases: rows.length,
  failures,
  groups: ["turns", "solo", "race"].map((opponent) => {
    const rs = rows.filter((r) => r.opponent === opponent);
    return {
      opponent,
      cases: rs.length,
      meanMoves: rs.reduce((n, r) => n + r.moves, 0) / rs.length,
      meanRescues: rs.reduce((n, r) => n + r.rescues, 0) / rs.length,
      maxCpuStates: Math.max(...rs.map((r) => r.maxCpuStates)),
    };
  }),
  rows,
};
writeFileSync(`${outputDir}/simulation.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, rows: undefined }));
if (failures.length) process.exitCode = 1;
