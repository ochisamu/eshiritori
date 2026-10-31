// Aggregate actual timestamped UI operation intervals; never infer visual approval from time alone.
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {runtimeHash} from './runtime-files.mjs';
const root='reports/visual-play',buildHash=runtimeHash(),contentVersion=JSON.parse(readFileSync('src/generated/version.json')).version;
const segments=readdirSync(root).filter(name=>/^segment-.*\.json$/.test(name)).map(name=>({path:root+'/'+name,...JSON.parse(readFileSync(root+'/'+name))}));
const counted=segments.filter(s=>s.buildHash===buildHash&&s.contentVersion===contentVersion&&!s.diagnosticOnly&&s.end).sort((a,b)=>Date.parse(a.start)-Date.parse(b.start));
let activeSeconds=0,previousEnd=0;
for(const segment of counted){
 const start=Date.parse(segment.start),end=Date.parse(segment.end),excluded=segment.excludedSeconds??0;
 if(!Number.isFinite(start)||!Number.isFinite(end)||start<previousEnd||end<start||excluded<0||excluded>(end-start)/1000)throw Error('Invalid/overlapping visual-play interval '+segment.path);
 if(segment.events.some(e=>Date.parse(e.at)<start||Date.parse(e.at)>end))throw Error('Event outside its active interval '+segment.path);
 activeSeconds+=(end-start)/1000-excluded;previousEnd=end;
}
const verdict=JSON.parse(readFileSync(root+'/verdict.json','utf8'));
if(verdict.reviewerType!=='AI'||verdict.buildHash!==buildHash||verdict.contentVersion!==contentVersion)throw Error('Manual verdict is not bound to the current build');
const result=activeSeconds>=1800&&verdict.result==='pass'&&verdict.unresolvedIssues.length===0&&counted.reduce((n,s)=>n+s.events.length,0)>=10?'pass':'incomplete';
const report={reviewerType:'AI',humanPlayClaimed:false,buildHash,contentVersion,startedAt:counted[0]?.start??null,endedAt:counted.at(-1)?.end??null,activeSeconds,result,countedSegments:counted.map(s=>({path:s.path,start:s.start,end:s.end,excludedSeconds:s.excludedSeconds??0,events:s.events.length})),excludedSegments:segments.filter(s=>!counted.includes(s)).map(s=>({path:s.path,reason:s.diagnosticOnly?'diagnostic interval':'different/unbound runtime or unfinished'})),method:'Actual CUA clicks, typed/kana-pad input, screenshots, reading assessment and CPU/turn observation. Coding/reporting breaks are excluded. Neither injected clocks nor background simulations count.',findings:verdict.findings,screenshots:verdict.screenshots,unresolvedIssues:verdict.unresolvedIssues};
writeFileSync(root+'/review.json',JSON.stringify(report,null,2));console.log({result,activeSeconds,countedSegments:counted.length});
if(result!=='pass')process.exitCode=1;
