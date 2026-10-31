// Frozen pre-change generator for matched benchmark only; never imported by the app.
import type { Actor, Asset, Board, Difficulty } from "../src/game/types";
import { advance, legalMoves, type Position } from "../src/game/rules";
import {
  chooseCpu as selectCpu,
  PREVIOUS_CPU_VERSION as CPU_VERSION,
  LEGACY_CPU_VERSION,
} from "../src/game/cpu";
const chooseCpu: typeof selectCpu = (
  assets,
  p,
  d,
  seed,
  budget,
  version = CPU_VERSION,
) => selectCpu(assets, p, d, seed, budget, version);
import { rng, shuffle } from "../src/game/rng";
import { BOARD_SIZE, MIN_REACHABLE_CARDS } from "../src/game/config";
import fallbackData from "../tests/fixtures/continuation-baseline-fallbacks.json" with { type: "json" };
export const GENERATOR_VERSION = "path-first-v3-safe-fallback";
export interface GenerationOptions {
  seed: string;
  round: number;
  difficulty: Difficulty;
  discovered: string[];
  recent?: Board[];
  maxStates?: number;
}
export interface Budget {
  states: number;
  limit: number;
}
function findPath(
  assets: readonly Asset[],
  p: Position,
  target: number,
  budget: Budget,
  random: () => number,
  path: string[] = [],
  branches = 0,
): { path: string[]; branches: number } | null {
  if (path.length >= target && branches >= 2) return { path, branches };
  if (budget.states >= budget.limit) return null;
  budget.states++;
  const ms = shuffle(legalMoves(assets, p), random);
  const b =
    branches +
    (path.length < 4 && new Set(ms.map((m) => m.assetId)).size >= 2 ? 1 : 0);
  for (const move of ms) {
    const result = findPath(
      assets,
      advance(p, move),
      target,
      budget,
      random,
      [...path, move.assetId],
      b,
    );
    if (result) return result;
    if (budget.states >= budget.limit) break;
  }
  return null;
}
export function winningPath(
  assets: readonly Asset[],
  p: Position,
  actor: Actor,
  difficulty: Difficulty,
  seed: string,
  budget: Budget,
  policyVersion = CPU_VERSION,
): string[] | null {
  if (budget.states >= budget.limit) return null;
  budget.states++;
  const moves = legalMoves(assets, p);
  if (!moves.length) return actor === "cpu" ? [] : null;
  const decision =
    actor === "cpu"
      ? chooseCpu(
          assets,
          p,
          difficulty,
          `${seed}:cpu:${p.usedIds.length}`,
          budget,
          policyVersion,
        )
      : null;
  if (decision?.budgetExceeded) return null;
  const choices = decision
    ? [decision.move!]
    : difficulty === "easy"
      ? moves.filter(
          (m) =>
            ["basic", "synonym"].includes(m.reading.kind) &&
            m.reading.difficulty !== "advanced",
        )
      : moves;
  for (const move of choices) {
    const n = advance(p, move);
    if (n.usedIds.length === p.ids.length) {
      if (actor === "player") return [move.assetId];
      continue;
    }
    const tail = winningPath(
      assets,
      n,
      actor === "player" ? "cpu" : "player",
      difficulty,
      seed,
      budget,
      policyVersion,
    );
    if (tail !== null) return [move.assetId, ...tail];
    if (budget.states >= budget.limit) break;
  }
  return null;
}
export function boardPosition(
  board: Board,
  discovered: string[] = board.initialDiscovered ?? [],
): Position {
  return {
    ids: board.ids,
    head: board.head,
    usedIds: [],
    usedWords: [],
    discovered,
  };
}
export function verifyBoard(
  assets: readonly Asset[],
  board: Board,
  o: Pick<GenerationOptions, "round" | "difficulty" | "discovered">,
  limit = 20000,
  tracker?: Budget,
): Board["proof"] | null {
  const p = boardPosition(board, o.discovered);
  if (
    board.ids.length !== BOARD_SIZE ||
    new Set(board.ids).size !== BOARD_SIZE ||
    board.ids.some((id) => !assets.some((a) => a.id === id))
  )
    return null;
  if (new Set(legalMoves(assets, p).map((m) => m.assetId)).size < 2)
    return null;
  const budget = tracker ?? { states: 0, limit };
  const path = findPath(
    assets,
    p,
    MIN_REACHABLE_CARDS,
    budget,
    rng(`${board.seed}:verify`),
  );
  if (!path) return null;
  if (o.difficulty !== "hard") {
    let firstHuman = p;
    if (o.round % 2 === 1) {
      const d = chooseCpu(
        assets,
        p,
        o.difficulty,
        `${board.seed}:cpu:0`,
        budget,
        board.cpuVersion ?? LEGACY_CPU_VERSION,
      );
      if (!d.move || d.budgetExceeded) return null;
      firstHuman = advance(p, d.move);
    }
    const ms = legalMoves(assets, firstHuman).filter((m) =>
      o.difficulty === "easy"
        ? m.reading.kind === "basic" && m.reading.difficulty !== "advanced"
        : ["basic", "synonym"].includes(m.reading.kind),
    );
    if (
      new Set(ms.map((m) => m.assetId)).size < (o.difficulty === "easy" ? 2 : 1)
    )
      return null;
  }
  const win = winningPath(
    assets,
    p,
    o.round % 2 === 0 ? "player" : "cpu",
    o.difficulty,
    board.seed,
    budget,
    board.cpuVersion ?? LEGACY_CPU_VERSION,
  );
  if (win === null) return null;
  return {
    path: path.path,
    reachable: new Set(path.path).size,
    branches: path.branches,
    playerWin: win,
    states: budget.states,
  };
}
export function generateBoard(
  assets: readonly Asset[],
  o: GenerationOptions,
): Board {
  if (assets.length < BOARD_SIZE)
    throw new Error(`${BOARD_SIZE}種類以上の有効な画像が必要です`);
  const seed = `${o.seed}:round:${o.round}`;
  const random = rng(seed);
  const maxStates = Math.max(0, Math.min(15000, o.maxStates ?? 15000));
  const budget = { states: 0, limit: maxStates };
  const recent = o.recent ?? [];
  const frequency = new Map<string, number>();
  recent
    .slice(-20)
    .forEach((b) =>
      b.ids.forEach((id) => frequency.set(id, (frequency.get(id) ?? 0) + 1)),
    );
  const heads = shuffle(
    [
      ...new Set(
        assets.flatMap((a) =>
          a.readings
            .filter((r) => r.reviewStatus === "approved")
            .map((r) => r.kana[0]),
        ),
      ),
    ].filter(
      (h) =>
        !["ん", "を", "ゔ", "ー"].includes(h) &&
        new Set(
          legalMoves(assets, {
            ids: assets.map((a) => a.id),
            head: h,
            usedIds: [],
            usedWords: [],
            discovered: o.discovered,
          }).map((m) => m.assetId),
        ).size >= 2,
    ),
    random,
  );
  for (
    let attempt = 0;
    attempt < 90 && budget.states < budget.limit;
    attempt++
  ) {
    const excludedCount =
      attempt < 25 ? 3 : attempt < 50 ? 2 : attempt < 75 ? 1 : 0;
    const excluded = new Set(
      excludedCount ? recent.slice(-excludedCount).flatMap((b) => b.ids) : [],
    );
    const available = shuffle(
      assets.filter((a) => !excluded.has(a.id)),
      random,
    ).sort((a, b) =>
      attempt < 50
        ? (frequency.get(a.id) ?? 0) - (frequency.get(b.id) ?? 0)
        : 0,
    );
    if (available.length < BOARD_SIZE) continue;
    const p: Position = {
      ids: available.map((a) => a.id),
      head: heads[attempt % heads.length],
      usedIds: [],
      usedWords: [],
      discovered: o.discovered,
    };
    if (new Set(legalMoves(assets, p).map((m) => m.assetId)).size < 2) continue;
    const attemptBudget = {
      states: 0,
      limit: Math.min(250, budget.limit - budget.states),
    };
    const path = findPath(
      available,
      p,
      MIN_REACHABLE_CARDS,
      attemptBudget,
      random,
    );
    budget.states += attemptBudget.states;
    if (!path) continue;
    const ids = [...path.path];
    const starts = shuffle(legalMoves(assets, p), random);
    for (const m of starts) {
      if (!ids.includes(m.assetId)) {
        ids.push(m.assetId);
        break;
      }
    }
    for (const a of available) {
      if (ids.length >= BOARD_SIZE) break;
      if (!ids.includes(a.id)) ids.push(a.id);
    }
    const board: Board = {
      ids: shuffle(ids, random),
      head: p.head,
      seed,
      version: GENERATOR_VERSION,
      cpuVersion: CPU_VERSION,
      fallback: false,
      initialDiscovered: [...o.discovered],
    };
    if (
      recent
        .slice(-100)
        .some(
          (b) =>
            b.head === board.head && b.ids.join("|") === board.ids.join("|"),
        )
    )
      continue;
    const verification = {
      states: 0,
      limit: Math.min(1500, budget.limit - budget.states),
    };
    const proof = verifyBoard(
      assets,
      board,
      o,
      verification.limit,
      verification,
    );
    budget.states += verification.states;
    if (proof) {
      board.proof = { ...proof, states: budget.states };
      return board;
    }
  }
  const fallbacks = fallbackData as Board[];
  const eligible = fallbacks.filter(
    (b) =>
      b.fallbackFor?.difficulty === o.difficulty &&
      b.fallbackFor.parity === o.round % 2,
  );
  for (const b of shuffle(eligible, random).slice(0, 10)) {
    if (b.ids.some((id) => !assets.some((a) => a.id === id))) continue;
    if (
      recent
        .slice(-100)
        .some(
          (previous) =>
            previous.head === b.head &&
            previous.ids.join("|") === b.ids.join("|"),
        )
    )
      continue;
    const board = {
      ...b,
      // Keep the CPU-policy seed used to verify the safety board.
      // The requesting seed still deterministically selects the candidate.
      seed: b.seed,
      version: GENERATOR_VERSION,
      fallback: true,
      cpuVersion: CPU_VERSION,
      initialDiscovered: [...o.discovered],
    };
    const remaining = 20000 - budget.states;
    if (remaining <= 0) break;
    const verification = { states: 0, limit: remaining };
    const proof = verifyBoard(assets, board, o, remaining, verification);
    budget.states += verification.states;
    if (proof) return { ...board, proof: { ...proof, states: budget.states } };
  }
  throw new Error(
    `盤面の安全な経路を確認できませんでした（${budget.states}状態）。seedを変えて再試行できます。`,
  );
}
