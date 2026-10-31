import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { stripVTControlCharacters } from 'node:util';
import { runtimeHash } from './runtime-files.mjs';
const root = 'reports/hints/';
const hash = runtimeHash();
const files = ['e2e.json', 'recheck.json', 'webkit.json'];
const latest = new Map();
const runs = [];
function visit(s, file) {
  for (const spec of s.specs ?? []) for (const t of spec.tests) {
    const key = `${t.projectName}:${spec.title}`;
    latest.set(key, { project:t.projectName, title:spec.title, source:file, status:t.results.at(-1)?.status });
  }
  for (const child of s.suites ?? []) visit(child, file);
}
for (const file of files) {
  const data = JSON.parse(readFileSync(root+file, 'utf8'));
  if (data.errors.length) throw Error(`Suite errors: ${file}`);
  visit(data, file);
  runs.push({file, ...data.stats});
}
if (latest.size !== 96 || [...latest.values()].some(t => t.status !== 'passed')) throw Error('Not all 96 unique UI cases pass');
const unit = stripVTControlCharacters(readFileSync(root+'unit.txt', 'utf8'));
if (!/Tests\s+115 passed/.test(unit)) throw Error('Unit results not complete');
const events = new Map();
for (const file of ['browser-events-regression.jsonl', 'browser-events-recheck.jsonl']) {
  for (const line of readFileSync(root+file, 'utf8').trim().split('\n')) {
    const e = JSON.parse(line);
    events.set(`${e.project}:${e.test}`, e);
  }
}
for (const [key] of latest) {
  const e = events.get(key);
  if (!e || e.status !== 'passed' || e.buildHash !== hash || (!e.intentional && e.errors.length)) throw Error('Runtime evidence mismatch: '+key);
}
const manifest = JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8'));
const entry = Object.values(manifest).find(e => e.isEntry).file;
const url = 'http://192.168.0.111:4173/';
const response = await fetch(url);
if (response.status !== 200 || !(await response.text()).includes(entry)) throw Error('LAN index differs');
if ((await fetch(url+entry)).status !== 200) throw Error('LAN entry missing');
const proof = 'manual-hints-refill.png';
copyFileSync('/mnt/c/Users/ikai/.codex/visualizations/2026/10/23/01a167a5-e647-7253-a4b5-3e9ab9d0f7d8/shiritori-hints-refill.png', root+proof);
const report = {
  status:'passed', verifiedAt:new Date().toISOString(), buildHash:hash,
  contentVersion:JSON.parse(readFileSync('src/generated/version.json','utf8')).version,
  features:['Five modes share current board and continuation-first CPU for new games', 'Untimed finite refill, separate records, no seconds penalty', 'Seeded safe random CPU opening preserved in saves and portable replays', 'Trapped CPU scans for 2.2–3.4 seconds, shows question mark, supports pause', 'Second hint provides reading kind, kana length and ending; panel glows'],
  unit:{passed:115, files:11, source:root+'unit.txt'},
  ui:{passed:96, byProject:{chromium:32,firefox:32,webkit:32}, method:'Latest result per project and title across base regression, affected-case recheck and complete WebKit rerun.', runs, cases:[...latest.values()]},
  generation:{seedsPerDifficulty:30, conditions:90, seedReproducibility:true, followingMove:true, openingWinWitness:true, overallStateCap:20000, shallowOpeningCandidatesMax:24, source:'tests/unit/opening.test.ts'},
  lan:{url,status:200,entry,servicePid:51472,serviceRestarted:false},
  manual:{image:root+proof, finalRuntimeRestoration:true, observed:['infinite clock','23 remaining reserves after CPU first move','rabbit panel glow','part reading, 2 kana, ending hint','reload restores mode, move and hint']},
  limitations:['Previous 3 performance/resource suites and continuation/scaling metrics remain bound to build 097461f; they were not rerun for this incremental runtime.', 'Linux WebKit is not physical iOS Safari.', 'Reserve cards are still a seeded random stack; graph-conditioned construction applies to the initial 24 panels.', 'Short games remain possible; opening checks and sampled board quality do not prove all choices continue.', 'Initial release ZIPs remain unchanged.'],
  resolvedDiagnostics:['Initial refill hint fixture lacked the required reserve stack; corrected fixture.', 'Virtual 65-second wait now waits for replacement images first, avoiding an artificial image deadline.', 'Old tests assumed player-first, reserve[0], instant trapped-CPU result and a practice-mode seconds penalty; expectations now follow requested rules.', 'WebKit host package checks do not recognize workspace libraries; rerun uses existing workspace libraries and software GL configuration, without system installation.']
};
writeFileSync(root+'verification.json',JSON.stringify(report,null,2)+'\n');
writeFileSync(root+'verification.md',`# 2026-10-30 ヒント・CPU開幕・時間なし補充\n\n配信版: ${hash}\n\n- 全5モード・全難易度の新規対戦で盤面生成と継続優先CPUを共用。補充札の山はseedによるランダムのまま。\n- 「めくって補充 · 時間なし」を追加。難易度ごとに12/24/48枚、有限の山、同じ札・語は禁止。時間切れも誤答の秒数ペナルティもなく、成績は別区分。\n- 新規対戦はCPUが自然な読みの候補からランダムに1枚選ぶ。次の自然な手を確保し、確定した初手後の勝ち筋も検証。最大24候補の浅い確認を従来の20,000状態上限へ計上。保存と再挑戦コードに初手を含め、従来の対戦の先後は維持。\n- CPUに手がない場合も約2〜3秒探し、最後に「？」を表示して投了。ポーズ中は時間も止まる。\n- ヒント対象の札を光枠と電球で示す。2回目は汎用文をやめ、読みの種類・かな文字数・語尾を明かす穴あき読みに変更。3回目は答え。1対戦3回は維持。短い語は2回目で推測できる場合がある。\n\n検証は単体115件、Chrome/Firefox/Linux WebKitで32件ずつ、計96種類の操作ケースが最終合格。96件は複数バッチの同名ケースの最終結果を集計したもの。一括実行の初回結果・修正後の関連10件・WebKit全32件の再実行をそれぞれ保存し、未解決の失敗がないことを照合した。途中ログは消していない。全ケースの最終ブラウザ記録を配信ビルドSHAに照合し、意図的な障害試験以外のブラウザエラーはゼロ。\n\n新しい開幕指定で30seed×3難易度を生成し、合法な初手・次の手・勝ち筋・状態上限・再現性を検証。5モードの保存とコード再挑戦、無制限補充の全難易度、65秒待機、誤答時の非減算、補充、探索中のポーズ、IME、キーボード、縦画面、既存4096画像デコードも確認した。\n\n実操作でもCPU「ぬいぐるみ」→プレイヤー「み」の状態から、うさぎの札に光枠と「絵の一部分・2文字『？み』」が出ることを確認。最終配信版への再読み込み後も無制限補充・初手・ヒントを復元した。\n\n![最終配信版のヒントと時間なし補充](${proof})\n\nLAN ${url} はHTTP200、現在のJSも取得可能。既存のWindows常駐Nodeサービスを再起動せずdistを更新した。\n\n前回の性能3件・500対戦資源検査・継続性とスケール計測は旧097461f版の記録で、今回版の再計測とは扱わない。実機iOS Safariは未検証。短い対戦がなくなる保証はない。初版ZIPは据え置き。\n`);
const prior = JSON.parse(readFileSync('NEXT_ACTIONS.json','utf8'));
const next = {...prior,status:'complete',buildHash:hash,contentVersion:report.contentVersion,blockers:[],remaining:[],
  latestVerification:root+'verification.json',latestReport:root+'verification.md',
  previousVerification:prior.buildHash === hash ? prior.previousVerification : {buildHash:prior.buildHash,verification:prior.latestVerification,report:prior.latestReport},
  completed:[...report.features,'115 unit tests; final passing coverage of 96 unique UI cases across three engines; 90 opening-generation conditions','Final LAN index/current JS verified and restored manual hint screen saved'],
  verificationLimitations:report.limitations};
