import assert from "node:assert/strict";
import {createJournalSession,parseJournal} from "../src/journal.mjs";
const s=createJournalSession(),start=performance.now();for(let i=0;i<2000;i++){const r=s.apply("domain",{type:"record",id:"stress_"+i,direction:"out",amountMinor:101,date:"2026-12-01",category:"food",note:"synthetic",accountId:null});assert.equal(r.status,"APPLIED_SHADOW","command "+i);}
const buildMs=Math.round(performance.now()-start),text=JSON.stringify(s.exportJournal()),t=performance.now(),restored=parseJournal(text),replayMs=Math.round(performance.now()-t);
assert.deepEqual(restored.snapshot(),s.snapshot());assert.equal(restored.snapshot().revision,2000);
assert.equal(restored.apply("domain",{type:"record",id:"extra",direction:"out",amountMinor:101,date:"2026-12-01",category:"food",note:"synthetic",accountId:null}).code,"journal-limit");
console.log(JSON.stringify({status:"CAPACITY_LIMIT_VERIFIED",commands:2000,buildMs,replayMs,bytes:Buffer.byteLength(text),note:"current hard cap; production-scale journal redesign remains required"},null,2));
