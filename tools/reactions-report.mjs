import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { stripVTControlCharacters } from 'node:util';
import { runtimeHash } from './runtime-files.mjs';
const folder = 'reports/reactions/';
const hash = runtimeHash();
const latest = new Map();
const runs = [];
function walk(s,file) {
  for (const spec of s.specs ?? []) for (const t of spec.tests ?? [])
    latest.set(t.projectName+':'+spec.title,{project:t.projectName,title:spec.title,source:file,status:t.results.at(-1)?.status});
  for (const child of s.suites ?? []) walk(child,file);
}
for (const file of ['final-e2e.json','recheck.json']) {
  const data = JSON.parse(readFileSync(folder+file,'utf8'));
  if (data.errors.length) throw Error('Suite errors: '+file);
  walk(data,file);
  runs.push({file,...data.stats});
}
if (latest.size!==114 || [...latest.values()].some(t=>t.status!=='passed')) throw Error('Not all 114 unique UI cases pass');
const unit = stripVTControlCharacters(readFileSync(folder+'unit.txt','utf8'));
if (!/Tests +119 passed/.test(unit)) throw Error('Unit tests incomplete');
const events = new Map();
for (const file of ['browser-events-final.jsonl','browser-events-recheck.jsonl']) {
  for (const line of readFileSync(folder+file,'utf8').trim().split(String.fromCharCode(10))) {
    const event=JSON.parse(line); events.set(event.project+':'+event.test,event);
  }
}
for (const [key] of latest) {
  const e=events.get(key);
  if (!e || e.status!=='passed' || e.buildHash!==hash || (!e.intentional&&e.errors.length)) throw Error('Runtime mismatch: '+key);
}
const inputSuite=JSON.parse(readFileSync(folder+'input-e2e.json','utf8'));
const latency=JSON.parse(readFileSync('reports/input-latency-results.json','utf8'));
if (inputSuite.stats.expected!==1 || inputSuite.stats.unexpected || latency.buildHash!==hash || !latency.passed || latency.p95>100) throw Error('Input latency check failed');
copyFileSync('reports/input-latency-results.json',folder+'input-latency-results.json');
const manifest=JSON.parse(readFileSync('dist/.vite/manifest.json','utf8'));
const entry=Object.values(manifest).find(x=>x.isEntry).file;
const url='http://192.168.0.111:4173/';
const res=await fetch(url);
if (res.status!==200 || !(await res.text()).includes(entry) || (await fetch(url+entry)).status!==200) throw Error('LAN runtime differs');
const proofRoot='/mnt/c/Users/ikai/.codex/visualizations/2026/10/23/01a167a5-e647-7253-a4b5-3e9ab9d0f7d8/';
copyFileSync(proofRoot+'shiritori-cpu-opening.png',folder+'manual-cpu-opening.png');
copyFileSync(proofRoot+'shiritori-final-reward.png',folder+'manual-new-reading.png');
const report={
  status:'passed',verifiedAt:new Date().toISOString(),buildHash:hash,contentVersion:JSON.parse(readFileSync('src/generated/version.json','utf8')).version,
  changes:['Small original SVG pixel CPU with ten facial states and reactions to player answers','Opening scan, compare and final lock within the original 2.2–3.4-second presentation duration','One-time player discovery chime and NEW/COMPLETE stamp; persistent gold catalog completion marks from actual discovery IDs','Removed hint panel glow and bulb marker in every mode; retained staged text hints','Fixed stale tutorial-close pause race reproduced before the fix'],
  unit:{passed:119,files:12,source:folder+'unit.txt'},
  ui:{passed:114,byProject:{chromium:38,firefox:38,webkit:38},method:'Final status per project/title across the full run and affected-case recheck.',runs,cases:[...latest.values()]},
  inputLatency:{p95Ms:latency.p95,thresholdMs:100,cpuSlowdown:4,samples:latency.samples.length,method:latency.method,source:folder+'input-latency-results.json'},
  raceRegression:{before:folder+'race-before.json',beforeStatus:'failed with stale pause',after:folder+'race-after.json',afterRepeatedFirefoxPasses:3,includedInFinalUi:true},
  manual:{finalBuildOpening:'CPU scanned before choosing いちご and handing off ご',finalBuildDiscovery:'Player selected soccer goal as ごーる, showed NEW 1/4 and surprised CPU, profile count changed from 1 to 2',images:[folder+'manual-cpu-opening.png',folder+'manual-new-reading.png'],savedProgressPreserved:true},
  lan:{url,status:200,entry,servicePid:51472,restarted:false},
  limitations:['Input timing measures incorrect-card pointer input to two animation frames; it does not measure every successful reward animation.','Earlier cold/warm and 500-round resource suites remain bound to their previous runtime; they were not rerun for this increment.','Physical iOS Safari and speaker audition were not performed.','Initial distribution ZIPs remain unchanged.'],
  resolvedDiagnostics:['Initial reward rendered simultaneously in the overlay and feedback bar; now only one stamp is rendered at a time.','A closing-tutorial race reproduced on the prior runtime was fixed using the current requested modal rather than a stale render.','Random CPU openings can consume the first card, and refill can reuse the same slot. Fresh-start detail/storage checks now use an available card; refill checks verify the actual replacement and reserve count, preserving their original requirements.','An attempted end of a saved manual test game was rejected by automatic review; the game was left intact and a separate empty origin was used for the opening verification.']
};
writeFileSync(folder+'verification.json',JSON.stringify(report,null,2)+String.fromCharCode(10));
writeFileSync(folder+'verification.md',`# 2026-10-30 CPUと発見の演出

配信版: ${hash}

- 小さなオリジナルのSVGドット絵CPUを盤面見出しに追加。探す・迷う・ひらめく・驚く・喜ぶ・焦る・困る・しょんぼり・見守る・休む、計10状態。盤面に文章を増やさず記号と表情で示す。
- CPU初手は、札を見て回る→候補を行き来する→金枠と✓で確定。既存の2.2〜3.4秒内で行い、探索アルゴリズムと時間は増やしていない。
- 自分で初めて見つけた裏読みに専用音とNEWスタンプ。全承認読みが揃うとCOMPLETEと図鑑の金色の印。既知の読み、CPUの回答、保存復元ではNEWを再発火しない。図鑑の答え表示だけでも達成にはならない。古い保存にも対応。
- ユーザーの追加指示により、ヒント時の札の発光と電球を撤去。全5モードでヒント前後の札の枠が同じことを確認。文字のヒントは維持。
- 初手表示と開始案内の終了が同時になると古いポーズ処理が残る競合を再現し修正。修正前に失敗し、修正後はFirefox3回連続と最終の3エンジンで合格。

単体119件、Chrome/Firefox/Linux WebKit各38件、計114種類の操作ケースが最終合格。全量実行と関連ケースの再実行を別のJSONに残し、同じビルドの最終結果を集計している。保存・再挑戦、初手、手詰まり、初発見と既知の読み、図鑑達成と参照のみの区別、ヒントの非発光、音の無効設定、動きを減らす設定、360/390/768/1440幅、IME、キーボード、旧4096画像のデコードを含む。

4倍CPU負荷で誤答カードをクリックして2フレーム目までのp95は${latency.p95.toFixed(1)}ms（条件100ms以下）。初発見アニメーションの全所要時間を測った値ではない。以前のcold/warm・500対戦の資源検査は以前の版の記録として維持し、今回の測定とは扱わない。

実操作でも、新規対戦のCPUが札を探して「いちご」を選ぶこと、その後「ごーる」でNEW 1/4とCPUの「！」が出ることを確認。途中まで遊んでいた別の保存済み対戦は終了せず残している。

![実操作のCPU初手](manual-cpu-opening.png)

![実操作の初発見](manual-new-reading.png)

LAN ${url} はHTTP200で、現在のJSも取得可能。Windows常駐サービス51472を再起動せずdistを更新した。実機iOS Safariとスピーカーの聴感評価は未実施。初版ZIPは据え置き。
`);
const prior=JSON.parse(readFileSync('NEXT_ACTIONS.json','utf8'));
const next={...prior,status:'complete',buildHash:hash,contentVersion:report.contentVersion,remaining:[],blockers:[],completed:[...report.changes,'119 unit cases; final pass of 114 three-engine UI cases; input-latency gate','Current LAN runtime verified; final-build manual opening and discovery screenshots saved'],latestVerification:folder+'verification.json',latestReport:folder+'verification.md',previousVerification:prior.buildHash===hash?prior.previousVerification:{buildHash:prior.buildHash,verification:prior.latestVerification,report:prior.latestReport,previous:prior.previousVerification},verificationLimitations:report.limitations};
writeFileSync('NEXT_ACTIONS.json',JSON.stringify(next,null,2)+String.fromCharCode(10));
const log=readFileSync('WORK_LOG.txt','utf8');
if (!log.includes(hash+' / '+report.contentVersion)) writeFileSync('WORK_LOG.txt',log+`
${report.verifiedAt} CPU・発見演出とヒント発光撤去 完了
${hash} / ${report.contentVersion}
10表情のSVGドットCPU、初手scan/compare/locked、初発見音とNEW/COMPLETE、図鑑の実発見による達成印。ヒント発光と電球は撤去。開始案内の遅延ポーズ競合を再現して修正。
単体119、3エンジン38件ずつ計114ケースの最終結果を照合。4倍CPUで誤答入力p95 ${latency.p95.toFixed(1)}ms、基準100ms以下。初手と新規「ごーる」を実操作で確認。LAN200と現在JSを照合、常駐51472継続。以前の性能資源検査とZIPは元の版を保持。詳細reports/reactions/verification.md。
`);
console.log(JSON.stringify({status:report.status,hash,unit:119,ui:114,inputP95:latency.p95,lan:url}));
