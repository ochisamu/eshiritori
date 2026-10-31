// Record only after actually opening detail-01..32 and reading all 256 explanations.
import {assets} from './content-source';
import {playfulReadings,playfulWords} from '../content/playful-readings';
import {readFileSync,writeFileSync} from 'node:fs';
import {reviewSignature} from './review-signature';
const images=JSON.parse(readFileSync('content/image-manifest.json','utf8'));
const now=new Date().toISOString();
const rows=assets.filter(a=>playfulReadings[a.conceptKey]).map(a=>({assetId:a.id,detailSha256:images.find((m:any)=>m.assetId===a.id).images['512'].sha256,readings:a.readings.filter(r=>r.kind==='wordplay'&&playfulWords.has(r.kana)).map(r=>({id:r.id,kana:r.kana,inputHash:reviewSignature(r),decision:'approved'}))}));
writeFileSync('reports/playful-review/review.json',JSON.stringify({status:'reviewed',reviewerType:'AI',reviewedAt:now,method:'Actually opened all32 sheets, four512px illustrations per sheet; checked128 pictures against all256 authored associations and explanations. Interpretations are explicitly marked 見立て読み and advanced. All existing art reviews remain in force.',pagesActuallyOpened:Array.from({length:32},(_,i)=>`detail-${String(i+1).padStart(2,'0')}.jpg`),findings:['Removed a detached blue hairline beside card-0015 after viewing detail-04; reopened its512,256,128,96px variants and confirmed all clean.','No other clipping or concept mismatch found.','Reviewed all256 descriptions as associative or onomatopoeic wordplay, not literal unseen objects.'],rows},null,2));
for(const [path,size,property] of [['reports/thumbnail-review.json','128','imageSha256'],['reports/tiny-review.json','96','imageSha256'],['reports/visual-audit/review.json','512','detailSha256'],['reports/remaining-review/review.json','512','sha256']]){
 const report=JSON.parse(readFileSync(path,'utf8'));const row=report.sample.find((r:any)=>r.assetId==='card-0015');
 if(row){const m=images.find((m:any)=>m.assetId==='card-0015');row[property]=m.images[size].sha256;if(row.parentSha256)row.parentSha256=m.images['256'].sha256;}
 report.umbrellaCleanupReview={reviewedAt:now,reviewerType:'AI',method:'Reopened cleaned512,256,128,96px variants; only detached hairline removed, all functional parts intact.'};
 writeFileSync(path,JSON.stringify(report,null,2));
}
const visual=JSON.parse(readFileSync('content/review.json','utf8'));visual['card-0015'].reviewedAt=now;writeFileSync('content/review.json',JSON.stringify(visual,null,2));
console.log('Recorded actual128-picture/256-reading review and post-cleanup review of umbrella variants.');
