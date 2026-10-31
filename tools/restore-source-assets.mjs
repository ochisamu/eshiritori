// The source archive stores reviewed raster bytes once, under dist/. Restore build inputs verbatim.
import {readFileSync,mkdirSync,copyFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname,sep} from 'node:path';
const root=resolve('.');
const manifest=JSON.parse(readFileSync('content/image-manifest.json','utf8'));
let copied=0;
for(const asset of manifest)for(const image of Object.values(asset.images)){
 const source=image.path.replace(/^public\//,'dist/');
 if(createHash('sha256').update(readFileSync(source)).digest('hex')!==image.sha256)throw Error('Reviewed image mismatch '+source);
 for(const destination of [image.path,image.stagedPath].filter(Boolean)){
  const path=resolve(destination);if(!path.startsWith(root+sep))throw Error('Unsafe image destination');
  if(existsSync(path)){
   if(createHash('sha256').update(readFileSync(path)).digest('hex')!==image.sha256)throw Error('Existing image differs; preserve it: '+destination);
  }else{mkdirSync(dirname(path),{recursive:true});copyFileSync(source,path);copied++;}
 }
}
console.log(`Verified ${manifest.length} approved concepts; restored ${copied} missing build-input copies without regeneration.`);
