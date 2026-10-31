import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {posix} from 'node:path';
// Vite's current manifest includes worker dependencies. Previous hashed chunks stay on
// the live development server for already-open games, but never enter a new release.
export function runtimeFiles(){
 const manifest=JSON.parse(readFileSync('dist/.vite/manifest.json','utf8'));
 const files=new Set(['index.html','sw.js','manifest.json','icons/app-180.png','icons/app-192.png','icons/app-512.png']);
 for(const entry of Object.values(manifest))for(const file of [entry.file,...(entry.css??[]),...(entry.assets??[])])files.add(file);
 const assets=JSON.parse(readFileSync('src/generated/content.json','utf8'));
 for(const a of assets)for(const url of [a.image,a.detail,a.thumbnail,a.preview].filter(Boolean))files.add(url.replace(/^\.\//,'').split('?')[0]);
 for(const file of files)if(posix.isAbsolute(file)||file.includes('..')||!existsSync('dist/'+file))throw Error('Missing/unsafe runtime file '+file);
 return [...files].sort();
}
export function runtimeHash(){const files=runtimeFiles();return createHash('sha256').update(Buffer.concat(files.flatMap(file=>[Buffer.from(file),readFileSync('dist/'+file)]))).digest('hex');}
