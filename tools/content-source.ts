import { validateContent } from "../src/game/contentSchema";
export { validateContent };
import { concepts } from "../content/concepts";
import review from "../content/review.json" with { type: "json" };
import inputAliases from "../content/input-aliases.json" with { type: "json" };
import { normalizeReading } from "../src/game/normalization";
import type { Asset, Reading, ReadingKind } from "../src/game/types";
import { readFileSync, existsSync } from "node:fs";
import { reviewSignature, readingIdentity } from "./review-signature";
import visibleElements from "../content/visible-elements.json" with { type: "json" };
import editorial from "../content/editorial-difficulty.json" with { type: "json" };
import { playfulWords } from "../content/playful-readings";
import policyData from "../content/reading-policy.json" with { type: "json" };
const readingPolicy = policyData.panels as Record<
  string,
  {
    alternatives: string[];
    additions: { kana: string; kind: ReadingKind; explanation: string }[];
  }
>;
const semanticPath = "content/semantic-reviews.jsonl";
const semanticRows = existsSync(semanticPath)
  ? readFileSync(semanticPath, "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((s) => JSON.parse(s))
  : [];
const semantic = new Map(semanticRows.map((r) => [r.readingId, r]));
const reviewed = review as Record<
  string,
  { approved: boolean; sourceSize: number; path: string; imageSha256?: string }
>;

export const assets: Asset[] = concepts.map(
  ([key, category, basic, description, extras], i) => {
    const id = `card-${String(i + 1).padStart(4, "0")}`;
    const qa = reviewed[id];
    const policy = readingPolicy[id];
    if (qa?.approved && !policy)
      throw Error(`Missing editorial review for ${id}`);
    const readings: Reading[] = [
      `${basic}:basic:${description}`,
      ...extras,
      ...(policy?.additions.map(
        (r) => `${r.kana}:${r.kind}:${r.explanation}`,
      ) ?? []),
    ].map((entry, j) => {
      const [kana, kind, explanation] = entry.split(":");
      const added =
        policy?.additions.some((r) => r.kana === normalizeReading(kana)) ??
        false;
      return {
        id: readingIdentity(id, normalizeReading(kana)),
        display: kana,
        kana: normalizeReading(kana),
        kind: kind as ReadingKind,
        difficulty:
          j === 0
            ? (editorial.advancedAssets as Record<string, string>)[id]
              ? "advanced"
              : "common"
            : editorial.advancedReadings.includes(normalizeReading(kana)) ||
                (kind === "wordplay" &&
                  (playfulWords.has(normalizeReading(kana)) || added))
              ? "advanced"
              : "additional",
        priority: j,
        explanation,
        evidence: j === 0 ? description : explanation,
        hints: [
          description,
          kind === "part"
            ? "絵の一部分にも注目してみよう。"
            : kind === "action"
              ? "何をしているか、動きに注目してみよう。"
              : "いつもの呼び名以外にも、見方を変えてみよう。",
          kana,
        ],
        aliases: (inputAliases as Record<string, string[]>)[kana] ?? [],
        element:
          (
            visibleElements as Record<
              string,
              Record<string, Reading["element"]>
            >
          )[id]?.[normalizeReading(kana)] ??
          (added ||
          (j === 0 &&
            (editorial.advancedAssets as Record<string, string>)[id]) ||
          (kind === "wordplay" &&
            (playfulWords.has(normalizeReading(kana)) || added))
            ? { x: 0.08, y: 0.08, w: 0.84, h: 0.84 }
            : undefined),
        reviewStatus: qa?.approved ? "approved" : "draft",
      };
    });
    for (const r of readings) {
      const row = semantic.get(r.id);
      r.reviewStatus =
        qa?.approved &&
        (!policy ||
          r.kind === "basic" ||
          policy.alternatives.includes(r.kana) ||
          policy.additions.some((x) => x.kana === r.kana)) &&
        row?.decision === "approved" &&
        row.imageSha256 === qa.imageSha256 &&
        row.inputHash === reviewSignature(r)
          ? "approved"
          : "draft";
    }
    return {
      id,
      difficulty: (editorial.advancedAssets as Record<string, string>)[id]
        ? "advanced"
        : "common",
      conceptKey: key,
      category,
      description,
      image: `./assets/${id}.webp`,
      detail: `./assets/${id}-detail.webp`,
      readings,
      status: qa?.approved ? "approved" : "provisional",
      sourceSize: qa?.sourceSize ?? 0,
    };
  },
);
validateContent(assets);
for (const [id, byWord] of Object.entries(visibleElements))
  for (const word of Object.keys(byWord))
    if (!assets.find((a) => a.id === id)?.readings.some((r) => r.kana === word))
      throw Error(`Evidence bounds reference a missing reading ${id}:${word}`);
export const activeAssets = assets.filter((a) => a.status === "approved");
