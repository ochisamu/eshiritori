import type { Move } from "./types";
// Presentation only: game clocks remain stopped while resolving a move.
export function answerDisplayDuration(
  move: Pick<Move, "kind" | "discovery"> | null,
): number {
  if (move?.discovery === "complete") return 2500;
  return move && (move.kind !== "basic" || move.discovery) ? 2200 : 1600;
}
