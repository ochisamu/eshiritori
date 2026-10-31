import type { Asset, Difficulty, ExecutableMove } from "./types";
import { advance, legalMoves, type Position } from "./rules";
import { rng } from "./rng";
export const CPU_VERSION = "cpu-v4-front-first";
export const LONG_PLAY_CPU_VERSION = "cpu-v3-long-play";
export const PREVIOUS_CPU_VERSION = "cpu-v2-continuation";
export const CPU_STATE_LIMITS = { easy: 192, normal: 384, hard: 768 } as const;
export const LEGACY_CPU_VERSION = "cpu-v1";
export const SUPPORTED_CPU_VERSIONS = [
  CPU_VERSION,
  LONG_PLAY_CPU_VERSION,
  PREVIOUS_CPU_VERSION,
  LEGACY_CPU_VERSION,
];
export interface CpuDecision {
  move: ExecutableMove | null;
  states: number;
  limited: boolean;
  budgetExceeded?: boolean;
}
export function chooseCpu(
  assets: readonly Asset[],
  p: Position,
  difficulty: Difficulty,
  seed: string,
  externalBudget?: { states: number; limit: number },
  policyVersion = CPU_VERSION,
): CpuDecision {
  if ([CPU_VERSION, LONG_PLAY_CPU_VERSION].includes(policyVersion))
    return chooseLongPlay(
      assets,
      p,
      difficulty,
      seed,
      externalBudget,
      policyVersion === CPU_VERSION,
    );
  const moves = legalMoves(assets, p);
  if (!moves.length) return { move: null, states: 0, limited: false };
  let states = 0,
    budgetExceeded = false;
  const limit = 5000;
  const random = rng(seed);
  const depth = difficulty === "hard" ? 4 : difficulty === "normal" ? 2 : 1;
  function search(pos: Position, d: number): number {
    if (states >= limit) return legalMoves(assets, pos).length;
    if (externalBudget && externalBudget.states >= externalBudget.limit) {
      budgetExceeded = true;
      return 0;
    }
    states++;
    if (externalBudget) externalBudget.states++;
    if (pos.usedIds.length === pos.ids.length) return -2000 - d;
    const ms = legalMoves(assets, pos);
    if (!ms.length) return -1000 - d;
    if (d === 0) return ms.length;
    let best = -Infinity;
    for (const m of ms) {
      const score = -search(advance(pos, m), d - 1);
      best = Math.max(best, score);
      if (states >= limit || budgetExceeded) break;
    }
    return best;
  }
  const scored = moves.map((move) => {
    const next = advance(p, move);
    const replies = legalMoves(assets, next).length;
    const score =
      next.usedIds.length === p.ids.length
        ? 3000
        : difficulty === "easy"
          ? replies * 4 + (move.reading.kind === "basic" ? 5 : 0)
          : -search(next, depth - 1);
    return { move, score, replies, tie: random() };
  });
  scored.sort((a, b) => b.score - a.score || a.tie - b.tie);
  const continuation = scored.filter((choice) => choice.replies > 0);
  const openingChoice =
    policyVersion === PREVIOUS_CPU_VERSION &&
    difficulty === "normal" &&
    p.usedIds.length < 6 &&
    continuation.length > 0 &&
    random() < 0.72
      ? continuation[
          Math.min(continuation.length - 1, Math.floor(random() * 2))
        ]
      : null;
  const pick =
    difficulty === "normal" &&
    scored.length > 1 &&
    scored[0].score < 900 &&
    random() < 0.18
      ? 1
      : 0;
  return {
    move: (openingChoice ?? scored[pick]).move,
    states,
    limited: states >= limit,
    ...(budgetExceeded ? { budgetExceeded: true } : {}),
  };
}

