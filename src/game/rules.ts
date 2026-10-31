import { headKana, normalizeReading, tailKana } from "./normalization";
import type { Asset, ExecutableMove, Reading } from "./types";
import { assetGraph, readingGraph } from "./readingGraph";
export { compareReadings } from "./readingGraph";
export interface Position {
  knownReadings?: ReadonlySet<string>;
  reserve?: readonly string[];
  ids: string[];
  head: string;
  usedIds: string[];
  usedWords: string[];
  discovered: string[];
}
export function safeReadings(asset: Asset, p: Position): Reading[] {
  return (assetGraph(asset).get(p.head) ?? [])
    .filter((e) => e.tail !== "ん" && !p.usedWords.includes(e.word))
    .map((e) => e.reading);
}
export function tapReading(asset: Asset, p: Position): Reading | undefined {
  if (p.usedIds.includes(asset.id) || !p.ids.includes(asset.id)) return;
  return assetGraph(asset)
    .get(p.head)
    ?.find((e) => !p.usedWords.includes(e.word))?.reading;
}
export function legalMoves(
  assets: readonly Asset[],
  p: Position,
): ExecutableMove[] {
  const index = readingGraph(assets).byId;
  const usedIds = new Set(p.usedIds),
    usedWords = new Set(p.usedWords),
    known = p.knownReadings ?? new Set(p.discovered);
  const output: ExecutableMove[] = [];
  for (const id of p.ids) {
    if (usedIds.has(id)) continue;
    const asset = index.get(id);
    if (!asset) continue;
    // Membership in p.ids is already established by this loop; do not rescan all IDs per asset.
    const edges = assetGraph(asset).get(p.head) ?? [],
      tap = edges.find((e) => !usedWords.has(e.word));
    if (!tap) continue;
    if (tap.tail !== "ん")
      output.push({ assetId: id, reading: tap.reading, explicit: false });
    for (const edge of edges)
      if (
        edge !== tap &&
        edge.tail !== "ん" &&
        !usedWords.has(edge.word) &&
        known.has(edge.reading.id)
      )
        output.push({ assetId: id, reading: edge.reading, explicit: true });
  }
  return output;
}
export function advance(p: Position, m: ExecutableMove): Position {
  return {
    ...p,
    ids:
      p.reserve && p.usedIds.length < p.reserve.length
        ? p.ids.map((id) =>
            id === m.assetId ? p.reserve![p.usedIds.length] : id,
          )
        : p.ids,
    ...(p.knownReadings
      ? {
          knownReadings: p.knownReadings.has(m.reading.id)
            ? p.knownReadings
            : new Set([...p.knownReadings, m.reading.id]),
        }
      : {}),
    head: tailKana(m.reading.kana),
    usedIds: [...p.usedIds, m.assetId],
    usedWords: [...p.usedWords, normalizeReading(m.reading.kana)],
    discovered: p.discovered.includes(m.reading.id)
      ? p.discovered
      : [...p.discovered, m.reading.id],
  };
}
export type Validation =
  | { ok: true; reading: Reading; terminal: boolean }
  | { ok: false; reason: string };
export function validateMove(
  asset: Asset | undefined,
  p: Position,
  choice?: { readingId?: string; input?: string },
  allowHidden = false,
): Validation {
  if (!asset || !p.ids.includes(asset.id))
    return { ok: false, reason: "この札は盤面にありません" };
  if (p.usedIds.includes(asset.id))
    return { ok: false, reason: "この札はもう使いました" };
  let reading: Reading | undefined;
  if (choice?.input !== undefined) {
    try {
      const aliases: Record<string, string> = {};
      for (const r of asset.readings)
        for (const a of r.aliases) {
          const k = a
            .normalize("NFKC")
            .trim()
            .replace(/[ァ-ヶ]/g, (c) =>
              String.fromCharCode(c.charCodeAt(0) - 96),
            );
          aliases[k] = r.kana;
        }
      const word = normalizeReading(choice.input, aliases);
      reading = asset.readings.find(
        (r) =>
          r.reviewStatus === "approved" && normalizeReading(r.kana) === word,
      );
    } catch (e) {
      return { ok: false, reason: (e as Error).message };
    }
  } else if (choice?.readingId) {
    reading = asset.readings.find(
      (r) =>
        r.id === choice.readingId &&
        r.reviewStatus === "approved" &&
        (allowHidden ||
          p.discovered.includes(r.id) ||
          tapReading(asset, p)?.id === r.id),
    );
  } else reading = tapReading(asset, p);
  if (!reading)
    return {
      ok: false,
      reason: `「${p.head}」からつながる読みが見つかりません`,
    };
  if (p.usedWords.includes(normalizeReading(reading.kana)))
    return { ok: false, reason: "その言葉はもう使いました" };
  if (headKana(reading.kana) !== p.head)
    return { ok: false, reason: `いまは「${p.head}」からです` };
  return { ok: true, reading, terminal: tailKana(reading.kana) === "ん" };
}
