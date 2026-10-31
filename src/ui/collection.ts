import type { Asset } from "../game/types";
import { discoveryProgress } from "../game/discovery";
export type CollectionFilter =
  "all" | "missing" | "found" | "complete" | "near";
export function collectionIndex(
  assets: readonly Asset[],
  known: ReadonlySet<string>,
) {
  return assets.map((asset, index) => {
    const progress = discoveryProgress(asset, known);
    return {
      asset,
      index,
      ...progress,
      status: progress.complete
        ? ("complete" as const)
        : progress.found
          ? ("found" as const)
          : ("missing" as const),
    };
  });
}
export type CollectionEntry = ReturnType<typeof collectionIndex>[number];
const normalized = (text: string) =>
  text
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 96));
export function filterCollection(
  entries: readonly CollectionEntry[],
  filter: CollectionFilter,
  query: string,
  known: ReadonlySet<string>,
  reference = false,
) {
  const q = normalized(query);
  return entries.filter((e) => {
    if (
      (filter === "missing" && e.found !== 0) ||
      (filter === "found" && e.found === 0) ||
      (filter === "complete" && !e.complete) ||
      (filter === "near" && (e.total - e.found !== 1 || e.found === 0))
    )
      return false;
    if (!q) return true;
    if (/^\d+$/.test(q)) return e.index + 1 === Number(q);
    return e.asset.readings.some(
      (r) =>
        r.reviewStatus === "approved" &&
        (reference || known.has(r.id)) &&
        (normalized(r.display).includes(q) || normalized(r.kana).includes(q)),
    );
  });
}
