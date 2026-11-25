import assert from "node:assert/strict";
import {mkdtemp,readFile,writeFile,mkdir,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createHash,randomBytes,webcrypto} from "node:crypto";
import {createRuntime,createTokenAuthenticator} from "../server/runtime.mjs";
import {createJournalSession} from "../src/journal.mjs";
import {createHttpTransport,preparePush,commitPrepared,inspectRemote} from "../src/journal-sync.mjs";
const root=await mkdtemp(join(tmpdir(),"masarifi-runtime-")),dist=join(root,"public"),db=join(root,"private.sqlite"),hash=x=>createHash("sha256").update(x).digest("hex"),token=randomBytes(32).toString("base64url"),other=randomBytes(32).toString("base64url"),accounts=[{uid:"a",tokenSha256:hash(token)},{uid:"b",tokenSha256:hash(other)}];
let s;const stop=async()=>{if(s){s.closeAllConnections();await new Promise(r=>s.close(r));s=null;}};
try{await mkdir(join(dist,"app"),{recursive:true});const html=Buffer.from("<!doctype html><title>synthetic</title>");await writeFile(join(dist,"app/index.html"),html);await writeFile(join(dist,"build-manifest.json"),JSON.stringify({entry:"app/index.html",assets:[{path:"app/index.html",bytes:html.length,sha256:hash(html)}]}));
const start=async()=>{s=await createRuntime({dist,database:db,accounts});await new Promise(r=>s.listen(0,"127.0.0.1",r));return "http://127.0.0.1:"+s.address().port;};
let url=await start();assert.equal(await (await fetch(url)).text(),html.toString());assert.equal((await fetch(url+"/build-manifest.json")).status,404);assert.equal((await fetch(url+"/private.sqlite")).status,404);assert.equal((await fetch(url+"/v1/vault")).status,401);
const trans=(u,t)=>createHttpTransport({baseURL:u,token:t,fetchImpl:fetch,allowLocalTest:true});const journal=createJournalSession();journal.apply("domain",{type:"record",id:"r1",direction:"out",amountMinor:123,date:"2026-12-01",category:"food",note:"private",accountId:null});const pw="synthetic-strong-password";const a=trans(url,token);const p=await preparePush(a,webcrypto,journal,pw);assert.equal((await commitPrepared(a,p)).status,"ACK");assert.equal((await inspectRemote(trans(url,other),webcrypto,journal,pw)).status,"EMPTY");await stop();url=await start();const r=await inspectRemote(trans(url,token),webcrypto,createJournalSession(),pw);assert.equal(r.status,"REMOTE_AHEAD");assert.deepEqual(r.remote.snapshot(),journal.snapshot());
await stop();await writeFile(join(dist,"app/index.html"),"tampered");await assert.rejects(createRuntime({dist,database:db,accounts}),/runtime-integrity/);await assert.rejects(createRuntime({dist,database:join(dist,"private.sqlite"),accounts}),/database-inside/);assert.throws(()=>createTokenAuthenticator([accounts[0],{...accounts[1],tokenSha256:accounts[0].tokenSha256}]),/auth-config/);
console.log("RC1 packaged runtime: same-origin static allowlist, hashed tokens, isolated accounts, encrypted restart recovery and tamper rejection passed.");
}finally{await stop();await rm(root,{recursive:true,force:true});}
