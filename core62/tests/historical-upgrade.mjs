async function choose(p,id,value){const select=p.locator("#"+id);if(await select.isVisible()){await select.selectOption(value);return;}if(id==="action"){await p.locator("#openOperations").click();await p.locator("#operationDialog [data-operation="+JSON.stringify(value)+"]").click();}else await p.locator("#"+id+"Choices [data-choice="+JSON.stringify(value)+"]").click();}
import assert from "node:assert/strict";
import {mkdtemp,rm,readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {resolve,join,extname} from "node:path";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {createServer} from "node:http";
import {chromium,webkit} from "playwright";
const roots=process.argv.slice(2);assert.equal(roots.length,2);
const root=await mkdtemp(join(tmpdir(),"masarifi-historical-"));
const password="synthetic-historical-password";
const engine=process.env.BROWSER_ENGINE==="webkit"?"webkit":"chromium";
const expectedVersions=["62.7.0-rc1.19-local-dev","62.7.0-rc2.10-local-dev"];
const sha=b=>createHash("sha256").update(b).digest("hex");
const mime={".html":"text/html; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".ttf":"font/ttf",".txt":"text/plain",".css":"text/css; charset=utf-8",".png":"image/png",".webmanifest":"application/manifest+json"};
async function build(src,dest){execFileSync(process.execPath,[resolve(src,"core62/scripts/build-clean-release.mjs"),dest],{stdio:"inherit"});const m=JSON.parse(await readFile(join(dest,"build-manifest.json"),"utf8"));assert.equal(m.cloudSync,false);assert.equal(m.releaseAuthorized,false);const files=new Map();for(const a of m.assets){const body=await readFile(join(dest,a.path));assert.equal(sha(body),a.sha256);files.set("/"+a.path,body);}return {m,files};}
let browser;
try{
 const next=await build(process.cwd(),join(root,"rc3"));assert.equal(next.m.version,"62.7.0-rc3.14-local-dev");
 browser=await (engine==="webkit"?webkit:chromium).launch({headless:true});
 for(const [i,src] of roots.entries()){
 const old=await build(src,join(root,"old"+i));assert.equal(old.m.version,expectedVersions[i]);
 let files=old.files,server,context,portable;
 try{
 server=createServer((req,res)=>{const body=files.get(req.url);if(req.method!=="GET"||!body){res.writeHead(404);res.end();return;}res.writeHead(200,{"content-type":mime[extname(req.url)],"cache-control":"no-store"});res.end(body);});
 await new Promise(r=>server.listen(0,"127.0.0.1",r));const origin="http://127.0.0.1:"+server.address().port,url=origin+"/app/index.html";
 context=await browser.newContext({viewport:{width:390,height:844}});let page=await context.newPage();
 const errors=[];const watch=p=>p.on("pageerror",e=>errors.push(String(e)));watch(page);
 const cash=async p=>{await p.locator("#moreToggle").click();await p.locator("#moreNav").getByRole("button",{name:"الحسابات والحركات",exact:true}).click();};
 const reports=async p=>{await p.locator("#nav").getByRole("button",{name:"التقارير والبيانات",exact:true}).click();};
 const enter=async(p,action,fields)=>{await choose(p,"action",action);for(const [k,v] of Object.entries(fields)){const el=p.locator("#"+k);if(await el.evaluate(e=>e.tagName)==="SELECT")await choose(p,k,v);else await el.fill(v);}await p.locator("#form button[type=submit]").click();await p.locator("#message").getByText(/تم التنفيذ/).waitFor({timeout:30000});};
 const save=async p=>{await reports(p);await p.locator("#vaultPassword").fill(password);await p.locator("#saveLocal").click();await p.locator("#dataStatus").getByText(/تمت معاملة الحفظ/).waitFor({timeout:30000});};
 const open=async p=>{await reports(p);await p.locator("#vaultPassword").fill(password);await p.locator("#openLocal").click();await p.locator("#dataStatus").getByText(/تم فتح الخزنة/).waitFor({timeout:30000});};
 const inspect=async p=>p.evaluate(async pw=>{const {openJournalStore,loadEncrypted}=await import("/src/journal-store.mjs");const store=await openJournalStore(indexedDB);try{const x=await loadEncrypted(store,crypto,pw);if(x.status!=="LOADED")throw Error("vault unavailable");const s=x.session.snapshot();const account=s.domain.accounts[0];const balance=await import("/src/domain.mjs").then(m=>m.accountBalances(s.domain)[0].balanceMinor);return {generation:x.generation,journal:x.session.exportJournal(),balance,accountId:account.id,records:s.domain.movements.map(m=>({id:m.id,amount:m.amountMinor,direction:m.direction,note:m.note})),planned:s.plannedRecords.map(m=>({id:m.id,amount:m.amountMinor,note:m.note}))};}finally{store.close();}},password);
 await page.goto(url);await page.waitForFunction(()=>navigator.serviceWorker.controller!==null,{},{timeout:60000});assert.ok(!(await page.title()).includes("RC3.14"));
 await cash(page);await enter(page,"account",{name:"Historical wallet",initial:"1000"});await choose(page,"action","record");const accountId=await page.locator("#accountId option").filter({hasText:"Historical wallet"}).getAttribute("value");assert.ok(accountId);
 await enter(page,"record",{direction:"out",amt:"12.34",note:"Historical expense",category:"food",accountId});
 await enter(page,"record",{direction:"in",amt:"20.00",note:"Historical income",accountId});
 const tomorrow=await page.evaluate(()=>{const d=new Date();d.setDate(d.getDate()+1);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");});
 await enter(page,"record",{direction:"out",amt:"1.00",date:tomorrow,note:"Historical planned",category:"food",accountId:""});
 await save(page);const before=await inspect(page);assert.equal(before.balance,100766);assert.equal(before.records.length,2);assert.equal(before.planned.length,1);assert.equal(before.journal.commands.length,4);
 await page.locator("#vaultPassword").fill(password);const pending=page.waitForEvent("download");await page.locator("#exportBackup").click();const download=await pending,backup=await readFile(await download.path());assert.equal(JSON.parse(backup).format,"masarifi62-backup");
 // First serve a candidate with one altered shell asset. The new worker must fail
 // integrity validation without taking over or deleting the active old shell.
 const damaged=new Map(next.files),bad=Buffer.from(damaged.get("/app/app.mjs"));bad[0]^=1;damaged.set("/app/app.mjs",bad);files=damaged;
 const failed=await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return new Promise(resolve=>{let done=false;const end=v=>{if(!done){done=true;clearTimeout(timer);resolve(v);}};const timer=setTimeout(()=>end("timeout"),30000);r.addEventListener("updatefound",()=>{const worker=r.installing;if(!worker)return;const check=()=>{if(worker.state==="redundant")end("redundant");if(worker.state==="installed"||worker.state==="activated")end("unexpected-install");};worker.addEventListener("statechange",check);check();},{once:true});r.update().catch(()=>end("update-rejected"));});});
 assert.ok(["redundant","update-rejected"].includes(failed),"damaged update must fail: "+failed);assert.ok(!(await page.title()).includes("RC3.14"));assert.deepEqual(await inspect(page),before);
 files=next.files;await page.evaluate(async()=>{const registration=await navigator.serviceWorker.getRegistration();await registration.update();});
 await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration())?.waiting,{},{timeout:60000});assert.ok(!(await page.title()).includes("RC3.14"));
 await page.close();for(let attempt=0;attempt<30;attempt++){page=await context.newPage();watch(page);await page.goto(url);if((await page.title()).includes("RC3.14"))break;await page.close();await new Promise(r=>setTimeout(r,250));}
 assert.match(await page.title(),/RC3\.14/);await page.waitForFunction(()=>navigator.serviceWorker.controller!==null,{},{timeout:60000});
 await open(page);assert.deepEqual(await inspect(page),before);
 // The actual old encrypted file must also restore in a fresh RC3 context.
 portable=await browser.newContext({viewport:{width:390,height:844}});const fresh=await portable.newPage();watch(fresh);await fresh.goto(url);await reports(fresh);
 await fresh.locator("#importFile").setInputFiles({name:"historical.json",mimeType:"application/json",buffer:backup});await fresh.locator("#vaultPassword").fill(password);await fresh.locator("#inspectImport").click();await fresh.locator("#importInfo").getByText(/معاينة ناجحة/).waitFor({timeout:30000});await fresh.locator("#applyImport").click();await fresh.locator("#dataStatus").getByText(/تم الاستيراد للجلسة/).waitFor();
 await fresh.locator("#vaultPassword").fill(password);await fresh.locator("#saveLocal").click();await fresh.locator("#dataStatus").getByText(/تمت معاملة الحفظ/).waitFor({timeout:30000});const restored=await inspect(fresh);assert.deepEqual(restored.journal,before.journal);assert.equal(restored.balance,before.balance);await portable.close();portable=null;
 server.closeAllConnections();await new Promise(r=>server.close(r));server=null;await assert.rejects(fetch(url));await page.reload();await open(page);await cash(page);await enter(page,"record",{direction:"out",amt:"1.01",note:"After real upgrade offline",category:"food",accountId});
 await save(page);await page.reload();await open(page);const after=await inspect(page);assert.equal(after.balance,100665);assert.equal(after.records.length,3);assert.deepEqual(after.planned,before.planned);assert.deepEqual(after.journal.commands.slice(0,4),before.journal.commands);assert.equal(after.journal.commands.length,5);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({from:old.m.version,to:next.m.version,engine,oldCommands:4,newCommands:5,priorBalance:100766,afterBalance:100665,encryptedBackup:"PASS",actualOffline:"PASS",historicalUpgrade:"PASS",damagedUpdateRejected:"PASS"}));
 }finally{if(portable)await portable.close();if(context)await context.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}}
 }
}finally{if(browser)await browser.close();await rm(root,{recursive:true,force:true});}
