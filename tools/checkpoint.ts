import { createHash } from "node:crypto";
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
  appendFileSync,
} from "node:fs";
import { assets as candidates } from "./content-source";
import { activeAssets } from "../src/game/content";
import { CONTENT_VERSION } from "../src/game/state";
// @ts-expect-error This small runtime utility is also used by the dependency-free packager.
import { runtimeHash } from "./runtime-files.mjs";
const now = new Date().toISOString();
const hash = (b: Buffer | string) =>
  createHash("sha256").update(b).digest("hex");
let buildHash: string | null = null;
try {
  buildHash = runtimeHash();
} catch {
  /* Current source may contain new images awaiting the next build. */
}
const audit = JSON.parse(readFileSync("reports/content-audit.json", "utf8"));
const raw = readdirSync("content/originals").filter((x) =>
  /^pixel-\d{3}\.png$/.test(x),
);
const counts = {
  ...audit.counts,
  planned: candidates.length,
  generated: Math.min(candidates.length, raw.length * 16),
};
const tests = Array.from({ length: 16 }, (_, i) => ({
  id: `AT${String(i + 1).padStart(2, "0")}`,
  result: i === 0 || i === 2 ? "fail" : "not_run",
  commandOrProcedure: [
    "npm run audit",
    "全概念と近似画像の意味レビュー",
    "npm run audit",
    "contact sheets + detail review",
    "npm run test:coverage",
    "tools/stress.ts 10000 seeds × 3 difficulties",
    "tools/stress.ts 10 × 1000 rounds",
    "seed/replay tests",
    "shared-rules CPU property tests",
    "npm run test:e2e",
    "viewport/IME/keyboard/mobile test",
    "storage fault injection",
    "block all external requests, fetch every packaged image",
    "throttled benchmark and 500-round resource test",
    "job restart and hash-bound review verification",
    "30 minutes equivalent manual/AI visual play",
  ][i],
  startedAt: null,
  duration: null,
  sampleSize: null,
  seedRange: null,
  evidencePath: null,
  failureCount: null,
  notes:
    "Final 1000-asset build acceptance has not been executed; intermediate-stage evidence is separate.",
}));
const report = {
  specVersion: "1.0",
  specHash: hash(readFileSync("spec/requirements-v1.0.txt")),
  overrides: ["4 rows × 6 columns / 24 cards", "Pop pixel-art style"],
  overrideEvidence: "spec/decisions.md",
  buildHash,
  contentVersion: CONTENT_VERSION,
  generatedAt: now,
  environment: {
    platform: process.platform,
    node: process.version,
    testBrowser: "WSL Chrome 137, Firefox 157, WebKit 27.2 via Playwright",
    unavailableTests: ["physical iOS Safari", "physical virtual keyboard"],
    imageGeneration: {
      tool: "built-in image_gen.imagegen",
      model: "unknown",
      providerSeed: "unknown",
      cost: "not returned by tool",
      sourceDimensions: "1254×1254 observed",
      atlasGrid: [4, 4],
      repairAtlasGrid: [2, 2],
    },
  },
  status: "provisional",
  stage: `${activeAssets.length} reviewed assets, playable 24-card game; expansion in progress`,
  counts,
  tests,
  stageResults: {
    unitTests: {
      passed: JSON.parse(readFileSync("reports/unit-results.json", "utf8"))
        .numPassedTests,
      total: JSON.parse(readFileSync("reports/unit-results.json", "utf8"))
        .numTotalTests,
      evidence: "reports/unit-results.json",
      note: "This is an intermediate dataset run. Final build acceptance remains pending.",
    },
    browserTests512: {
      passed: 10,
      total: 10,
      evidence: ["reports/e2e-functional-512.json"],
    },
    browserTests704: {
      passed: 36,
      total: 36,
      engines: ["chromium", "firefox", "webkit"],
      evidence: ["reports/e2e-three-engines-704.json"],
    },
    stress64: {
      boards: 30000,
      rounds: 10000,
      failures: 0,
      evidence: "reports/stress-results-64.json",
    },
    stress256: {
      result: "passed",
      boards: 30000,
      rounds: 10000,
      failures: 0,
      evidence: "reports/stress-results-256-v1.json",
    },
    cpuBalance256v2: {
      rounds: 10000,
      failures: 0,
      evidence: "reports/balance-results-256-v2.json",
      note: "Deterministic random-policy simulation, not a human win-rate study",
    },
  },
  reviewCoverage: {
    reviewerType: "AI",
    method:
      "Full generated atlases; all 128px contact sheets; action/scene/part evidence inspected separately. No human review claimed.",
    totalCount: activeAssets.length,
    detailCount: activeAssets.length,
    unreviewedCount: Math.max(0, counts.generated - activeAssets.length),
    evidence: [
      "content/review.json",
      "content/semantic-reviews.jsonl",
      "reports/contact-sheet-01.png",
      "reports/contact-sheet-02.png",
      "reports/contact-sheet-03.png",
      "reports/contact-sheet-04.png",
      ...Array.from(
        { length: Math.max(0, Math.ceil(activeAssets.length / 64) - 4) },
        (_, i) => `reports/contact-sheet-${String(i + 5).padStart(2, "0")}.png`,
      ),
    ],
    disagreementHandling:
      "Questionable reads removed, four concepts regenerated, crop artifacts repaired. Native sizes and nearest-neighbour enlargement explicitly recorded.",
  },
  performance: {
    result: "intermediate_288_passed",
    evidence: [
      "reports/performance-results.json",
      "reports/resource-results.json",
      "reports/e2e-performance-after-encoding.json",
    ],
    assetBytes: audit.bytes,
    native512Count: audit.native512Count,
    notes:
      "288-asset run passed: 5/5 cold starts <=5s; 19/20 warm transitions <=1s; 520 UI rounds including20 warmup. Heap +923264 bytes, worker max1. Final full-data rerun pending. 512px details intentionally use nearest-neighbour enlargement except native repairs.",
  },
  knownIssues: [
    "1000 approved concepts and minimum 3000 readings not reached",
    "1200 candidate concept audit not yet complete",
    "Final full-data AT01–AT16 acceptance pending",
    "30-minute equivalent AI visual play not completed",
    "High-risk reading coordinates and highlighting still being completed",
    "Some non-native 512px details require final visual-quality review",
  ],
  blockers: [],
  nextActions: [
    "Finish QA and packaging of generated candidate batches without counting unreviewed images",
    "Expand content toward 1000+ unique concepts and required reading distributions",
    "Complete UI/input/save/performance regression tests",
    "Rebuild, record exact hashes, run every final acceptance gate",
  ],
  artifactPaths: {
    source: "src",
    dist: "dist",
    manifest: "content/assets.manifest.json",
    dictionary: "src/generated/content.json",
    originals: "content/originals",
    jobs: "content/jobs.jsonl",
    readme: "README.md",
    reports: "reports",
  },
};
writeFileSync(
  "reports/acceptance-report.json",
  JSON.stringify(report, null, 2),
);
const imageManifest = JSON.parse(
  readFileSync("content/image-manifest.json", "utf8"),
) as {
  assetId: string;
  source: string;
  images: Record<string, { sha256: string }>;
}[];
const jobs = candidates.map((a, i) => {
  const sheet = `content/originals/pixel-${String(Math.floor(i / 16) + 1).padStart(3, "0")}.png`;
  const m = imageManifest.find((m) => m.assetId === a.id);
  const approved = activeAssets.some((x) => x.id === a.id);
  return {
    jobId: `pixel-${a.id}`,
    assetId: a.id,
    stage: approved ? "packaged" : existsSync(sheet) ? "generated" : "planned",
    status: approved
      ? "approved"
      : existsSync(sheet)
        ? "awaiting_technicalQA"
        : "planned",
    attempts: [13, 184, 208, 252, 309, 310, 333, 334, 377, 389].includes(i + 1)
      ? 2
      : existsSync(sheet)
        ? 1
        : 0,
    inputHash: existsSync(sheet.replace(".png", "-prompt.txt"))
      ? hash(readFileSync(sheet.replace(".png", "-prompt.txt")))
      : null,
    outputHash: approved ? m?.images["256"].sha256 : null,
    source: m?.source ?? sheet,
    error: null,
    nextRetryAt: null,
    cost: null,
    usageUnit: "atlas call shared by 16 concepts; repair call shared by 4",
    observedAt: now,
  };
});
writeFileSync(
  "content/jobs.jsonl",
  jobs.map((x) => JSON.stringify(x)).join("\n") + "\n",
);
appendFileSync(
  "WORK_LOG.txt",
  `\n${now} — checkpoint: ${counts.generated} generated, ${activeAssets.length} approved concepts, ${audit.counts.approvedReadings} reading records, content ${CONTENT_VERSION}, build ${buildHash}. No release-complete claim.\n`,
);
console.log({ counts, status: report.status, stage: report.stage, buildHash });
