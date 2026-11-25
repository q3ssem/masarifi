import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {resolve,extname,relative} from "node:path";
import {chromium} from "playwright";
const root=resolve("core62");
const server=createServer(async(req,res)=>{try{const file=resolve(root,"."+new URL(req.url,"http://localhost").pathname);if(relative(root,file).startsWith(".."))throw Error("path");const body=await readFile(file);res.setHeader("Content-Type",{".html":"text/html;charset=utf-8",".mjs":"text/javascript;charset=utf-8",".css":"text/css;charset=utf-8"}[extname(file)]||"application/octet-stream");res.end(body);}catch{res.statusCode=404;res.end("Not found");}});
await new Promise(r=>server.listen(0,"127.0.0.1",r));const url="http://127.0.0.1:"+server.address().port+"/app/index.html";
const browser=await chromium.launch({headless:true});try{
 const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();const errors=[];page.on("pageerror",e=>errors.push(String(e)));await page.goto(url);
 await page.getByRole("button",{name:"الحسابات والحركات",exact:true}).click();await page.locator("#action").selectOption("account");await page.locator("#name").fill("حساب اختبار");await page.locator("#initial").fill("1000");await page.locator("#form button[type=submit]").click();await page.locator("#message").getByText(/تم التنفيذ/).waitFor();
 await page.getByRole("button",{name:"التقارير والبيانات",exact:true}).click();await page.locator("#vaultPassword").fill("synthetic-strong-passphrase");await page.locator("#saveLocal").click();await page.locator("#dataStatus").getByText(/تمت معاملة الحفظ/).waitFor({timeout:30000});
 await page.reload();await page.getByRole("button",{name:"التقارير والبيانات",exact:true}).click();await page.locator("#vaultPassword").fill("synthetic-strong-passphrase");await page.locator("#openLocal").click();await page.locator("#dataStatus").getByText(/تم فتح الخزنة/).waitFor({timeout:30000});
 await page.getByRole("button",{name:"الحسابات والحركات",exact:true}).click();await page.locator("#view").getByText("حساب اختبار",{exact:true}).waitFor();
 const storage=await page.evaluate(async()=>{const mod=await import("/src/journal-store.mjs");const db1=await mod.openJournalStore(indexedDB),db2=await mod.openJournalStore(indexedDB);const h=await db1.read();const [x,y]=await Promise.all([db1.save(h.generation,h.envelope),db2.save(h.generation,h.envelope)]);db1.close();db2.close();return {statuses:[x.status,y.status].sort(),plaintext:JSON.stringify(h).includes("حساب اختبار")};});assert.deepEqual(storage.statuses,["CONFLICT","SAVED"]);assert.equal(storage.plaintext,false);
 for(const width of [320,390,768,1024]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,"horizontal overflow "+width);}
 assert.deepEqual(errors,[]);console.log("Chromium app save/reload/restore, two-connection CAS and four viewport checks passed.");
 }finally{await browser.close();server.close();}
