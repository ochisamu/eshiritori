import type { Actor, Asset, Board, Difficulty } from "./types";
import { advance, legalMoves, type Position } from "./rules";
import { chooseCpu, CPU_VERSION, LEGACY_CPU_VERSION } from "./cpu";
import { rng, shuffle } from "./rng";
import { BOARD_SIZE, MIN_REACHABLE_CARDS } from "./config";
import fallbackData from "../../content/front-fallbacks.json" with { type: "json" };
import { readingGraph } from "./readingGraph";
import { randomOpening } from "./opening";
import { continuationQuality, naturalMove, frontMove } from "./boardQuality";
export const GENERATOR_VERSION = "graph-path-v6-diverse-front";
export const FRONT_GENERATOR_VERSION = "graph-path-v5-front-backbone";
export const LONG_PLAY_GENERATOR_VERSION = "graph-path-v4-long-play";
export const PREVIOUS_GENERATOR_VERSION = "path-first-v3-safe-fallback";
export const SUPPORTED_GENERATOR_VERSIONS = [
  GENERATOR_VERSION,
  FRONT_GENERATOR_VERSION,
  LONG_PLAY_GENERATOR_VERSION,
  PREVIOUS_GENERATOR_VERSION,
];
export interface GenerationOptions {
  cpuOpening?: boolean;
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
  naturalOnly: boolean | "front" = false,
  diversityWeights?: ReadonlyMap<string, number>,
): { path: string[]; branches: number } | null {
  if (path.length >= target && branches >= 2) return { path, branches };
  if (budget.states >= budget.limit) return null;
  budget.states++;
  const ms = shuffle(
    legalMoves(assets, p).filter(
      (m) =>
        !naturalOnly ||
        (naturalOnly === "front" ? frontMove(m) : naturalMove(m)),
    ),
    random,
  );
  if (diversityWeights) {
    const priorities = new Map(
      ms.map((m) => [
        m,
        Math.pow(random(), 1 / (diversityWeights.get(m.reading.id) ?? 1)),
      ]),
    );
    ms.sort((a, b) => priorities.get(b)! - priorities.get(a)!);
  }
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
      naturalOnly,
      diversityWeights,
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
  const opening = board.opening
    ? legalMoves(assets, p).find(
        (m) =>
          m.assetId === board.opening!.assetId &&
          m.reading.id === board.opening!.readingId,
      )
    : undefined;
  if (
    board.opening &&
    (!opening ||
      board.opening.policy !== "cpu-random-v1" ||
      !naturalMove(opening))
  )
    return null;
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
    [],
    0,
    [GENERATOR_VERSION, FRONT_GENERATOR_VERSION].includes(board.version)
      ? "front"
      : false,
  );
  if (!path) return null;
  if (o.difficulty !== "hard") {
    let firstHuman = p;
    if (opening) firstHuman = advance(p, opening);
    else if (o.round % 2 === 1) {
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
  let quality;
  if (
    [
      GENERATOR_VERSION,
      FRONT_GENERATOR_VERSION,
      LONG_PLAY_GENERATOR_VERSION,
    ].includes(board.version)
  ) {
    const preferred = [GENERATOR_VERSION, FRONT_GENERATOR_VERSION].includes(
      board.version,
    )
      ? frontMove
      : naturalMove;
    const starts = legalMoves(assets, p).filter(preferred);
    if (
      starts.length < 2 ||
      starts.some((m) => !legalMoves(assets, advance(p, m)).some(preferred))
    )
      return null;
    quality = continuationQuality(
      assets,
      p,
      rng(`${board.seed}:quality-v1`),
      budget,
      [GENERATOR_VERSION, FRONT_GENERATOR_VERSION].includes(board.version),
    );
    if (!quality || quality.meanTurns < 9 || quality.shortGames > 1)
      return null;
  }
  const win = winningPath(
    assets,
    opening ? advance(p, opening) : p,
    opening || o.round % 2 === 0 ? "player" : "cpu",
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
    playerWin: opening ? [opening.assetId, ...win] : win,
    states: budget.states,
    ...(quality ? { quality } : {}),
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
  const graph = readingGraph(assets);
  const maxStates = Math.max(0, Math.min(15000, o.maxStates ?? 15000));
  const budget = { states: 0, limit: maxStates };
  const recent = o.recent ?? [];
  const frequency = new Map<string, number>();
  recent
    .slice(-20)
    .forEach((b) =>
      b.ids.forEach((id) => frequency.set(id, (frequency.get(id) ?? 0) + 1)),
    );
  // Keep rare syllable bottlenecks possible without overfeeding them.
  // Recent exposure affects the path as well as the spare slots.
  const supply = new Map<string, number>(),
    demand = new Map<string, number>();
  for (const edges of graph.front.values())
    for (const e of edges) {
      supply.set(e.head, (supply.get(e.head) ?? 0) + 1);
      demand.set(e.tail, (demand.get(e.tail) ?? 0) + 1);
    }
  const diversityWeights = new Map<string, number>();
  for (const [id, edges] of graph.front)
    for (const e of edges) {
      const flow = Math.max(
        0.12,
        Math.min(
          2,
          Math.sqrt(
            ((supply.get(e.tail) ?? 0) + 1) / ((demand.get(e.tail) ?? 0) + 1),
          ),
        ),
      );
      diversityWeights.set(
        e.reading.id,
        flow / Math.pow(1 + (frequency.get(id) ?? 0), 1.5),
      );
    }
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
          })
            .filter(frontMove)
            .map((m) => m.assetId),
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
      [],
      0,
      "front",
      diversityWeights,
    );
    budget.states += attemptBudget.states;
    if (!path) continue;
    const ids = [...path.path];
    const starts = shuffle(legalMoves(assets, p).filter(frontMove), random);
    for (const m of starts) {
      if (!ids.includes(m.assetId)) {
        ids.push(m.assetId);
        break;
      }
    }
    // Fill spare slots with bridges between the existing natural-reading edges.
    // A bounded randomized candidate pool preserves variety without solving all game states.
    while (ids.length < BOARD_SIZE) {
      // Four free draws keep unusual pictures/alternative readings in circulation.
      if (ids.length >= BOARD_SIZE - 4) {
        ids.push(available.find((a) => !ids.includes(a.id))!.id);
        continue;
      }
      const heads = new Map<string, number>(),
        tails = new Map<string, number>();
      for (const id of ids)
        for (const e of graph.front.get(id) ?? []) {
          heads.set(e.head, (heads.get(e.head) ?? 0) + 1);
          tails.set(e.tail, (tails.get(e.tail) ?? 0) + 1);
        }
      const candidates = available
        .filter((a) => !ids.includes(a.id))
        .slice(0, 192)
        .map((a) => {
          let score = 0;
          for (const e of graph.front.get(a.id) ?? []) {
            const incoming = tails.get(e.head) ?? 0,
              outgoing = heads.get(e.tail) ?? 0;
            score +=
              Math.min(incoming, 3) * 3 +
              Math.min(outgoing, 3) * 3 +
              Math.min(incoming, outgoing, 3) * 4;
            if (incoming && !heads.has(e.head)) score += 8;
          }
          return { id: a.id, score, tie: random() };
        })
        .sort((a, b) => b.score - a.score || a.tie - b.tie);
      if (!candidates.length) break;
      const top = candidates
        .filter((c) => c.score >= candidates[0].score * 0.7)
        .slice(0, 6);
      ids.push(top[Math.floor(random() * top.length)].id);
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
    if (o.cpuOpening) {
      board.opening = randomOpening(
        assets,
        boardPosition(board),
        board.seed,
        budget,
      );
      if (!board.opening) continue;
    }
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
      b.fallbackFor.parity === (o.cpuOpening ? 1 : o.round % 2),
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
    const board: Board = {
      ...b,
      // Keep the CPU-policy seed used to verify the safety board.
      // The requesting seed still deterministically selects the candidate.
      seed: b.seed,
      version: GENERATOR_VERSION,
      fallback: true,
      cpuVersion: CPU_VERSION,
      initialDiscovered: [...o.discovered],
    };
    if (o.cpuOpening) {
      const openingBudget = { states: budget.states, limit: 20000 };
      board.opening = randomOpening(
        assets,
        boardPosition(board),
        board.seed,
        openingBudget,
      );
      budget.states = openingBudget.states;
      if (!board.opening) continue;
    }
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
