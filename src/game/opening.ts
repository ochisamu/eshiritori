import { advance, legalMoves, type Position } from "./rules";
import { rng, shuffle } from "./rng";
import { frontMove } from "./boardQuality";
import type { Asset, Board } from "./types";

// Only one tap reading per card is considered: at most 24 shallow reply checks.
export function randomOpening(
  assets: readonly Asset[],
  p: Position,
  seed: string,
  budget: { states: number; limit: number },
): Board["opening"] {
  const choices = shuffle(
    legalMoves(assets, p).filter((m) => !m.explicit && frontMove(m)),
    rng(`${seed}:opening-v1`),
  );
  for (const move of choices) {
    if (budget.states >= budget.limit) return;
    budget.states++;
    if (legalMoves(assets, advance(p, move)).some(frontMove))
      return {
        policy: "cpu-random-v1",
        assetId: move.assetId,
        readingId: move.reading.id,
      };
  }
}
