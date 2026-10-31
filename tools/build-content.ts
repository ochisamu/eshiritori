import {
  readFileSync,
  writeFileSync,
  renameSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { assets, validateContent } from "./content-source";
import editorial from "../content/editorial-difficulty.json" with { type: "json" };
import {
  headKana,
  tailKana,
  normalizeReading,
} from "../src/game/normalization";
const approved = assets
  .filter(
    (a) =>
      a.status === "approved" &&
      a.readings.some(
        (r) => r.kind === "basic" && r.reviewStatus === "approved",
      ),
  )
  .map((a) => ({
    ...a,
    readings: a.readings.filter((r) => r.reviewStatus === "approved"),
  }));
validateContent(approved);
mkdirSync("src/generated", { recursive: true });
for (const a of approved)
  for (const path of [a.image, a.detail])
    if (!existsSync("public/" + path.replace("./", "")))
      throw Error(`Missing approved image ${a.id}: ${path}`);
const images = JSON.parse(
  readFileSync("content/image-manifest.json", "utf8"),
) as {
  assetId: string;
  source: string;
  sourceSha256: string;
  nativeCropSize: number[];
  images: Record<string, { sha256: string; path: string }>;
}[];
const ledger = JSON.parse(readFileSync("content/review.json", "utf8"));
for (const a of approved) {
  const m = images.find((m) => m.assetId === a.id);
  if (!m || ledger[a.id]?.imageSha256 !== m.images["256"]?.sha256)
    throw Error(`Visual QA invalidated by changed image: ${a.id}`);
}
for (const a of approved)
  for (const m of Object.values(images.find((m) => m.assetId === a.id)!.images))
    if (
      createHash("sha256").update(readFileSync(m.path)).digest("hex") !==
      m.sha256
    )
      throw Error(`Image hash mismatch ${m.path}`);
function atomic(path: string, value: unknown) {
  writeFileSync(path + ".tmp", JSON.stringify(value));
  renameSync(path + ".tmp", path);
}
const runtime = approved.map((a) => {
  const m = images.find((m) => m.assetId === a.id)!;
  return {
    ...a,
    image: a.image + "?v=" + m.images["256"].sha256.slice(0, 12),
    thumbnail: m.images["128"]
      ? "./assets/" +
        a.id +
        "-small.webp?v=" +
        m.images["128"].sha256.slice(0, 12)
      : undefined,
    preview: m.images["96"]
      ? "./assets/" +
        a.id +
        "-tiny.webp?v=" +
        m.images["96"].sha256.slice(0, 12)
      : undefined,
    detail: a.detail + "?v=" + m.images["512"].sha256.slice(0, 12),
  };
});
const contentVersion =
  "pixel-" +
  createHash("sha256")
    .update(JSON.stringify(runtime))
    .update(readFileSync("content/fallbacks.json"))
    .digest("hex")
    .slice(0, 12);
const migrations: Record<string, string> = existsSync(
  "src/generated/reading-migrations.json",
)
  ? JSON.parse(readFileSync("src/generated/reading-migrations.json", "utf8"))
  : {};
if (existsSync("src/generated/content.json")) {
  const previous = JSON.parse(
    readFileSync("src/generated/content.json", "utf8"),
  ) as typeof approved;
  for (const a of previous) {
    const current = runtime.find((b) => b.id === a.id);
    for (const r of a.readings) {
      const replacement = current?.readings.find((t) => t.kana === r.kana);
      if (replacement && replacement.id !== r.id)
        migrations[r.id] = replacement.id;
    }
  }
}
const full = approved.map((a) => {
  const image = images.find((m) => m.assetId === a.id)!;
  const promptPath = image.source.replace(".png", "-prompt.txt");
  const prompt = readFileSync(promptPath);
  return {
    schemaVersion: 1,
    contentVersion,
    assetId: a.id,
    conceptKey: a.conceptKey,
    category: a.category,
    difficulty: (editorial.advancedAssets as Record<string, string>)[a.id]
      ? "advanced"
      : "common",
    difficultyReason:
      (editorial.advancedAssets as Record<string, string>)[a.id] ??
      "生活・学校・遊びで使う一般的な名称と判断。AIによる編集評価。",
    difficultyAssessmentMethod: editorial.method,
    status: "approved",
    active: true,
    displayDescription: a.description,
    altDescription: a.description,
    editorialPriority: 0,
    visibleElements: a.readings.map((r) => ({
      visibleElementId: r.id,
      description: r.evidence,
      bounds: r.element ?? null,
    })),
    imagePaths: { board: a.image, detail: a.detail },
    imageMetadata: image,
    readings: a.readings.map((r) => ({
      ...r,
      readingId: r.id,
      normalized: normalizeReading(r.kana),
      head: headKana(r.kana),
      tail: tailKana(r.kana),
      terminal: tailKana(r.kana) === "ん",
      editorialPriority: r.priority,
      inputAliases: r.aliases,
      visibleElementIds: [r.id],
      // Preserve the reviewed source classification, including authored wordplay.
      // Reclassifying here would make the audit manifest disagree with runtime.
      difficulty: r.difficulty,
      reviewerType: "AI",
    })),
    provenance: {
      provider: "built-in image_gen.imagegen",
      model: "unknown",
      providerSeed: "unknown",
      providerJobId: "unknown",
      productionJobId: image.source,
      promptVersion: "pixel-pop-v1",
      promptPath,
      promptSha256: createHash("sha256").update(prompt).digest("hex"),
      original: image.source,
      originalSha256: image.sourceSha256,
      referenceSource:
        "Original text prompts; edits may reference this project's generated sprites. No third-party reference art.",
      transformations: [
        "connected-silhouette-guided crop",
        "11% clear margin each side",
        "nearest-neighbour pixel-art sizing",
        "64-colour palette for board image; full-colour detail",
        "lossless WebP",
      ],
      terms:
        "Built-in generation within provided account access; no external API or new payment configured",
    },
    qa: ledger[a.id],
  };
});
for (const a of full)
  for (const r of a.readings)
    if (r.difficulty === "advanced" && !r.element)
      throw Error(
        `Advanced reading needs reviewed evidence bounds: ${a.assetId}:${r.kana}`,
      );
// Complete every source/provenance validation before replacing any generated output.
atomic("src/generated/reading-migrations.json", migrations);
atomic("src/generated/content.json", runtime);
atomic("src/generated/version.json", { version: contentVersion });
atomic("content/assets.manifest.json", full);
console.log(
  `Runtime: ${approved.length} approved assets, ${approved.reduce((n, a) => n + a.readings.length, 0)} reading records. Draft concepts/provenance excluded from runtime index.`,
);
