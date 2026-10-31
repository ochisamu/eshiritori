import {spawn} from 'node:child_process';
import {createWriteStream,writeFileSync,readFileSync} from 'node:fs';
import {runtimeHash} from './runtime-files.mjs';
const buildHash=runtimeHash(),token=Date.now(),results=[];
async function run(name,args,env,output){
 const startedAt=new Date().toISOString(),begin=performance.now(),stream=createWriteStream(output);
 const child=spawn(process.execPath,args,{env:{...process.env,...env},stdio:['ignore','pipe','pipe']});
 child.stdout.pipe(stream,{end:false});child.stderr.pipe(stream,{end:false});
 const exitCode=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});stream.end();
 const row={name,startedAt,durationMs:performance.now()-begin,exitCode,output,runId:env.TEST_RUN_ID??null};results.push(row);
 writeFileSync('reports/final-suite-run.json',JSON.stringify({buildHash,results},null,2));console.log(row);
 if(exitCode!==0)throw Error(name+' failed; see '+output);
 if(runtimeHash()!==buildHash)throw Error('Runtime changed during release suites');
}
if(process.env.RELEASE_REUSE_PERF==='1') {
 const prior=JSON.parse(readFileSync('reports/final-suite-run.json'));
 const perf=JSON.parse(readFileSync('reports/performance-results.json'));
 const suite=JSON.parse(readFileSync('reports/e2e-performance-release.json'));
 const row=prior.results.find(r=>r.name==='throttled performance and520 UI rounds');
 if(prior.buildHash!==buildHash||perf.environment.buildHash!==buildHash||suite.stats.expected!==3||suite.stats.unexpected!==0||row?.exitCode!==0||row.runId!==suite.config.metadata.runId)throw Error('Performance evidence is not a completed execution on this exact runtime');
 results.push({...row,reusedCompletedExecution:true});
 console.log('Reusing completed performance execution on unchanged runtime',row.runId);
} else await run('throttled performance and520 UI rounds',['node_modules/@playwright/test/cli.js','test','tests/e2e/performance.spec.ts','--project=chromium'],{TEST_RUN_ID:`release-${token}-performance`,TEST_BASE_URL:'http://127.0.0.1:4174',PW_JSON_OUTPUT:'reports/e2e-performance-release.json'},'reports/e2e-performance-release-final.txt');
const deps=process.cwd()+'/.cache/webkit-deps';
const outcomes=await Promise.allSettled([
 run('three-engine journeys, faults and all4096 decodes',['node_modules/@playwright/test/cli.js','test','tests/e2e/game.spec.ts','tests/e2e/journeys.spec.ts','tests/e2e/recovery.spec.ts','tests/e2e/refill.spec.ts'],{TEST_RUN_ID:`release-${token}-ui`,TEST_WEBKIT:'1',PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS:'1',LIBGL_ALWAYS_SOFTWARE:'1',__EGL_VENDOR_LIBRARY_FILENAMES:deps+'/usr/share/glvnd/egl_vendor.d/50_mesa.json',LD_LIBRARY_PATH:deps+'/usr/lib/x86_64-linux-gnu:'+deps+'/lib/x86_64-linux-gnu',GSETTINGS_SCHEMA_DIR:deps+'/usr/share/glib-2.0/schemas',TEST_BASE_URL:'http://127.0.0.1:4174',PW_JSON_OUTPUT:'reports/e2e-final.json'},'reports/e2e-final.txt'),
 run('30000 seeds and10000 rounds',['tools/stress-parallel.mjs'],{},'reports/stress-parallel-v3-final.txt')
]);
if(outcomes.some(r=>r.status==='rejected')) { for(const r of outcomes)if(r.status==='rejected')console.error(r.reason);process.exitCode=1; }
