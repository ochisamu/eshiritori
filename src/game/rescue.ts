import type { Asset } from "./types";
import { legalMoves, advance, type Position } from "./rules";
import { readingGraph } from "./readingGraph";
import { headKana } from "./normalization";
import { rng, shuffle } from "./rng";
// Inspect current board only. No game-state tree is built.
export function rescueHead(
  assets: readonly Asset[],
  p: Position,
  seed: string,
): string | undefined {
  const graph = readingGraph(assets),
    heads = new Set<string>();
  for (const id of p.ids)
    if (!p.usedIds.includes(id)) {
      const asset = graph.byId.get(id);
      for (const reading of asset?.readings ?? [])
        if (reading.reviewStatus === "approved")
          heads.add(headKana(reading.kana));
    }
  const available = shuffle([...heads], rng(seed))
    .map((head) => ({ head, moves: legalMoves(assets, { ...p, head }) }))
    .filter((c) => c.moves.length);
  const front = available.filter((c) =>
    c.moves.some((m) => m.reading.kind === "basic"),
  );
  if (!front.length) return available[0]?.head;
  // Prefer a restart with another ordinary answer after it. One extra ply over
  // the live 24 slots only; no game tree, hidden reserve lookup or altered draw.
  const ranked = front
    .map((candidate) => {
      let score = 0;
      for (const move of candidate.moves.filter(
        (m) => m.reading.kind === "basic",
      )) {
        const replies = legalMoves(
          assets,
          advance({ ...p, head: candidate.head }, move),
        ).filter((m) => m.reading.kind === "basic").length;
        score = Math.max(score, Math.min(replies, 4));
      }
      return { head: candidate.head, score };
    })
    .sort((a, b) => b.score - a.score);
  // Seeded shuffle above keeps equally useful starts varied and reproducible.
  return ranked[0]?.head;
}