writeFileSync('NEXT_ACTIONS.json',JSON.stringify(next,null,2)+'\n');
const readme = readFileSync('README.md','utf8');
const notice = '\n最新の操作改善（2026-10-30）：時間なし補充、CPUのランダム初手、手詰まり時の探索、具体的な2段階目ヒントを追加。新しい対戦で有効です。検証の範囲と結果は `reports/hints/verification.md`。以前の性能計測と初版ZIPはそれぞれ元の版の記録です。\n';
if (!readme.includes('最新の操作改善（2026-10-30）')) writeFileSync('README.md',readme.replace('# 今遊ぶ方法\n','# 今遊ぶ方法\n'+notice));
const log = `\n${report.verifiedAt} ヒント・CPU開幕・時間なし補充 完了\n${hash} / ${report.contentVersion}\n単体115、3エンジン32件ずつ計96ケースの最終結果を照合。新開幕90条件、再挑戦・保存・65秒の無制限待機・補充・CPU手詰まり探索・ポーズを確認。旧期待値と仮想時計の画像待ちを更新し、既存キャッシュのWebKitライブラリ環境で再実行。途中失敗はログを保持。Windowsサービス51472は継続、LAN200と現在のJSを照合。詳細reports/hints/verification.md。以前の性能・スケール・ZIPは元の版のまま。\n`;
const work = readFileSync('WORK_LOG.txt','utf8');
if (!work.includes(hash+' / '+report.contentVersion)) writeFileSync('WORK_LOG.txt',work+log);
console.log(JSON.stringify({status:report.status,hash,unit:115,ui:96,lan:url}));
