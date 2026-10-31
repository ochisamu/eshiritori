import {spawn} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync,existsSync,createWriteStream} from 'node:fs';
import {runtimeHash} from './runtime-files.mjs';
const buildHash=runtimeHash(),contentVersion=JSON.parse(readFileSync('src/generated/version.json')).version;
const started=new Date().toISOString(),begin=performance.now(),concurrency=8;
mkdirSync('reports/stress-shards',{recursive:true});
const jobs=[];
for(const difficulty of ['easy','normal','hard'])for(let seedStart=0;seedStart<10000;seedStart+=1000)
 jobs.push({name:`boards-${difficulty}-${String(seedStart).padStart(5,'0')}`,seeds:1000,seedStart,difficulty,runStart:0,runCount:0});
for(let run=0;run<10;run++)jobs.push({name:`simulation-${run}`,seeds:0,seedStart:0,difficulty:['easy','normal','hard'][run%3],runStart:run,runCount:1});
let cursor=0;const completed=[],executionFailures=[];
function valid(report,job){return report.buildHash===buildHash&&report.contentVersion===contentVersion&&report.boards===job.seeds&&report.failures.length===0&&report.environment.seedStart===job.seedStart&&report.environment.seedsPerDifficulty===job.seeds&&report.environment.difficulties.join()===job.difficulty&&report.environment.runStart===job.runStart&&report.environment.runCount===job.runCount&&report.simulations.length===job.runCount&&report.simulations.every(s=>s.rounds===1000&&s.wins+s.losses===1000);}
async function worker(){
 while(cursor<jobs.length){
  const job=jobs[cursor++],output=`reports/stress-shards/${job.name}.json`;
  try {
  let report=existsSync(output)?JSON.parse(readFileSync(output)):null;
  if(report&&report.buildHash!==buildHash){
    const archive=`reports/stress-history/${report.buildHash.slice(0,12)}`;
    mkdirSync(archive,{recursive:true});writeFileSync(`${archive}/${job.name}.json`,JSON.stringify(report,null,2));
    report=null;
  }
  // A recorded failure on this exact build stays a failure; never silently overwrite it.
  const recordedFailure=report?.buildHash===buildHash&&report?.contentVersion===contentVersion&&report?.failures?.length;
  if(!recordedFailure&&(!report||!valid(report,job))){
   const log=createWriteStream(`reports/stress-shards/${job.name}.txt`);
   const child=spawn(process.execPath,['--import','tsx','tools/stress.ts'],{env:{...process.env,AUDIT_SEEDS:String(job.seeds),AUDIT_SEED_START:String(job.seedStart),AUDIT_DIFFICULTIES:job.difficulty,SIM_RUN_START:String(job.runStart),SIM_RUNS:String(job.runCount),STRESS_ROUNDS:'1000',STRESS_OUTPUT:output},stdio:['ignore','pipe','pipe']});
   child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});
   const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});log.end();
   report=JSON.parse(readFileSync(output));
   if(code!==0||!valid(report,job))executionFailures.push({shard:job.name,exitCode:code,error:'Shard failed or produced incomplete evidence'});
  }
  completed.push({job,evidencePath:output,report});
  writeFileSync('reports/stress-progress.json',JSON.stringify({started,buildHash,contentVersion,concurrency,completed:completed.map(({job,evidencePath})=>({name:job.name,evidencePath})),totalJobs:jobs.length},null,2));
  console.log(`${completed.length}/${jobs.length}: ${job.name} (${report.boards} boards, ${report.simulations.length} simulations)`);
  } catch(error){executionFailures.push({shard:job.name,error:String(error)});console.log('Shard error',job.name,String(error));}
 }
}
await Promise.all(Array.from({length:concurrency},()=>worker()));
if(runtimeHash()!==buildHash)throw Error('Runtime changed during stress audit');
const reports=completed.map(c=>c.report);
const result={started,endedAt:new Date().toISOString(),buildHash,contentVersion,assets:JSON.parse(readFileSync('src/generated/content.json')).length,boards:reports.reduce((n,r)=>n+r.boards,0),fallbacks:reports.reduce((n,r)=>n+r.fallbacks,0),failures:[...executionFailures,...reports.flatMap(r=>r.failures)],maxGenerationMs:Math.max(...reports.map(r=>r.maxGenerationMs)),cpuOutputs:reports.reduce((n,r)=>n+r.cpuOutputs,0),simulations:reports.flatMap(r=>r.simulations).sort((a,b)=>a.run-b.run),durationMs:performance.now()-begin,environment:{platform:process.platform,node:process.version,concurrency,logicalCoverage:'acceptance-0…9999, rounds seedIndex%2, each of easy/normal/hard; stress-0…9 each 1000 rounds',timing:'Actual wall-clock per generation under eight concurrent Node processes; independent cases, identical engine/budgets. Not the throttled UI performance benchmark.'},shards:completed.map(({job,evidencePath})=>({...job,evidencePath}))};
if(result.boards!==30000||result.simulations.length!==10||new Set(result.simulations.map(s=>s.run)).size!==10)result.failures.push({error:'Incomplete coverage'});
writeFileSync('reports/stress-results.json',JSON.stringify(result,null,2));
console.log({boards:result.boards,rounds:result.simulations.reduce((n,s)=>n+s.rounds,0),failures:result.failures.length,fallbacks:result.fallbacks,durationMs:result.durationMs});
if(result.failures.length||result.fallbacks/result.boards>=.01)process.exitCode=1;
