import type { Asset, Reading } from "./types";
import { headKana, normalizeReading, tailKana } from "./normalization";
const ranks = {
  basic: 0,
  synonym: 1,
  part: 2,
  action: 2,
  scene: 2,
  category: 3,
  wordplay: 4,
};
export function compareReadings(a: Reading, b: Reading): number {
  return (
    ranks[a.kind] - ranks[b.kind] ||
    a.priority - b.priority ||
    a.id.localeCompare(b.id, "en")
  );
}
export interface ReadingEdge {
  reading: Reading;
  assetId: string;
  word: string;
  head: string;
  tail: string;
  natural: boolean;
}
const assetGraphs = new WeakMap<
  Asset,
  ReadonlyMap<string, readonly ReadingEdge[]>
>();
export function assetGraph(
  asset: Asset,
): ReadonlyMap<string, readonly ReadingEdge[]> {
  let graph = assetGraphs.get(asset);
  if (graph) return graph;
  const heads = new Map<string, ReadingEdge[]>();
  for (const reading of asset.readings
    .filter((r) => r.reviewStatus === "approved")
    .sort(compareReadings)) {
    const edge = {
      reading,
      assetId: asset.id,
      word: normalizeReading(reading.kana),
      head: headKana(reading.kana),
      tail: tailKana(reading.kana),
      natural:
        ["basic", "synonym"].includes(reading.kind) &&
        reading.difficulty !== "advanced",
    };
    const list = heads.get(edge.head) ?? [];
    list.push(edge);
    heads.set(edge.head, list);
  }
  assetGraphs.set(asset, heads);
  return heads;
}
export interface ReadingGraph {
  byId: ReadonlyMap<string, Asset>;
  natural: ReadonlyMap<string, readonly ReadingEdge[]>;
  front: ReadonlyMap<string, readonly ReadingEdge[]>;
  edges: number;
}
const dictionaries = new WeakMap<readonly Asset[], ReadingGraph>();
// Only dictionary edges are cached. Consumed cards/words stay in Position; no game-state tree is retained.
export function readingGraph(assets: readonly Asset[]): ReadingGraph {
  let graph = dictionaries.get(assets);
  if (graph) return graph;
  let edges = 0;
  const natural = new Map<string, ReadingEdge[]>();
  for (const asset of assets) {
    const primary: ReadingEdge[] = [];
    for (const candidates of assetGraph(asset).values()) {
      edges += candidates.length;
      // Unknown alternative readings cannot be assumed available to a tap.
      if (candidates[0]?.natural && candidates[0].tail !== "ん")
        primary.push(candidates[0]);
    }
    natural.set(asset.id, primary);
  }
  const front = new Map(
    [...natural].map(([id, edges]) => [
      id,
      edges.filter((e) => e.reading.kind === "basic"),
    ]),
  );
  graph = {
    byId: new Map(assets.map((a) => [a.id, a])),
    natural,
    front,
    edges,
  };
  dictionaries.set(assets, graph);
  return graph;
}
