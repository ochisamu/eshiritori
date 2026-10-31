import { createHash } from "node:crypto";
import type { Plugin } from "vite";
export function pwaPlugin(): Plugin {
  return {
    name: "local-game-pwa",
    apply: "build",
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle).filter((f) => /[.](js|css)$/.test(f));
      const version = createHash("sha256")
        .update(
          files
            .map((f) => {
              const c = bundle[f];
              return c.type === "chunk" ? c.code : String(c.source);
            })
            .join("|"),
        )
        .digest("hex")
        .slice(0, 12);
      const shell = [
        "./",
        "./index.html",
        "./manifest.json",
        "./icons/app-192.png",
        "./icons/app-512.png",
        "./icons/app-180.png",
        ...files.map((f) => "./" + f),
      ];
      const source = `const SHELL="eshiritori-shell-${version}", ART="eshiritori-art-v1", FILES=${JSON.stringify(shell)};
 self.addEventListener("install",e=>e.waitUntil(caches.open(SHELL).then(c=>c.addAll(FILES))));
 self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("eshiritori-shell-")&&k!==SHELL).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
 let artQueue=Promise.resolve();
 function rememberArt(request,response){artQueue=artQueue.catch(()=>{}).then(async()=>{const cache=await caches.open(ART);await cache.put(request,response);const keys=await cache.keys();for(const key of keys.slice(0,Math.max(0,keys.length-128)))await cache.delete(key);});return artQueue;}
 self.addEventListener("fetch",event=>{const request=event.request,url=new URL(request.url);if(request.method!=="GET"||url.origin!==self.location.origin)return;
 if(request.mode==="navigate"){event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(SHELL).then(c=>c.put("./index.html",copy)));}return response;}).catch(async()=>await caches.match("./index.html")||Response.error()));return;}
 if(url.pathname.endsWith("/sw.js"))return;
 if(/[.](webp|png)$/.test(url.pathname)){event.respondWith(caches.open(ART).then(async cache=>{const hit=await cache.match(request)||await caches.match(request);if(hit)return hit;const response=await fetch(request);if(response.ok)event.waitUntil(rememberArt(request,response.clone()));return response;}));return;}
 if(/[.](js|css|json)$/.test(url.pathname)){event.respondWith(caches.open(SHELL).then(async cache=>{const hit=await cache.match(request);if(hit)return hit;const response=await fetch(request);if(response.ok)event.waitUntil(cache.put(request,response.clone()));return response;}));}
 });`;
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}
