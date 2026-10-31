import taxonomyData from "../../content/taxonomy.json" with { type: "json" };
import { headKana, normalizeReading, tailKana } from "./normalization";
import type { Asset } from "./types";
const taxonomy = new Set(Object.keys(taxonomyData));
export function validateContent(data: readonly Asset[]): void {
  if (
    new Set(data.map((a) => a.id)).size !== data.length ||
    new Set(data.map((a) => a.conceptKey)).size !== data.length
  )
    throw new Error("Duplicate asset/concept");
  const readingIds = new Set<string>();
  for (const a of data) {
    if (
      !a.id ||
      !a.conceptKey ||
      !a.description ||
      !a.image ||
      !a.detail ||
      !Array.isArray(a.readings) ||
      !a.readings.length
    )
      throw Error("Invalid asset shape");
    const seen = new Set<string>();
    let categories = 0;
    for (const r of a.readings) {
      if (
        normalizeReading(r.kana) !== r.kana ||
        seen.has(r.kana) ||
        readingIds.has(r.id) ||
        !r.explanation ||
        !r.evidence ||
        !Array.isArray(r.hints) ||
        r.hints.length !== 3 ||
        !Number.isFinite(r.priority) ||
        ![
          "basic",
          "synonym",
          "part",
          "action",
          "scene",
          "category",
          "wordplay",
        ].includes(r.kind)
      )
        throw new Error(`Invalid reading ${r.id}`);
      seen.add(r.kana);
      if (r.element) {
        const e = r.element;
        if (
          ![e.x, e.y, e.w, e.h].every(Number.isFinite) ||
          e.x < 0 ||
          e.y < 0 ||
          e.w <= 0 ||
          e.h <= 0 ||
          e.x + e.w > 1 ||
          e.y + e.h > 1
        )
          throw Error(`Invalid evidence bounds ${r.id}`);
      }
      readingIds.add(r.id);
      headKana(r.kana);
      tailKana(r.kana);
      if (r.kind === "category") {
        categories++;
        if (!taxonomy.has(r.kana))
          throw new Error(`Unapproved taxonomy ${r.kana}`);
      }
    }
    if (categories > 1) throw new Error(`Multiple categories on ${a.id}`);
  }
}

export function validateDistinctReadingHeads(data: readonly Asset[]): void {
  for (const asset of data) {
    const seen = new Map<string, string>();
    for (const reading of asset.readings) {
      const head = headKana(reading.kana);
      if (seen.has(head))
        throw Error(
          "Duplicate reading head " +
            asset.id +
            ":" +
            head +
            " (" +
            seen.get(head) +
            ", " +
            reading.kana +
            ")",
        );
      seen.set(head, reading.kana);
    }
  }
}
