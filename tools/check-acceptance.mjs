import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {runtimeHash} from './runtime-files.mjs';
const path = "reports/acceptance-report.json";
const r = JSON.parse(readFileSync(path, "utf8"));
const c = r.counts;
const errors = [];
const manifest = JSON.parse(
  readFileSync("content/assets.manifest.json", "utf8"),
);
const actual = manifest.filter((a) => a.status === "approved" && a.active);
if (
  new Set(actual.map((a) => a.assetId)).size !== actual.length ||
  new Set(actual.map((a) => a.conceptKey)).size !== actual.length
)
  errors.push("Duplicate asset/concept in actual manifest");
if (actual.length !== c.approvedUniqueConcepts)
  errors.push("Report count disagrees with actual manifest");
if (actual.reduce((n, a) => n + a.readings.length, 0) !== c.approvedReadings)
  errors.push("Report reading count disagrees with actual dictionary");
const hashes = new Set();
for (const a of actual) {
  for (const m of Object.values(a.imageMetadata.images)) {
    try {
      const h = createHash("sha256").update(readFileSync(m.path)).digest("hex");
      if (h !== m.sha256) errors.push(`Invalid actual file ${m.path}`);
    } catch {
      errors.push(`Missing actual file ${m.path}`);
    }
  }
  const h = a.imageMetadata.images["256"].sha256;
  if (hashes.has(h)) errors.push("Duplicate actual image " + a.assetId);
  hashes.add(h);
  if (a.qa.imageSha256 !== h) errors.push("Stale visual QA " + a.assetId);
  if (
    a.readings.some(
      (x) => x.reviewStatus !== "approved" || !x.evidence || !x.explanation,
    )
  )
    errors.push("Unreviewed reading " + a.assetId);
}
for (const [name, min] of Object.entries({
  approvedUniqueConcepts: 1000,
  packaged: 1000,
  approvedReadings: 3000,
  assetsWith2Readings: 800,
  assetsWith3Readings: 600,
  assetsWith4Readings: 300,
  assetsWithMultipleEdgeOptions: 650,
  assetsWithSameHeadDifferentSafeTails: 100,
}))
  if ((c[name] ?? 0) < min) errors.push(`${name}: ${c[name] ?? 0}/${min}`);
if ((r.tests ?? []).length !== 16 || r.tests.some((t) => t.result !== "pass"))
  errors.push("All AT01–AT16 must pass against final build/content");
if (r.blockers?.length) errors.push("Unresolved blockers");
if (r.knownIssues?.length) errors.push("Unresolved mandatory issues");
if (
  r.reviewCoverage?.unreviewedCount !== 0 ||
  r.reviewCoverage?.totalCount < 1000
)
  errors.push("Incomplete visual/semantic review");
