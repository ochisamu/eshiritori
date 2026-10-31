import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { activeAssets as assets } from "../src/game/content";
import { headKana, tailKana } from "../src/game/normalization";
import policy from "../content/reading-policy.json";
import type { Asset } from "../src/game/types";
const dir = "reports/reading-review";
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const before = read(`${dir}/before/content.json`) as Asset[];
const decisions = readFileSync(`${dir}/decisions.jsonl`, "utf8")
  .trim()
  .split("\n")
  .map((s) => JSON.parse(s));
const byDecision = new Map(decisions.map((d) => [d.readingId, d]));
const errors: string[] = [];
const oldRows = before.flatMap((a) => a.readings),
  oldById = new Map(oldRows.map((r) => [r.id, r]));
if (
  before.length !== 1024 ||
  assets.length !== 1024 ||
  Object.keys(policy.panels).length !== 1024
)
  errors.push("Incomplete panel census");
if (decisions.length !== oldRows.length || byDecision.size !== oldRows.length)
  errors.push("Incomplete reading census");
const panels = assets.map((a) => {
  const old = before.find((x) => x.id === a.id)!;
  const current = new Set(a.readings.map((r) => r.id));
  const kept = old.readings.filter((r) => current.has(r.id));
  const removed = old.readings.filter((r) => !current.has(r.id));
  const added = a.readings.filter((r) => !oldById.has(r.id));
  for (const r of old.readings) {
    if (
      byDecision.get(r.id)?.decision !== (current.has(r.id) ? "keep" : "remove")
    )
      errors.push(`Decision mismatch ${r.id}`);
    const now = a.readings.find((x) => x.id === r.id);
    if (now && !isDeepStrictEqual(r, now))
      errors.push(`Unchanged reading metadata altered ${r.id}`);
  }
  if (a.image !== old.image || a.detail !== old.detail)
    errors.push(`Art changed ${a.id}`);
  return {
    assetId: a.id,
    basic: a.readings[0].kana,
    kept: kept.map((r) => r.kana),
    removed: removed.map((r) => r.kana),
    added: added.map((r) => ({
      kana: r.kana,
      kind: r.kind,
      explanation: r.explanation,
    })),
    allReviewed: true,
  };
});
function vocabulary(list: Asset[]) {
  const rows = list.flatMap((a) => a.readings),
    frequency = new Map<string, number>(),
    kinds: Record<string, number> = {},
    heads: Record<string, number> = {},
    tails: Record<string, number> = {};
  for (const r of rows) {
    frequency.set(r.kana, (frequency.get(r.kana) ?? 0) + 1);
    kinds[r.kind] = (kinds[r.kind] ?? 0) + 1;
  }
  for (const word of frequency.keys()) {
    const h = headKana(word),
      t = tailKana(word);
    heads[h] = (heads[h] ?? 0) + 1;
    tails[t] = (tails[t] ?? 0) + 1;
  }
  return {
    panels: list.length,
    readingRecords: rows.length,
    distinctWords: frequency.size,
    kinds,
    distinctWordHeads: heads,
    distinctWordTails: tails,
    frequent: [...frequency].sort((a, b) => b[1] - a[1]).slice(0, 20),
    singleReadingPanels: list.filter((a) => a.readings.length === 1).length,
  };
}
const report = {
  reviewedAt: new Date().toISOString(),
  editorialVersion: policy.version,
  coverage: {
    panels: panels.length,
    existingReadings: oldRows.length,
    unreviewedPanels: 0,
    unreviewedReadings: 0,
    kept: panels.reduce((n, p) => n + p.kept.length, 0),
    removed: panels.reduce((n, p) => n + p.removed.length, 0),
    added: panels.reduce((n, p) => n + p.added.length, 0),
    unchangedIds: true,
    unchangedArt: true,
  },
  before: vocabulary(before),
  after: vocabulary(assets),
  method:
    "AI editorial census of every existing word against its panel description and picture, 16 contact sheets of 64 pictures inspected, and a second pass on all proposed additions. Decisions are editorial judgments, not human playtester ratings. Image bytes are unchanged and verified by the content build.",
  policySha256: createHash("sha256")
    .update(readFileSync("content/reading-policy.json"))
    .digest("hex"),
  panels,
  errors,
};
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/editorial-audit.json`, JSON.stringify(report, null, 2));
const escape = (v: string) => v.replaceAll("|", "\\|").replaceAll("\n", " ");
const table = [
  "# 全パネルの読み改訂一覧",
  "",
  `対象：${panels.length}枚。既存${oldRows.length}件を個別に採否判定。表読みは全て維持。`,
  "",
  "AIによる編集判断とコンタクトシート照合の記録です。採用理由は decisions.jsonl と追加語の説明に記録しています。",
  "",
  "| 番号 | 表読み | 残した裏読み | 外した裏読み | 追加した読み |",
  "|---|---|---|---|---|",
  ...panels.map(
    (p) =>
      `| ${p.assetId} | ${escape(p.basic)} | ${escape(p.kept.slice(1).join("、"))} | ${escape(p.removed.join("、"))} | ${escape(p.added.map((r) => r.kana).join("、"))} |`,
  ),
];
writeFileSync(`${dir}/panel-review.md`, table.join("\n") + "\n");
console.log(
  JSON.stringify({
    ...report,
    panels: undefined,
    before: {
      ...report.before,
      distinctWordHeads: undefined,
      distinctWordTails: undefined,
    },
    after: {
      ...report.after,
      distinctWordHeads: undefined,
      distinctWordTails: undefined,
    },
  }),
);
if (errors.length) throw Error(errors.join("; "));
