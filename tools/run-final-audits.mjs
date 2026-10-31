import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {runtimeHash} from './runtime-files.mjs';
import {createHash} from 'node:crypto';
import {statSync} from 'node:fs';
const buildHash=runtimeHash(),contentVersion=JSON.parse(readFileSync('src/generated/version.json')).version;
const commands=[
 ['unit and branch coverage','npm',['run','test:coverage'],'reports/unit-final.txt'],
 ['content files, distribution and reading counts','npm',['run','audit'],'reports/audit-final.txt'],
 ['candidate families and high-frequency semantics','npx',['tsx','tools/editorial-audit.ts'],'reports/editorial-final.txt'],
 ['clock/input deterministic replay','npx',['tsx','tools/determinism-audit.ts'],'reports/determinism-run.txt'],
 ['matched CPU comparison','npx',['tsx','tools/cpu-comparison.ts'],'reports/cpu-comparison-run.txt'],
 ['interrupted jobs, QA cache and atomic packaging','python3',['tools/restart-audit.py'],'reports/restart-run.txt'],
];
const results=[];
for(const [name,command,args,output] of commands){
 if(name==='unit and branch coverage'&&process.env.FINAL_REUSE_UNIT==='1'){
  const unit=JSON.parse(readFileSync('reports/unit-results.json')),coverage=JSON.parse(readFileSync('reports/core-coverage.json'));
  const manifest=JSON.parse(readFileSync('dist/.vite/manifest.json'));
  const latestBuild=Math.max(...Object.values(manifest).map(entry=>statSync('dist/'+entry.file).mtimeMs));
  if(unit.numFailedTests!==0||unit.numPassedTests<84||!unit.success||!coverage.passed||unit.startTime<latestBuild)throw Error('Prior full unit evidence is not fresh enough to reuse');
  const row={name,command:'npm run test:coverage',startedAt:new Date(unit.startTime).toISOString(),durationMs:Date.parse(coverage.generatedAt)-unit.startTime,exitCode:0,evidencePath:'reports/unit-fallback-v3.txt',reusedCompletedExecution:true,unitResultsSha256:createHash('sha256').update(readFileSync('reports/unit-results.json')).digest('hex'),coverageSha256:createHash('sha256').update(readFileSync('reports/core-coverage.json')).digest('hex')};
  results.push(row);console.log(row);continue;
 }
 const startedAt=new Date().toISOString(),begin=performance.now();
 const result=spawnSync(command,args,{encoding:'utf8',maxBuffer:64*1024*1024});
 writeFileSync(output,(result.stdout??'')+(result.stderr??''));
 const row={name,command:[command,...args].join(' '),startedAt,durationMs:performance.now()-begin,exitCode:result.status,evidencePath:output};
 results.push(row);console.log(row);
 writeFileSync('reports/final-audits.json',JSON.stringify({buildHash,contentVersion,results},null,2));
 if(result.status!==0)process.exit(result.status??1);
 if(runtimeHash()!==buildHash)throw Error('Runtime changed during final audits');
}
