import {createServer} from "node:http";
import {readFile,mkdir,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {chromium,webkit} from "playwright";
import assert from "node:assert/strict";
const engine=process.env.BROWSER_ENGINE==="webkit"?"webkit":"chromium";
const server=createServer(async(req,res)=>{try{if(req.method!=="GET")throw Error("method");if(req.url==="/"){res.writeHead(200,{"content-type":"text/html;charset=utf-8"});res.end("<!doctype html><title>Isolated encrypted vault witness</title>");return;}if(!/^\/src\/[A-Za-z0-9_-]+\.mjs$/.test(req.url))throw Error("path");const content=await readFile(resolve("core62"+req.url));res.writeHead(200,{"content-type":"text/javascript;charset=utf-8"});res.end(content);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,"127.0.0.1",r));let browser;
try{
 browser=await (engine==="webkit"?webkit:chromium).launch({headless:true});const context=await browser.newContext();const page=await context.newPage(),errors=[];page.on("pageerror",e=>errors.push(String(e)));await page.goto("http://127.0.0.1:"+server.address().port+"/");assert.equal(await page.evaluate(()=>isSecureContext),true);
 const result=await page.evaluate(async()=>{
  const {createJournalSession}=await import("/src/journal.mjs"),{openJournalStore,saveEncrypted,loadEncrypted,recoverPreviousEncrypted}=await import("/src/journal-store.mjs"),{encryptBackup}=await import("/src/secure-backup.mjs");
  const check=(ok,msg)=>{if(!ok)throw Error(msg);},password="synthetic-audit04-only-password",s=createJournalSession(),record=(id,amountMinor=101)=>({type:"record",id,direction:"out",amountMinor,date:"2026-12-02",category:"food",note:"synthetic",accountId:null});
  const t=performance.now();check(s.applyRecords(Array.from({length:19990},(_,i)=>record("stress_"+i))).status==="APPLIED_SHADOW","journal batch");const batchMs=Math.round(performance.now()-t);
  const a=await openJournalStore(indexedDB),b=await openJournalStore(indexedDB);
  try{const first=await saveEncrypted(a,crypto,s,password,0);check(first.status==="SAVED"&&first.next.generation===1,"first encrypted save");
   const left=await loadEncrypted(a,crypto,password),right=await loadEncrypted(b,crypto,password);check(left.session.journalInfo().commands===19990&&right.session.journalInfo().commands===19990,"restore large journal");check(JSON.stringify(left.session.exportJournal())===JSON.stringify(s.exportJournal()),"roundtrip");
   check(left.session.apply("domain",record("left",102)).status==="APPLIED_SHADOW","left mutation");check(right.session.apply("domain",record("right",103)).status==="APPLIED_SHADOW","right mutation");
   const winners=await Promise.all([saveEncrypted(a,crypto,left.session,password,1),saveEncrypted(b,crypto,right.session,password,1)]);check(winners.filter(x=>x.status==="SAVED").length===1&&winners.filter(x=>x.status==="CONFLICT").length===1,"two-connection compare and swap");
   const win=await loadEncrypted(a,crypto,password);check(win.generation===2&&win.session.journalInfo().commands===19991,"winner restored");const winningSession=winners[0].status==="SAVED"?left.session:right.session;check(JSON.stringify(win.session.exportJournal())===JSON.stringify(winningSession.exportJournal()),"winning contents");
   let wrong=false;try{await saveEncrypted(a,crypto,s,"wrong-synthetic-password",2);}catch{wrong=true;}check(wrong&&(await a.read()).generation===2,"wrong password overwrote vault");
   const recovered=await recoverPreviousEncrypted(b,crypto,password,2);check(recovered.status==="RECOVERED"&&recovered.generation===3&&recovered.session.journalInfo().commands===19990,"recover previous");const head=await a.read();check(!!head.quarantine&&!!head.previous,"quarantine preserved");
   const small=await encryptBackup(crypto,JSON.stringify(createJournalSession().exportJournal()),password);let generation=3,accepted=0,conflicts=0;for(let i=0;i<100;i++){const pair=await Promise.all([a.save(generation,small),b.save(generation,small)]);check(pair.filter(x=>x.status==="SAVED").length===1&&pair.filter(x=>x.status==="CONFLICT").length===1,"raw IndexedDB CAS pair "+i);generation++;accepted++;conflicts++;}
   check((await a.read()).generation===103,"final generation");return {journalRows:19990,batchMs,encryptedRaceAccepted:1,encryptedRaceConflicts:1,recoveredGeneration:3,rawAccepted:accepted,rawConflicts:conflicts,finalGeneration:generation,elapsedMs:Math.round(performance.now()-t)};
  }finally{a.close();b.close();}
 });
 assert.deepEqual(errors,[]);await context.close();const evidence={engine,scope:"actual isolated IndexedDB on two connections, synthetic data; not physical device or whole app",...result};await mkdir("dist/audit-04",{recursive:true});await writeFile("dist/audit-04/"+engine+".json",JSON.stringify(evidence,null,2)+"\n");console.log(JSON.stringify(evidence,null,2));
}finally{if(browser)await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
