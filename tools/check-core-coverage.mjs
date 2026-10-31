import {readFileSync,writeFileSync} from 'node:fs';
const coverage=JSON.parse(readFileSync('coverage/coverage-final.json','utf8'));
const core=['normalization.ts','rules.ts','state.ts','cpu.ts','boardGenerator.ts','refill.ts','cpuPresentation.ts'];
const rows=Object.entries(coverage).filter(([path])=>core.some(name=>path.endsWith('/game/'+name))).map(([path,value])=>{
 const counts=Object.values(value.b).flat();return {file:path.split('/').at(-1),covered:counts.filter(n=>n>0).length,total:counts.length};
});
if(rows.length!==core.length)throw Error('Missing core coverage files');
const covered=rows.reduce((n,r)=>n+r.covered,0),total=rows.reduce((n,r)=>n+r.total,0),percent=100*covered/total;
const report={generatedAt:new Date().toISOString(),scope:core,covered,total,branchPercent:percent,required:90,passed:percent>=90,files:rows};
writeFileSync('reports/core-coverage.json',JSON.stringify(report,null,2));
console.log(`Core rule/normalization/state/CPU/generator branches: ${percent.toFixed(2)}% (required 90%)`);
if(!report.passed)process.exitCode=1;
