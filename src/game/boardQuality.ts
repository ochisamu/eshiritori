import type { Asset, ExecutableMove } from "./types";
import { legalMoves, advance, type Position } from "./rules";
export const frontMove = (m: ExecutableMove) => m.reading.kind === "basic";
export const naturalMove = (m: ExecutableMove) =>
  ["basic", "synonym"].includes(m.reading.kind) &&
  m.reading.difficulty !== "advanced";
export interface ContinuationQuality {
  samples: number;
  meanTurns: number;
  shortGames: number;
}
// Eight capped walks, never the full state graph. This is a quality sample, not a guarantee of game length.
export function continuationQuality(
  assets: readonly Asset[],
  p: Position,
  random: () => number,
  budget: { states: number; limit: number },
  frontOnly = false,
): ContinuationQuality | null {
  let sum = 0,
    shortGames = 0;
  for (let sample = 0; sample < 8; sample++) {
    let current = p,
      turns = 0;
    while (turns < 16) {
      if (budget.states >= budget.limit) return null;
      budget.states++;
      const moves = legalMoves(assets, current),
        common = moves.filter(frontOnly ? frontMove : naturalMove),
        pool = frontOnly || common.length ? common : moves;
      if (!pool.length) break;
      current = advance(current, pool[Math.floor(random() * pool.length)]);
      turns++;
    }
    sum += turns;
    if (turns <= 4) shortGames++;
  }
  return { samples: 8, meanTurns: sum / 8, shortGames };
}