if (!r.buildHash || !r.specHash) errors.push("Missing build/spec hash");
const digest=data=>createHash('sha256').update(data).digest('hex');
const currentHash=runtimeHash();
const currentVersion=JSON.parse(readFileSync('src/generated/version.json')).version;
if(r.buildHash!==currentHash||r.contentVersion!==currentVersion)errors.push('Report is not bound to the current runtime');
if(r.specHash!==digest(readFileSync('spec/requirements-v1.0.txt'))||r.specHash!=='20dda5540be376e4bc1dd0bac0fc69e8315d6722844fb90e458b9df99f2fa4cd')errors.push('Specification hash differs');
const read=path=>{try{return JSON.parse(readFileSync(path,'utf8'));}catch{errors.push('Missing/invalid evidence '+path);return null;}};
const bound=(value,path)=>{if(!value||value.buildHash!==currentHash||value.contentVersion!==currentVersion)errors.push('Stale evidence '+path);return value;};
const audit=read('reports/content-audit.json'),editorial=read('reports/editorial-audit.json');
if(audit?.errors.length||JSON.stringify(audit?.counts)!==JSON.stringify(r.counts))errors.push('Content audit/count mismatch');
if((audit?.bytes??Infinity)>150*1024*1024)errors.push('Asset byte budget exceeded');
if(Object.keys(audit?.categories??{}).length<10||Object.values(audit?.categories??{}).some(n=>n/actual.length>.2))errors.push('Category balance fails');
if(editorial?.errors.length||editorial?.candidateCount<1200||editorial?.candidates.length<1200||editorial?.commonPrimaryRatio<.7||editorial?.selected!==actual.length||editorial?.groups.some(g=>g.members.length>g.cap))errors.push('Editorial/candidate review fails');
for(const [word,count] of audit?.highFrequencyReadings??[]){const item=editorial?.highFrequency.find(x=>x.word===word);if(!item||item.cases.length!==count||!item.review)errors.push('Incomplete high-frequency review '+word);}
const visual=read('reports/visual-audit/review.json'),remaining=read('reports/remaining-review/review.json');
if(visual?.status!=='reviewed'||visual?.reviewerType!=='AI'||visual?.sample.length!==200||new Set(visual?.sample.map(x=>x.assetId)).size!==200||visual?.detailPagesActuallyOpened.length!==13||visual?.nearPagesActuallyOpened.length!==8||visual?.nearPairs.length!==60)errors.push('Incomplete independent detailed/near-image review');
if(remaining?.status!=='reviewed'||remaining?.count!==84||remaining?.sample.length!==84)errors.push('Incomplete remaining-image census');
const imageById=new Map(actual.map(a=>[a.assetId,a.imageMetadata]));
const playful=read('reports/playful-review/review.json');
if(playful?.status!=='reviewed'||playful?.reviewerType!=='AI'||playful?.pagesActuallyOpened.length!==32||playful?.rows.length!==128||playful?.rows.reduce((n,a)=>n+a.readings.length,0)!==256)errors.push('Incomplete new associative reading review');
for(const row of playful?.rows??[]){
 if(imageById.get(row.assetId)?.images['512'].sha256!==row.detailSha256)errors.push('Changed playful detail '+row.assetId);
 const asset=actual.find(a=>a.assetId===row.assetId);
 for(const decision of row.readings)if(decision.decision!=='approved'||!asset?.readings.some(r=>r.id===decision.id&&r.kana===decision.kana&&r.kind==='wordplay'))errors.push('Missing playful reading '+decision.id);
}
for(const row of visual?.sample??[])if(imageById.get(row.assetId)?.images['512'].sha256!==row.detailSha256)errors.push('Changed sampled detail '+row.assetId);
for(const row of remaining?.sample??[])if(imageById.get(row.assetId)?.images['512'].sha256!==row.sha256)errors.push('Changed remaining detail '+row.assetId);
for(const [name,size] of [['thumbnail-review','128'],['tiny-review','96']]){
 const review=read('reports/'+name+'.json');
 if(review?.result!=='approved'||review?.sample.length!==actual.length)errors.push('Incomplete responsive image review '+name);
 for(const row of review?.sample??[])if(imageById.get(row.assetId)?.images[size].sha256!==row.imageSha256)errors.push('Stale responsive review '+row.assetId);
}
const semantic=readFileSync('content/semantic-reviews.jsonl','utf8').trim().split('\n').map(line=>JSON.parse(line));
const semanticById=new Map(semantic.map(x=>[x.readingId,x]));
for(const asset of actual)for(const reading of asset.readings){
 const row=semanticById.get(reading.id);
 const signature=digest(JSON.stringify({id:reading.id,display:reading.display,kana:reading.kana,kind:reading.kind,difficulty:reading.difficulty,priority:reading.priority,explanation:reading.explanation,evidence:reading.evidence,hints:reading.hints,aliases:reading.aliases,element:reading.element??null}));
 if(!row||row.decision!=='approved'||row.imageSha256!==asset.qa.imageSha256||row.inputHash!==signature)errors.push('Stale semantic review '+reading.id);
 if(reading.difficulty==='advanced'&&!reading.element)errors.push('Advanced reading lacks visible bounds '+reading.id);
}
const audits=bound(read('reports/final-audits.json'),'final-audits');
if(audits?.results.length!==6||audits?.results.some(x=>x.exitCode!==0))errors.push('Final audit command failed/not run');
const unit=read('reports/unit-results.json'),coverage=read('reports/core-coverage.json');
if(unit?.numFailedTests!==0||unit?.numPassedTests<96||unit?.numPendingTests!==0||!coverage?.passed||coverage?.branchPercent<90)errors.push('Unit/branch gate fails');
for(const path of ['reports/e2e-final.json','reports/e2e-performance-release.json']){const test=read(path);const expected=path.includes('performance')?3:69;if(test?.stats.expected!==expected||test?.stats.unexpected!==0||test?.stats.skipped!==0)errors.push('Browser suite gate fails '+path);}
const finalRunIds=[read('reports/e2e-final.json')?.config.metadata.runId,read('reports/e2e-performance-release.json')?.config.metadata.runId];
const events=readFileSync('reports/browser-events.jsonl','utf8').trim().split('\n').map(line=>JSON.parse(line)).filter(row=>finalRunIds.includes(row.runId));
if(events.length!==72||events.some(row=>row.buildHash!==currentHash||row.contentVersion!==currentVersion||!row.intentional&&row.errors.length))errors.push('Unexpected browser errors or stale browser evidence');
const stress=bound(read('reports/stress-results.json'),'stress');
if(stress?.boards!==30000||stress?.assets!==actual.length||stress?.failures.length||stress?.simulations.length!==10||stress?.simulations.some(s=>s.rounds!==1000||s.wins+s.losses!==1000||s.repeats!==0))errors.push('Seed/round stress gate fails');
for(const difficulty of ['easy','normal','hard']){
 const shards=stress?.shards?.filter(s=>s.seeds>0&&s.difficulty===difficulty)??[];
 const covered=new Set();let fallback=0;
 for(const shard of shards){const proof=bound(read(shard.evidencePath),shard.evidencePath);if(proof?.failures.length||proof?.boards!==shard.seeds)errors.push('Failed stress shard '+shard.name);fallback+=proof?.fallbacks??Infinity;for(let seed=shard.seedStart;seed<shard.seedStart+shard.seeds;seed++){if(covered.has(seed))errors.push('Duplicate stress seed '+difficulty+seed);covered.add(seed);}}
 if(covered.size!==10000||Math.min(...covered)!==0||Math.max(...covered)!==9999||fallback/10000>=.01)errors.push('Difficulty coverage/fallback gate fails '+difficulty);
}
const deterministic=bound(read('reports/determinism-results.json'),'determinism'),cpu=bound(read('reports/cpu-comparison.json'),'CPU comparison');
if(deterministic?.failures.length||deterministic?.cases.length!==90||deterministic?.runs!==270||cpu?.failures.length||cpu?.cases.length!==300)errors.push('Determinism/fairness evidence fails');
const performance=read('reports/performance-results.json');bound(performance?.environment,'performance');
if(performance?.coldPasses<4||performance?.cold.length!==5||performance?.warmPasses<19||performance?.warm.length!==20||performance?.initialTransfer>5*1024*1024)errors.push('Cold/warm/initial byte gate fails');
const resource=bound(read('reports/resource-results.json'),'resource'),latency=bound(read('reports/input-latency-results.json'),'latency');
if(resource?.measuredRounds!==500||resource?.samples.at(-1).deltaFromWarmup>20*1024*1024||resource?.samples.some(s=>s.images>25||s.workers.maximum>2||s.eventListeners.total>resource.samples[0].eventListeners.total+2)||latency?.p95>100||latency?.samples.length<15)errors.push('Resource/input latency gate fails');
const restart=read('reports/restart-results.json');if(restart?.failures.length||restart?.checks.length<3||restart?.generationRequestsMade!==0||restart?.checkedFiles<4099)errors.push('Restart/truthfulness gate fails');
const play=bound(read('reports/visual-play/review.json'),'AI visual play');
if(play?.reviewerType!=='AI'||play?.activeSeconds<1800||play?.result!=='pass'||play?.unresolvedIssues.length)errors.push('Final build visual-play gate fails');
const packages=read('reports/package-results.json'),verified=read('reports/package-verification.json');
if(packages?.buildHash!==currentHash||verified?.buildHash!==currentHash||!verified?.playRuntimeMatch||!verified?.sourceBuildMatch)errors.push('Package/extracted build verification fails');
for(const value of [packages?.play,packages?.source])if(!value||digest(readFileSync(value.path))!==value.sha256)errors.push('Archive SHA mismatch/missing archive');
const result = {
  generatedAt: new Date().toISOString(),
  eligibleForComplete: errors.length === 0,
  failures: errors,
};
writeFileSync("reports/acceptance-check.json", JSON.stringify(result, null, 2));
if (errors.length) {
  if (r.status === "complete")
    { r.status="releaseCandidate"; r.knownIssues=[...new Set([...(r.knownIssues??[]),'Mandatory acceptance check failed: '+errors.join('; ')])];writeFileSync(path,JSON.stringify(r,null,2));throw Error("Invalid complete declaration: " + errors.join("; ")); }
  console.log("NOT COMPLETE\n" + errors.join("\n"));
  process.exitCode = 1;
} else {
  r.status = "complete";
  r.stage = `${c.approvedUniqueConcepts} approved concepts; all AT01–AT16 mandatory gates passed`;
  writeFileSync(path, JSON.stringify(r, null, 2));
  console.log("All mandatory gates passed.");
}
