import { writeFileSync } from "node:fs";
import { assets as candidates } from "./content-source";
import { activeAssets as approved } from "../src/game/content";
import { reserveCandidates } from "../content/reserve-candidates";
import { headKana, tailKana } from "../src/game/normalization";
const range = (a: number, b: number) =>
  Array.from({ length: b - a + 1 }, (_, i) => a + i);
const defs: [string, number, number[]][] = [
  ["boat-and-boat-scenes", 14, [59, 75, 76, 77, 277, ...range(536, 542), 551]],
  [
    "rail-vehicles-and-infrastructure",
    12,
    [66, 67, 171, 548, ...range(529, 532), 814],
  ],
  ["bread-and-baking", 10, [113, 114, 174, 187, 293, 300, 798]],
  ["egg-dishes-and-preparation", 8, [127, 128, 303, 795, 796]],
  ["noodle-dishes", 6, [121, 122, 123, 486]],
  ["tea-coffee-and-serving", 8, [13, 301, 327, 328, 332, 502]],
  ["brushes-and-brushing", 10, [102, 257, 260, 738, 877, 881, 889]],
  ["timepieces-and-maintenance", 8, [39, 288, 604, 605, 966]],
  ["laundry-and-laundry-equipment", 10, [206, 270, 271, 370, 742, 743, 744]],
  ["vacuum-and-vacuuming", 3, [266, 374]],
  ["bowed-string-instruments", 4, [202, 847, 848]],
  ["plucked-neck-string-instruments", 7, [52, 842, 843, 844, 845, 846]],
  ["drums-and-drumming", 6, [241, 555, 860, 861, 862]],
  ["pitched-bar-percussion", 3, [243, 850]],
  [
    "wind-instruments",
    16,
    [18, 244, ...range(833, 839), 856, 857, 858, 859, 864],
  ],
  ["keyboard-musical-instruments", 3, [242, 849]],
  ["headwear-and-paper-headwear", 6, [43, 870, 891, 961]],
  ["fishing-and-fishing-work", 5, [182, 194, 538]],
  ["flowers", 28, [4, 5, 129, ...range(134, 139), ...range(609, 621)]],
  ["amphibians-and-growth-stage", 6, [710, 711, 712, 713]],
  ["eye-and-face-optical-devices", 7, [29, 94, 95, 96, 256, 607, 608]],
  ["enclosed-storage-boxes", 8, [691, 764, 984, 1014, 1024]],
  ["towels-and-towel-care", 4, [106, 271]],
  ["folded-paper-models", 6, [210, 276, 277, 890, 891]],
  ["chairs-and-benches", 8, [40, 361, 362, 822]],
  [
    "balls-and-ball-sports",
    12,
    [32, 249, 305, 306, 307, 308, 309, 310, 311, 312],
  ],
  ["brooms-and-manual-cleaning", 8, [88, 89, 205, 267, 268, 272]],
  ["bean-and-nut-pods", 10, [28, 140, 141, ...range(923, 927)]],
  ["swords-and-sword-roles", 7, [189, 565, 564, 977, 979]],
  ["fire-and-fire-scenes", 7, [16, 63, 157, 638, 949, 1020, 1022]],
  ["keys-locks-and-unlocking", 5, [97, 98, 946]],
  ["fans-and-fanning-devices", 5, [373, 893, 894]],
  ["insects-beetles", 8, [239, 735, 736, 907]],
  ["canine-fox-raccoon-like-mammals", 8, [33, 50, 53, 993, 994, 995]],
  ["long-bodied-small-mammals", 6, [432, 996, 997, 1005]],
];
const id = (n: number) => `card-${String(n).padStart(4, "0")}`;
const groups = defs.map(([name, cap, ids]) => ({
  name,
  cap,
  members: ids.map(id).filter((id) => approved.some((a) => a.id === id)),
}));
const assigned = new Set(groups.flatMap((g) => g.members));
for (const a of approved)
  if (!assigned.has(a.id))
    groups.push({ name: `distinct:${a.conceptKey}`, cap: 1, members: [a.id] });
const common = approved.filter((a) => a.difficulty !== "advanced").length;
const reasons = new Map(reserveCandidates.map((c) => [c.key, c.reason]));
const full = candidates.map((a) => ({
  assetId: a.id,
  conceptKey: a.conceptKey,
  basic: a.readings[0].kana,
  category: a.category,
  status:
    a.status === "approved"
      ? "selected_and_reviewed"
      : "not_selected_preproduction",
  selectionReason:
    a.status === "approved"
      ? "Distinct depicted central object/action; actual art and reading review is bound to SHA256 in the review ledgers."
      : reasons.get(a.conceptKey),
  groups: groups.filter((g) => g.members.includes(a.id)).map((g) => g.name),
  heads: [...new Set(a.readings.map((r) => headKana(r.kana)))],
  tails: [...new Set(a.readings.map((r) => tailKana(r.kana)))],
}));
const frequency = new Map<string, typeof approved>();
for (const a of approved)
  for (const r of a.readings) {
    const cases = frequency.get(r.kana) ?? [];
    cases.push(a);
    frequency.set(r.kana, cases);
  }
const highFrequency = [...frequency]
  .filter(([, as]) => as.length >= 20)
  .map(([word, as]) => ({
    word,
    count: as.length,
    cases: as.map((a) => {
      const r = a.readings.find((r) => r.kana === word)!;
      return {
        assetId: a.id,
        kind: r.kind,
        evidence: r.evidence,
        readingId: r.id,
      };
    }),
    review:
      "Each case is a separate visible object/part/action verified in the per-reading image-bound semantic ledger; repeated word can be used only once per round.",
  }));
const errors: string[] = [];
if (candidates.length < 1200) errors.push("Fewer than 1200 named candidates");
if (common / approved.length < 0.7)
  errors.push("Fewer than 70% common primary readings");
for (const g of groups)
  if (g.members.length > g.cap)
    errors.push("Concept group cap exceeded " + g.name);
const report = {
  generatedAt: new Date().toISOString(),
  reviewerType: "AI",
  method:
    "Editorial central-object/action groups with explicit caps plus per-concept singleton records. Not a human vocabulary survey; no art review is claimed for the 176 unselected preproduction candidates.",
  candidateCount: candidates.length,
  selected: approved.length,
  commonPrimary: common,
  commonPrimaryRatio: common / approved.length,
  advancedPrimary: approved.length - common,
  groups,
  highFrequency,
  candidates: full,
  errors,
};
writeFileSync("reports/editorial-audit.json", JSON.stringify(report, null, 2));
console.log({
  candidates: candidates.length,
  selected: approved.length,
  commonRatio: report.commonPrimaryRatio,
  groups: groups.length,
  highFrequency: highFrequency.length,
  errors,
});
if (errors.length) process.exitCode = 1;
