import assert from "node:assert/strict";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {chromium,webkit} from "playwright";
import {createRuntime} from "../server/runtime.mjs";
const root=await mkdtemp(join(tmpdir(),"masarifi-offline-")),dist=join(root,"public");
let server,browser;
try{
 execFileSync(process.execPath,["core62/scripts/build-clean-release.mjs",dist],{stdio:"inherit"});
 server=await createRuntime({dist,database:join(root,"private.sqlite"),accounts:[{uid:"synthetic",tokenSha256:createHash("sha256").update("synthetic").digest("hex")}]});
 await new Promise(r=>server.listen(0,"127.0.0.1",r));const origin="http://127.0.0.1:"+server.address().port,url=origin+"/app/index.html";
 browser=await (process.env.BROWSER_ENGINE==="webkit"?webkit:chromium).launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
 await page.goto(origin);assert.equal(page.url(),url);
 await page.waitForFunction(()=>navigator.serviceWorker.controller!==null,{},{timeout:60000});
 await page.locator("#offlineStatus").getByText(/جاهزة للعمل دون اتصال/).waitFor();
 const shell=await page.evaluate(async()=>{const names=(await caches.keys()).filter(n=>n.startsWith("masarifi62-shell-"));const cache=await caches.open(names[0]);return (await cache.keys()).map(r=>new URL(r.url).pathname);});
 assert.ok(shell.includes("/app/index.html")&&shell.includes("/src/journal.mjs"));assert.ok(shell.every(p=>p.startsWith("/app/")||p.startsWith("/src/")));assert.ok(!shell.includes("/v1/vault"));
 await page.locator("#moreToggle").click();await page.locator("#moreNav").getByRole("button",{name:"الحسابات والحركات",exact:true}).click();
 await page.locator("#action").selectOption("account");await page.locator("#name").fill("Offline synthetic");await page.locator("#form button[type=submit]").click();await page.locator("#message").getByText(/تم التنفيذ/).waitFor();
 await page.locator("#nav").getByRole("button",{name:"التقارير والبيانات",exact:true}).click();await page.locator("#vaultPassword").fill("synthetic-offline-password");await page.locator("#saveLocal").click();await page.locator("#dataStatus").getByText(/تمت معاملة الحفظ/).waitFor({timeout:30000});
 // Cut the real HTTP origin, not just a browser automation network flag.
 // Chromium and WebKit must both recover from the cache with no reachable server.
 server.closeAllConnections();await new Promise(r=>server.close(r));server=null;
 await assert.rejects(fetch(origin+"/app/index.html"));
 await page.reload();await page.locator("#nav").getByRole("button",{name:"التقارير والبيانات",exact:true}).click();await page.locator("#vaultPassword").fill("synthetic-offline-password");await page.locator("#openLocal").click();await page.locator("#dataStatus").getByText(/تم فتح الخزنة/).waitFor({timeout:30000});
 await page.locator("#moreToggle").click();await page.locator("#moreNav").getByRole("button",{name:"الحسابات والحركات",exact:true}).click();await page.locator("#view").getByText("Offline synthetic",{exact:true}).waitFor();
 const api=await page.evaluate(async()=>{try{return (await fetch("/v1/vault")).status;}catch{return "NETWORK_UNAVAILABLE";}});assert.equal(api,"NETWORK_UNAVAILABLE");
 await context.close();console.log("Packaged shell reload with origin actually stopped, encrypted vault restoration, and unavailable sync API passed.");
}finally{if(browser)await browser.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await rm(root,{recursive:true,force:true});}
