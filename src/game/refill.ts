import type { Asset, Board, Difficulty, GameState, Move } from "./types";
import { rng, shuffle } from "./rng";

export const REFILL_COUNTS: Record<Difficulty, number> = {
  easy: 12,
  normal: 24,
  hard: 48,
};
export const MAX_ROUND_MOVES = 72;
export function withReserve(
  board: Board,
  difficulty: Difficulty,
  assets: readonly Asset[],
): Board {
  if (board.reserve) return board;
  const candidates = assets.filter(
    (a) =>
      a.status === "approved" &&
      !board.ids.includes(a.id) &&
      (difficulty !== "easy" || a.difficulty !== "advanced"),
  );
  return {
    ...board,
    reserve: shuffle(
      candidates.map((a) => a.id),
      rng(`${board.seed}:reserve-v1:${difficulty}`),
    ).slice(0, REFILL_COUNTS[difficulty]),
  };
}
// The original board stays immutable, so a replay starts with the same hidden stack.
// A card rises into precisely the slot just consumed; cards and words never repeat.
export function boardSlots(
  board: Board | null,
  moves: readonly Move[],
): string[] {
  if (!board) return [];
  const slots = [...board.ids];
  for (let i = 0; i < Math.min(moves.length, board.reserve?.length ?? 0); i++) {
    const slot = slots.indexOf(moves[i].assetId);
    if (slot >= 0) slots[slot] = board.reserve![i];
  }
  return slots;
}
export function reserveRemaining(
  s: Pick<GameState, "board" | "moves">,
): number {
  return Math.max(0, (s.board?.reserve?.length ?? 0) - s.moves.length);
}
export const timedMode = (mode: GameState["settings"]["mode"]) =>
  mode === "standard" || mode === "refill";

export const refillMode = (mode: GameState["settings"]["mode"]) =>
  mode === "refill" || mode === "refillPractice";
