import { assets } from "./content-source";
import { playfulReadings, playfulWords } from "../content/playful-readings";
import { mkdirSync, writeFileSync } from "node:fs";
const rows = assets
  .filter((a) => playfulReadings[a.conceptKey])
  .map((a) => ({
    id: a.id,
    conceptKey: a.conceptKey,
    description: a.description,
    detail: a.detail,
    readings: a.readings.filter(
      (r) => r.kind === "wordplay" && playfulWords.has(r.kana),
    ),
  }));
for (const a of rows)
  if (
    a.readings.length !== 2 ||
    new Set(a.readings.map((r) => r.kana)).size !== 2
  )
    throw Error(a.id);
mkdirSync("reports/playful-review", { recursive: true });
writeFileSync(
  "reports/playful-review/prepared.json",
  JSON.stringify({ status: "prepared-not-reviewed", rows }, null, 2),
);
console.log(
  `${rows.length} illustrations / ${rows.reduce((n, a) => n + a.readings.length, 0)} new readings prepared for actual visual review.`,
);
