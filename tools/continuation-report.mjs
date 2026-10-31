import { stripVTControlCharacters } from "node:util";
import { readFileSync, writeFileSync, appendFileSync, copyFileSync } from 'node:fs';
import { runtimeHash } from './runtime-files.mjs';
const nl=String.fromCharCode(10), read=p=>JSON.parse(readFileSync(p,'utf8')), root='reports/continuation/';
const before=read(root+'baseline-expanded.json'),after=read(root+'final-cached.json'),scale=read(root+'scaling.json'),known=read(root+'discovered.json'),ui=read(root+'e2e.json'),suite=read(root+'performance-e2e.json');
const perf=read('reports/performance-results.json'),resources=read('reports/resource-results.json'),input=read('reports/input-latency-results.json'),buildHash=runtimeHash(),contentVersion=read('src/generated/version.json').version;
if(!stripVTControlCharacters(readFileSync(root+'unit.txt','utf8')).includes('103 passed (103)'))throw Error('Unit checks incomplete');
for(const [s,count] of [[ui,75],[suite,3]])if(s.stats.expected!==count||s.stats.unexpected||s.stats.skipped||s.stats.flaky)throw Error('Browser checks incomplete');
if(perf.environment.buildHash!==buildHash||resources.buildHash!==buildHash||input.buildHash!==buildHash||!input.passed)throw Error('Runtime evidence mismatch');
if(before.boards!==900||after.boards!==900||after.failures.length||known.failures.length)throw Error('Simulation incomplete');
for(const row of scale.rows)if(row.generation.failures.length||row.generation.maxStates>20000||row.cpu.maxStates>768||row.fullDiscoveryCpu.maxStates>768)throw Error('Scale bound failed');
const events=readFileSync(root+'browser-events.jsonl','utf8').trim().split(nl).map(JSON.parse);
if(events.length!==75||events.some(e=>e.status!=='passed'||e.buildHash!==buildHash||(!e.intentional&&e.errors.length)))throw Error('Unexpected browser event');
for(const file of ['performance-results.json','resource-results.json','input-latency-results.json'])copyFileSync('reports/'+file,root+file);
const b=before.summary.normal['common-random'],a=after.summary.normal['common-random'],last=resources.samples.at(-1);
const limitations=['4096/8192-picture dictionaries are synthetic topology-preserving expansions, not additional reviewed artwork.','Scale timing samples are PC Node measurements, with five generation samples per size; browser throttling is separate.','Physical iOS Safari and OS virtual keyboards were not tested.','Short games remain possible; sampled quality is not an all-path guarantee.','Prior full-acceptance records and ZIPs remain tied to the initial release, not this incremental runtime.'];
const report={at:new Date().toISOString(),status:'passed',buildHash,contentVersion,simulation:{conditionsPerVersion:900,gamesPerVersion:1800,normal:{before:b,after:a},player:'Seeded common/basic-or-synonym random legal moves, falling back to other legal moves. Both actors combined turns. No terminal mistakes/timeouts; not human-play evidence.',varietyByDifficulty:after.varietyByDifficulty,variety:after.variety},bounds:{generationStates:20000,cpuStates:{easy:192,normal:384,hard:768},lookaheadPlies:{easy:4,normal:6,hard:8},boardQuality:'8 walks of at most 16 turns; no full game-state graph'},timings:{generationMs:after.generationMs,cpuMs:after.cpuMs,fullDiscovery:known.cpu,scaleRows:scale.rows},verification:{unitTests:103,uiTests:75,engines:['Chromium','Firefox','Linux WebKit'],performanceTests:3,coldMs:{min:Math.min(...perf.cold),max:Math.max(...perf.cold)},warmMs:{min:Math.min(...perf.warm),max:Math.max(...perf.warm)},inputP95Ms:input.p95,resource:{rounds:520,warmup:20,measuredRounds:500,heapIncreaseBytes:last.deltaFromWarmup,workers:last.workers.active,images:last.images,listeners:last.eventListeners.total},legacyCaseRecordsPreserved:180,knowledgeCacheCaseRecordsPreserved:1800,extremeBranchingChoices:768},manual:{turns:15,hints:0,mode:'practice',difficulty:'normal',result:'player win',screenshot:'manual-15-turns-final.png',note:'Actual UI play on v3 before the call-local cache optimization; restored and visually verified on final runtime. Recorded simulation metrics remain identical.'},limitations};
writeFileSync(root+'verification.json',JSON.stringify(report,null,2)+nl);
const scaleTable=scale.rows.map(r=>`| ${r.pictures} | ${r.readingEdges} | ${r.generation.p95Ms.toFixed(1)}ms | ${r.cpu.p95Ms.toFixed(2)}ms | ${r.fullDiscoveryCpu.p95Ms.toFixed(2)}ms |`).join(nl);
const md=`# 継続性とスケール検証（2026-10-30）

CPUを早い勝利よりも長くつながる手を優先する方式へ変更し、通常読みの経路と橋渡し札を使った盤面生成を実装しました。全局面を列挙せず、辞書の文字接続だけを索引化します。

最終ビルド: ${buildHash}
辞書版: ${contentVersion}

## 対戦の長さ

各難易度300シード、先後交互、計900条件・1800対戦ずつを旧実装と比較しました。同じシード集合を難易度間でも使っています。手数は両者の合計です。下表は通常難易度で、普通の読みを優先し、その中からランダムに合法手を選ぶ簡易プレイヤーとの300対戦です。

| 指標 | 変更前 | 変更後 |
|---|---:|---:|
| 平均手数 | ${b.meanTurns.toFixed(2)} | ${a.meanTurns.toFixed(2)} |
| 中央値 | ${b.medianTurns} | ${a.medianTurns} |
| 4手以内に終了 | ${b.endedWithin4}/300（${(b.endedWithin4/3).toFixed(1)}%） | ${a.endedWithin4}/300（${(a.endedWithin4/3).toFixed(1)}%） |

各難易度で300配置はすべて異なりました。900条件全体で929種類の絵が出現。同じシードを難易度間で共有するため、難易度間の重複数は別に記録しています。橋渡しの候補もランダムに選び、最後の2枚を自由抽選として残しています。

これは合法手を選び続けるシミュレーションです。人間が絵を読み取る難しさ、誤答、時間切れを含まず、すべての選択で長く続く保証でもありません。別に実際の画面でも、ヒントなし・通常難易度の練習で15手の対戦を確認しました。

## 処理上限と拡張試験

生成は既存の20,000状態上限、CPUはeasy/normal/hardで192/384/768状態。先読みは4/6/8手、深く調べる候補4/6/8個、各2試走、一段階の候補は最大4個です。盤面の継続評価は8試走×最大16手で、平均9手以上・4手以内終了1回以下を確認します。18手経路とプレイヤーの勝ち筋検証も維持。CPUの2.2〜3.4秒の探す演出は変更していません。

| 絵の相当数 | 読みの辺 | 生成p95※ | CPU p95 | 全読み開放CPU p95 |
|---:|---:|---:|---:|---:|
${scaleTable}

※各サイズ5回の生成なのでp95はその5回の最大値です。PC Nodeの合成辞書計測で、4096/8192枚の実アートを追加したものではありません。同じ24枚でCPU判断が変わらないこと、生成・CPUの上限を守ることも確認。検証範囲は8192枚相当までです。索引構築時間と概算ヒープ差もscaling.jsonに記録しています。

拡張試験で見つけた候補リストの二重走査を除去しました。また発見済み集合をCPU判断の中で共有し、3801読み全開放条件のp95は約17.66msから${known.cpu.p95Ms.toFixed(2)}msへ改善しました。局面を永続キャッシュしません。補充モードでは予約済みの補充順を先読みに反映します。

## 回帰・ブラウザー・資源確認

- 全単体103件合格。768候補へ分岐する極端な盤面でも上限で停止し、合法で再現可能な手を返します。
- Chromium / Firefox / Linux WebKitの操作75件合格。各エンジンで全4096画像デコード、再挑戦、保存復元、補充、端末幅、即勝利より継続するCPUを確認。
- 390×844、CPU4倍減速、4Mbps、遅延150msで初期表示5回・次の盤面20回が基準内。初期表示${Math.max(...perf.cold).toFixed(0)}ms以下、次の盤面${Math.max(...perf.warm).toFixed(0)}ms以下、入力p95は${input.p95.toFixed(1)}ms。
- 20回ウォームアップ＋500対戦後のヒープ増分${(last.deltaFromWarmup/1048576).toFixed(2)}MiB。画像${last.images}、Worker${last.workers.active}、リスナー${last.eventListeners.total}を維持。仮想時計を使う実UI検査で、手動試遊時間には加算しません。
- 旧v2の180ケースと知識集合共有の最適化前後1800ケースで、手数・探索数など記録した比較項目が一致。保存済み対戦は旧CPU版を保ち、新しい連戦から新CPUを使います。辞書版の違う再挑戦コードには従来通り版確認が働きます。

初回のWindows/WSL間のlocalhost接続先ミスと、短期決着を前提にしていたテスト時計・非同期描画待ちの診断ログは別名で保持しています。最終合格の証拠はe2e.json / performance-e2e.json / unit.txt / browser-events.jsonlです。ゲームの演出時間や検証閾値は緩めていません。物理端末Safari・OS仮想キーボードは未確認です。

初版の全量受入・30分試遊・配布ZIPの記録は元のビルドに紐づき、今回の差分へ読み替えていません。今回の動作はLAN配信のdistへ反映しています。
`;
writeFileSync(root+'verification.md',md);
const manual=read(root+'manual-play.json');manual.playedOnBuild='3ff9e8531162b02c9481894f26c2de0a838725eb6b038f08c1ba9eed9c580dc4';manual.restoredOnBuild=buildHash;manual.finalScreenshot=root+'manual-15-turns-final.png';writeFileSync(root+'manual-play.json',JSON.stringify(manual,null,2)+nl);
const old=read('NEXT_ACTIONS.json');writeFileSync('NEXT_ACTIONS.json',JSON.stringify({status:'complete',buildHash,contentVersion,blockers:[],remaining:[],completed:['Bounded graph-assisted generation with natural-reading branches and two free draws','Long-play CPU with capped state/depth/candidate counts','900 conditions and1800 games per version; synthetic8192 scaling including full discovery','103 unit tests;75 cross-engine UI tests;3 performance tests;500 measured resource rounds','Legacy case metrics preserved; actual15-turn UI play restored on final runtime'],latestVerification:root+'verification.json',latestReport:root+'verification.md',initialRelease:old.initialRelease??old,distribution:'LAN dist updated; earlier release ZIPs preserved as original release.',verificationLimitations:limitations},null,2)+nl);
appendFileSync('WORK_LOG.txt',[nl,'2026-10-30 継続性・スケール改善 完了',`${buildHash} / ${contentVersion}`,'辞書索引、通常読み18手経路と橋渡し・自由抽選2枚、8試走の継続品質検査、cpu-v3-long-playを追加。二重リスト走査と発見済み集合の再生成も除去。補充順を先読みに反映。',`通常の平均${b.meanTurns.toFixed(2)}→${a.meanTurns.toFixed(2)}手、4手以下終了${b.endedWithin4}/300→${a.endedWithin4}/300。8192枚相当まで合成辞書で測定。`,'単体103、3エンジンUI75、性能3、20+500対戦資源検査が合格。実操作でもヒントなし15手を確認。旧CPU180ケース、最適化前後1800ケースの記録が一致。',`診断失敗は別名保持。閾値・製品の演出時間は緩和なし。詳細 ${root}verification.md。初版受入・ZIPは元ビルドの記録として保持。`,nl].join(nl));
console.log(JSON.stringify({status:'passed',buildHash,unit:103,ui:75,performance:3,heapMiB:last.deltaFromWarmup/1048576,coldMax:Math.max(...perf.cold),warmMax:Math.max(...perf.warm),inputP95:input.p95}));
