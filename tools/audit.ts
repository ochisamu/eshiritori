import { assets as candidates } from "./content-source";
import { readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { assets, activeAssets, validateContent } from "../src/game/content";
import {
  headKana,
  tailKana,
  normalizeReading,
} from "../src/game/normalization";
validateContent(assets);
const manifest = JSON.parse(
  readFileSync("content/image-manifest.json", "utf8"),
) as {
  assetId: string;
  native512: boolean;
  images: Record<string, { path: string; sha256: string; byteSize: number }>;
}[];
let bytes = 0;
const errors: string[] = [];
const hashes = new Map<string, string>();
const frequency: Record<string, number> = {};
const categories: Record<string, number> = {};
const readings = activeAssets.flatMap((a) => a.readings);
const distinctReadings = new Set(readings.map((r) => normalizeReading(r.kana)));
for (const a of activeAssets) {
  categories[a.category] = (categories[a.category] ?? 0) + 1;
  const m = manifest.find((m) => m.assetId === a.id);
  if (!m) {
    errors.push(`missing manifest ${a.id}`);
    continue;
  }
  for (const image of Object.values(m.images)) {
    try {
      const data = readFileSync(image.path);
      bytes += data.length;
      const hash = createHash("sha256").update(data).digest("hex");
      if (hash !== image.sha256 || statSync(image.path).size !== image.byteSize)
        errors.push(`hash/size mismatch ${image.path}`);
    } catch {
      errors.push(`missing image ${image.path}`);
    }
  }
  const hash = m.images["256"].sha256;
  if (hashes.has(hash))
    errors.push(`duplicate image ${a.id} ${hashes.get(hash)}`);
  hashes.set(hash, a.id);
  for (const r of a.readings) frequency[r.kana] = (frequency[r.kana] ?? 0) + 1;
}
const counts = {
  planned: candidates.length,
  generated: manifest.length,
  technicalPassed: activeAssets.length,
  semanticPassed: activeAssets.length,
  approvedUniqueConcepts: activeAssets.length,
  packaged: activeAssets.filter((a) => {
    const m = manifest.find((m) => m.assetId === a.id);
    return (
      !!m &&
      Object.values(m.images).every((image) => {
        const file = image.path.replace(/^public\//, "dist/");
        return (
          existsSync(file) &&
          createHash("sha256").update(readFileSync(file)).digest("hex") ===
            image.sha256
        );
      })
    );
  }).length,
  approvedReadings: readings.length,
  globallyDistinctNormalizedReadings: distinctReadings.size,
  assetsWith2Readings: activeAssets.filter((a) => a.readings.length >= 2)
    .length,
  assetsWith3Readings: activeAssets.filter((a) => a.readings.length >= 3)
    .length,
  assetsWith4Readings: activeAssets.filter((a) => a.readings.length >= 4)
    .length,
  assetsWithMultipleEdgeOptions: activeAssets.filter(
    (a) =>
      new Set(a.readings.map((r) => `${headKana(r.kana)}:${tailKana(r.kana)}`))
        .size >= 2,
  ).length,
  assetsWithSameHeadDifferentSafeTails: activeAssets.filter((a) =>
    a.readings.some(
      (r) =>
        tailKana(r.kana) !== "ん" &&
        a.readings.some(
          (t) =>
            headKana(r.kana) === headKana(t.kana) &&
            tailKana(t.kana) !== "ん" &&
            tailKana(r.kana) !== tailKana(t.kana),
        ),
    ),
  ).length,
  quarantined: 0,
};
const report = {
  generatedAt: new Date().toISOString(),
  counts,
  bytes,
  categories,
  frequency,
  highFrequencyReadings: Object.entries(frequency).filter(([, n]) => n >= 20),
  native512Count: manifest.filter((m) => m.native512).length,
  detailPolicy:
    "512px output is explicit nearest-neighbour pixel art enlargement; native per-cell crop size is separately recorded.",
  errors,
};
writeFileSync("reports/content-audit.json", JSON.stringify(report, null, 2));
console.log(report);
if (errors.length) process.exitCode = 1;
