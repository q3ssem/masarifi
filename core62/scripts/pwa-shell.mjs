import {readFile,writeFile,copyFile} from "node:fs/promises";
import {resolve} from "node:path";
import {createHash} from "node:crypto";
const sha=b=>createHash("sha256").update(b).digest("hex");
export async function addPwaShell(out,source,paths){
 const entry=resolve(out,"app/index.html");
 let html=await readFile(entry,"utf8");
 if(!html.includes("</head>")||!html.includes("</body>"))throw Error("pwa-entry");
 html=html.replace("base-uri 'none'","worker-src 'self'; manifest-src 'self'; img-src 'self'; base-uri 'none'")
 .replace("</head>",'<link rel="manifest" href="./app.webmanifest"><link rel="apple-touch-icon" href="./icon-180.png"></head>')
 .replace("</body>",'<p id="offlineStatus" role="status"></p><script type="module" src="./offline.mjs"></script></body>');
 await writeFile(entry,html);
 const icons=[180,192,512];for(const size of icons)await copyFile(resolve(source,"../icon-"+size+".png"),resolve(out,"app/icon-"+size+".png"));
 const manifest={id:"./index.html",name:"مصاريف",short_name:"مصاريف",lang:"ar",dir:"rtl",start_url:"./index.html",scope:"./",display:"standalone",background_color:"#ffffff",theme_color:"#ffffff",icons:icons.filter(x=>x!==180).map(x=>({src:"./icon-"+x+".png",sizes:x+"x"+x,type:"image/png"}))};
 await writeFile(resolve(out,"app/app.webmanifest"),JSON.stringify(manifest));
 const registration=`const status=document.getElementById("offlineStatus");
 if("serviceWorker" in navigator&&window.isSecureContext){
  const ready=()=>{status.textContent="ملفات التطبيق جاهزة للعمل دون اتصال. افتح الخزنة المشفرة لاستعادة بياناتك."};
  const controlled=()=>{if(navigator.serviceWorker.controller)ready();};\n  navigator.serviceWorker.addEventListener("controllerchange",controlled);\n  navigator.serviceWorker.register("./offline-worker.mjs",{scope:"./",updateViaCache:"none"}).then(async()=>{if(navigator.serviceWorker.controller)ready();else status.textContent="جارٍ تجهيز ملفات العمل دون اتصال." ;await navigator.serviceWorker.ready;controlled();}).catch(()=>{status.textContent="تعذر تجهيز العمل دون اتصال.";});
 }else status.textContent="العمل دون اتصال يحتاج اتصال HTTPS أو بيئة محلية آمنة.";
 `;
 await writeFile(resolve(out,"app/offline.mjs"),registration);
 const shellPaths=[...paths,"app/app.webmanifest","app/offline.mjs",...icons.map(x=>"app/icon-"+x+".png")].sort();
 const entries=await Promise.all(shellPaths.map(async p=>({path:"../"+p,hash:sha(await readFile(resolve(out,p)))})));
 const version=sha(JSON.stringify(entries)).slice(0,24);
 const worker=`const PREFIX="masarifi62-shell-"+encodeURIComponent(self.registration.scope)+"-",CACHE=PREFIX+${JSON.stringify(version)};
 const ENTRIES=${JSON.stringify(entries)};
 const urls=new Map(ENTRIES.map(e=>[new URL(e.path,self.location.href).href,e.hash]));
 const hex=b=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,"0")).join("");
 const verified=async(url,hash)=>{const response=await fetch(url,{cache:"no-store",credentials:"omit",redirect:"error"});if(!response.ok||hex(await crypto.subtle.digest("SHA-256",await response.clone().arrayBuffer()))!==hash)throw Error("shell-integrity");return response;};
 self.addEventListener("install",event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);try{for(const [url,hash] of urls){const response=await verified(url,hash);await cache.put(url,response);}}catch(error){await caches.delete(CACHE);throw error;}})()));
 self.addEventListener("activate",event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==CACHE)await caches.delete(name);await self.clients.claim();})()));
 self.addEventListener("fetch",event=>{const r=event.request;if(r.method!=="GET"||!urls.has(r.url))return;event.respondWith((async()=>{const cache=await caches.open(CACHE);const response=await cache.match(r.url);if(response)return response;const fresh=await verified(r.url,urls.get(r.url));await cache.put(r.url,fresh.clone());return fresh;})());});
 `;
 await writeFile(resolve(out,"app/offline-worker.mjs"),worker);
 return [...shellPaths,"app/offline-worker.mjs"];
}
