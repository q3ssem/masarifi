import {searchMovements} from "../src/search.mjs";
import {encryptBackup,decryptBackup} from "../src/secure-backup.mjs";
import assert from "node:assert/strict";
import {mkdir,writeFile} from "node:fs/promises";
assert.equal(typeof global.gc,"function","run with --expose-gc");
const pw="synthetic-audit04-password",samples=[];
async function round(){const rows=Array.from({length:20000},(_,i)=>({id:"r"+i,date:"2026-12-01",amountMinor:-101,status:"confirmed",kind:"expense",category:"food",note:"قهوة "+i}));const r=searchMovements(rows,"قهوة");assert.equal(r.total,20000);const p="م".repeat(524288),e=await encryptBackup(crypto,p,pw);assert.equal(await decryptBackup(crypto,e,pw),p);}
await round();global.gc();await new Promise(r=>setImmediate(r));global.gc();const base=process.memoryUsage();
for(let i=0;i<8;i++){await round();global.gc();await new Promise(r=>setImmediate(r));global.gc();const m=process.memoryUsage();samples.push({round:i+1,heapUsed:m.heapUsed,external:m.external,arrayBuffers:m.arrayBuffers,rss:m.rss});}
const evidence={base,samples,heapDelta:samples.at(-1).heapUsed-base.heapUsed,arrayBuffersDelta:samples.at(-1).arrayBuffers-base.arrayBuffers,scope:"diagnostic isolated search and crypto with forced GC; no full-app memory leak proof; no arbitrary threshold"};
await mkdir("dist/audit-04",{recursive:true});await writeFile("dist/audit-04/memory.json",JSON.stringify(evidence,null,2)+"\n");console.log(JSON.stringify(evidence,null,2));