function chooseLongPlay(
  assets: readonly Asset[],
  p: Position,
  difficulty: Difficulty,
  seed: string,
  externalBudget?: { states: number; limit: number },
  frontFirst = false,
): CpuDecision {
  // Call-local immutable knowledge is shared through advance(); never retain game states.
  p = { ...p, knownReadings: new Set(p.discovered) };
  const legal = legalMoves(assets, p);
  const front = frontFirst
    ? legal.filter((m) => m.reading.kind === "basic")
    : [];
  // A safe front reading always takes priority, even if an alternative has a longer route.
  const moves = front.length ? front : legal;
  if (!moves.length) return { move: null, states: 0, limited: false };
  const limit = CPU_STATE_LIMITS[difficulty],
    random = rng(seed);
  let states = 0,
    budgetExceeded = false;
  const evaluate = (pos: Position) => {
    if (externalBudget && externalBudget.states >= externalBudget.limit) {
      budgetExceeded = true;
      return null;
    }
    if (states >= limit) return null;
    states++;
    if (externalBudget) externalBudget.states++;
    return legalMoves(assets, pos);
  };
  if (moves.length === 1) {
    evaluate(p);
    return {
      move: moves[0],
      states,
      limited: states >= limit,
      ...(budgetExceeded ? { budgetExceeded: true } : {}),
    };
  }
  const familiar = (m: ExecutableMove) =>
    (frontFirst
      ? m.reading.kind === "basic"
      : ["basic", "synonym"].includes(m.reading.kind)) &&
    m.reading.difficulty !== "advanced";
  const roots = moves
    .map((move) => ({ move, tie: random(), next: advance(p, move) }))
    .sort((a, b) => a.tie - b.tie);
  const choices: {
    move: ExecutableMove;
    next: Position;
    replies: ExecutableMove[];
    score: number;
    tie: number;
  }[] = [];
  for (const root of roots) {
    const replies = evaluate(root.next);
    if (!replies) break;
    choices.push({
      ...root,
      replies,
      score: replies.length ? 100 + replies.filter(familiar).length : 0,
    });
  }
  // Never deliberately close the exchange when an assessed continuing move exists.
  const continuing = choices.filter((c) => c.replies.length);
  const pool = (continuing.length ? continuing : choices).sort(
    (a, b) => b.score - a.score || a.tie - b.tie,
  );
  const finalists = pool.slice(
    0,
    difficulty === "easy" ? 4 : difficulty === "normal" ? 6 : 8,
  );
  const depth = difficulty === "easy" ? 4 : difficulty === "normal" ? 6 : 8;
  const share = Math.max(
    0,
    Math.floor((limit - states) / Math.max(1, finalists.length)),
  );
  for (const root of finalists) {
    const stop = Math.min(limit, states + share);
    const lengths: number[] = [];
    for (
      let sample = 0;
      sample < 2 && states < stop && !budgetExceeded;
      sample++
    ) {
      let current = root.next,
        options = root.replies,
        length = 1;
      while (
        options.length &&
        length < depth &&
        states < stop &&
        !budgetExceeded
      ) {
        const familiarMoves = options.filter(familiar);
        const cpuTurn = length % 2 === 0;
        const samplePool =
          ((frontFirst && cpuTurn) || sample === 1) && familiarMoves.length
            ? familiarMoves
            : options;
        const candidates = samplePool
          .map((move) => ({ move, tie: random() }))
          .sort((a, b) => a.tie - b.tie)
          .slice(0, 4);
        let best: {
          next: Position;
          replies: ExecutableMove[];
          score: number;
        } | null = null;
        for (const { move } of candidates) {
          if (states >= stop) break;
          const next = advance(current, move),
            replies = evaluate(next);
          if (!replies) break;
          const score =
            (replies.length ? 100 : 0) +
            replies.filter(familiar).length * 3 +
            Math.min(replies.length, 12);
          if (!best || score > best.score) best = { next, replies, score };
        }
        if (!best) break;
        current = best.next;
        options = best.replies;
        length++;
      }
      lengths.push(length);
    }
    if (lengths.length)
      root.score +=
        Math.min(...lengths) * 100 + lengths.reduce((a, b) => a + b, 0) * 50;
    if (difficulty === "easy" && familiar(root.move)) root.score += 5;
  }
  finalists.sort((a, b) => b.score - a.score || a.tie - b.tie);
  return {
    move: finalists[0]?.move ?? moves[0],
    states,
    limited: states >= limit,
    ...(budgetExceeded ? { budgetExceeded: true } : {}),
  };
}
