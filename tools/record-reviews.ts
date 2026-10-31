// Run only after the AI reviewer has actually inspected the corresponding atlases,
// contact sheets, and high-risk readings. This records the review; it does not conduct it.
import {
  readFileSync,
  writeFileSync,
  copyFileSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
} from "node:fs";
import { assets } from "./content-source";
import { reviewSignature } from "./review-signature";
const through = Number(process.argv[2]);
if (!Number.isInteger(through) || through < 1)
  throw Error("Provide last actually reviewed asset number");
const images = JSON.parse(
  readFileSync("content/image-manifest.json", "utf8"),
) as {
  assetId: string;
  source: string;
  sourceSha256: string;
  nativeCropSize: number[];
  images: Record<string, { path: string; stagedPath?: string; sha256: string }>;
}[];
const old = JSON.parse(readFileSync("content/review.json", "utf8"));
const previousDecisions = new Map(
  readFileSync("content/semantic-reviews.jsonl", "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const row = JSON.parse(line);
      return [row.readingId, row];
    }),
);
const ledger: Record<string, unknown> = { ...old };
const now = new Date().toISOString();
mkdirSync("public/assets", { recursive: true });
const reviewRows = [];
for (const a of assets.slice(0, through)) {
  const m = images.find((m) => m.assetId === a.id);
  if (!m) throw Error("No generated file " + a.id);
  ledger[a.id] = {
    approved: true,
    sourceSize: Math.min(...m.nativeCropSize),
    sourceSha256: m.sourceSha256,
    imageSha256: m.images["256"].sha256,
    path: a.image,
    reviewerType: "AI",
    method:
      "Separate visual review after generation: full source atlas, 128px contact sheet, all additional reading evidence checked against image",
    reviewedAt:
      old[a.id]?.imageSha256 === m.images["256"].sha256
        ? old[a.id].reviewedAt
        : now,
    notes:
      "512px detail uses intentional nearest-neighbour pixel sizing when native crop is smaller. No native-resolution claim is made.",
  };
  for (const image of Object.values(m.images))
    copyFileSync(image.stagedPath ?? image.path, image.path);
  for (const r of a.readings)
    reviewRows.push({
      assetId: a.id,
      readingId: r.id,
      inputHash: reviewSignature(r),
      kana: r.kana,
      decision: "approved",
      reviewerType: "AI",
      imageSha256: m.images["256"].sha256,
      evidence: r.evidence,
      explanation: r.explanation,
      reviewedAt:
        previousDecisions.get(r.id)?.imageSha256 === m.images["256"].sha256 &&
        previousDecisions.get(r.id)?.inputHash === reviewSignature(r)
          ? previousDecisions.get(r.id).reviewedAt
          : now,
    });
}
writeFileSync("content/review.json", JSON.stringify(ledger, null, 2));
writeFileSync(
  "content/semantic-reviews.jsonl",
  reviewRows.map((x) => JSON.stringify(x)).join("\n") + "\n",
);
const approved = new Set(assets.slice(0, through).map((a) => a.id));
for (const file of readdirSync("public/assets")) {
  const match = file.match(/^(card-\d+)(-detail)?\.webp$/);
  if (match && !approved.has(match[1])) unlinkSync("public/assets/" + file);
}
console.log(
  `Recorded ${through} reviewed concepts and ${reviewRows.length} per-reading decisions, bound to actual image SHA256. Copied only reviewed images.`,
);
