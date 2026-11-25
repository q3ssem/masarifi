import assert from "node:assert/strict";
import {mkdtemp,rm,readFile,writeFile,cp,mkdir,copyFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {chromium,webkit} from "playwright";
import {createServer} from "node:http";
import {extname} from "node:path";
const root=await mkdtemp(join(tmpdir(),"masarifi-offline-")),dist=join(root,"public");
let server,browser;
try{
 execFileSync(process.execPath,["core62/scripts/build-clean-release.mjs",dist],{stdio:"inherit"});
 const manifest=JSON.parse(await readFile(join(dist,"build-manifest.json"),"utf8"));assert.equal(manifest.cloudSync,false);assert.ok(!manifest.assets.some(a=>a.path.includes("journal-sync")||a.path.startsWith("server/")));
 const files=new Map();for(const a of manifest.assets){const body=await readFile(join(dist,a.path));assert.equal(createHash("sha256").update(body).digest("hex"),a.sha256);files.set("/"+a.path,body);}
 const mime={".html":"text/html; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".png":"image/png",".webmanifest":"application/manifest+json"};
 server=createServer((req,res)=>{if(req.url==="/"){res.writeHead(302,{location:"/app/index.html"});res.end();return;}const body=files.get(req.url);if(req.method!=="GET"||!body){res.writeHead(404);res.end();return;}res.writeHead(200,{"content-type":mime[extname(req.url)],"cache-control":"no-store"});res.end(body);});
 await new Promise(r=>server.listen(0,"127.0.0.1",r));const origin="http://127.0.0.1:"+server.address().port,url=origin+"/app/index.html";
 browser=await (process.env.BROWSER_ENGINE==="webkit"?webkit:chromium).launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844}});let page=await context.newPage();
 await page.goto(origin);assert.equal(page.url(),url);assert.equal((await fetch(origin+"/v1/vault")).status,404);assert.equal(await page.locator("#syncPanel").count(),0);
 await page.waitForFunction(()=>navigator.serviceWorker.controller!==null,{},{timeout:60000});
 await page.locator("#offlineStatus").getByText(/جاهزة للعمل دون اتصال/).waitFor();
 const shell=await page.evaluate(async()=>{const names=(await caches.keys()).filter(n=>n.startsWith("masarifi62-shell-"));const cache=await caches.open(names[0]);return (await cache.keys()).map(r=>new URL(r.url).pathname);});
 assert.ok(shell.includes("/app/index.html")&&shell.includes("/src/journal.mjs"));assert.ok(shell.every(p=>p.startsWith("/app/")||p.startsWith("/src/")));assert.ok(!shell.includes("/v1/vault"));assert.ok(!shell.includes("/src/journal-sync.mjs"));
 await page.locator("#moreToggle").click();await page.locator("#moreNav").getByRole("button",{name:"الحسابات والحركات",exact:true}).click();
 await page.locator("#action").selectOption("account");await page.locator("#name").fill("Offline synthetic");assert.equal(await page.locator("#initial").inputValue(),"0");await page.locator("#form button[type=submit]").click();await page.locator("#message").getByText(/تم التنفيذ/).waitFor();
 await page.locator("#nav").getByRole("button",{name:"التقارير والبيانات",exact:true}).click();await page.locator("#vaultPassword").fill("synthetic-offline-password");await page.locator("#saveLocal").click();await page.locator("#dataStatus").getByText(/تمت معاملة الحفظ/).waitFor({timeout:30000});
 // Build a second real package from an isolated synthetic source copy; never edit tracked files.
 const fixture=join(root,"upgrade-source"),fixtureCore=join(fixture,"core62"),nextDist=join(root,"public-next");
 await mkdir(fixtureCore,{recursive:true});for(const part of ["app","src","scripts"])await cp("core62/"+part,join(fixtureCore,part),{recursive:true});for(const n of [180,192,512])await copyFile("icon-"+n+".png",join(fixture,"icon-"+n+".png"));
 const entry=join(fixtureCore,"app/index.html"),oldHtml=await readFile(entry,"utf8");await writeFile(entry,oldHtml.replace("</title>"," | upgrade witness</title>"));
 execFileSync(process.execPath,[join(fixtureCore,"scripts/build-clean-release.mjs"),nextDist],{stdio:"inherit"});
 const nextManifest=JSON.parse(await readFile(join(nextDist,"build-manifest.json"),"utf8"));assert.notEqual(nextManifest.assets.find(a=>a.path==="app/offline-worker.mjs").sha256,manifest.assets.find(a=>a.path==="app/offline-worker.mjs").sha256);
 const firstCache=await page.evaluate(async()=> (await caches.keys()).find(n=>n.startsWith("masarifi62-shell-")));
 const otherScopeCache="masarifi62-shell-"+encodeURIComponent(origin+"/other/app/")+"-witness";await page.evaluate(async name=>{await caches.open(name);},otherScopeCache);
 for(const a of nextManifest.assets){const body=await readFile(join(nextDist,a.path));assert.equal(createHash("sha256").update(body).digest("hex"),a.sha256);files.set("/"+a.path,body);}
 await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});
 await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration())?.waiting,{},{timeout:60000});
 assert.ok(!(await page.title()).includes("upgrade witness"));assert.ok(await page.evaluate(async name=>(await caches.keys()).includes(name),firstCache));
 await page.close();for(let attempt=0;attempt<20;attempt++){page=await context.newPage();await page.goto(url);if((await page.title()).includes("upgrade witness"))break;await page.close();await new Promise(r=>setTimeout(r,250));}
 assert.ok((await page.title()).includes("upgrade witness"));await page.waitForFunction(()=>navigator.serviceWorker.controller!==null,{},{timeout:60000});
 await page.waitForFunction(async name=>!(await caches.keys()).includes(name),firstCache,{timeout:60000});assert.ok(await page.evaluate(async name=>(await caches.keys()).includes(name),otherScopeCache));
 await page.locator("#nav").getByRole("button",{name:"التقارير والبيانات",exact:true}).click();await page.locator("#vaultPassword").fill("synthetic-offline-password");await page.locator("#openLocal").click();await page.locator("#dataStatus").getByText(/تم فتح الخزنة/).waitFor({timeout:30000});
 await page.locator("#moreToggle").click();await page.locator("#moreNav").getByRole("button",{name:"الحسابات والحركات",exact:true}).click();await page.locator("#view").getByText("Offline synthetic · نقدي",{exact:true}).waitFor();
 // Cut the real HTTP origin, not just a browser automation network flag.
 // Chromium and WebKit must both recover from the cache with no reachable server.
 server.closeAllConnections();await new Promise(r=>server.close(r));server=null;
 await assert.rejects(fetch(origin+"/app/index.html"));
 await page.reload();await page.locator("#nav").getByRole("button",{name:"التقارير والبيانات",exact:true}).click();await page.locator("#vaultPassword").fill("synthetic-offline-password");await page.locator("#openLocal").click();await page.locator("#dataStatus").getByText(/تم فتح الخزنة/).waitFor({timeout:30000});
 await page.locator("#moreToggle").click();await page.locator("#moreNav").getByRole("button",{name:"الحسابات والحركات",exact:true}).click();await page.locator("#view").getByText("Offline synthetic · نقدي",{exact:true}).waitFor();
 await page.locator("#action").selectOption("record");await page.locator("#amt").fill("12.34");await page.locator("#note").fill("Offline added after upgrade");await page.locator("#form button[type=submit]").click();await page.locator("#message").getByText(/تم التنفيذ/).waitFor();
 assert.match(await page.locator("#saveState").textContent(),/غير محفوظة/);
 await page.locator("#nav").getByRole("button",{name:"التقارير والبيانات",exact:true}).click();await page.locator("#vaultPassword").fill("synthetic-offline-password");await page.locator("#saveLocal").click();await page.locator("#dataStatus").getByText(/تمت معاملة الحفظ/).waitFor({timeout:30000});assert.match(await page.locator("#saveState").textContent(),/تم حفظ هذه المراجعة/);
 await page.reload();await page.locator("#nav").getByRole("button",{name:"التقارير والبيانات",exact:true}).click();await page.locator("#vaultPassword").fill("synthetic-offline-password");await page.locator("#openLocal").click();await page.locator("#dataStatus").getByText(/تم فتح الخزنة/).waitFor({timeout:30000});await page.locator("#moreToggle").click();await page.locator("#moreNav").getByRole("button",{name:"الحسابات والحركات",exact:true}).click();await page.locator("#view").getByText(/Offline added after upgrade/).waitFor();
 const api=await page.evaluate(async()=>{try{return (await fetch("/v1/vault")).status;}catch{return "NETWORK_UNAVAILABLE";}});assert.equal(api,"NETWORK_UNAVAILABLE");
 await context.close();console.log("Packaged shell reload with origin actually stopped, encrypted vault restoration, and no financial API passed.");
}finally{if(browser)await browser.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await rm(root,{recursive:true,force:true});}
