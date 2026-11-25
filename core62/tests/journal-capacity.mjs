import assert from "node:assert/strict";
import {createJournalSession,parseJournal,JOURNAL_MAX_COMMANDS} from "../src/journal.mjs";
const s=createJournalSession(),list=Array.from({length:JOURNAL_MAX_COMMANDS},(_,i)=>({type:"record",id:"stress_"+i,direction:"out",amountMinor:101,date:"2026-12-01",category:"food",note:"synthetic",accountId:null}));
const t=performance.now();assert.equal(s.applyRecords(list).status,"APPLIED_SHADOW");const buildMs=Math.round(performance.now()-t),text=JSON.stringify(s.exportJournal()),a=performance.now(),restored=parseJournal(text),replayMs=Math.round(performance.now()-a);
assert.deepEqual(restored.snapshot(),s.snapshot());assert.equal(restored.snapshot().revision,JOURNAL_MAX_COMMANDS);assert.equal(restored.apply("domain",{...list[0],id:"extra"}).code,"journal-limit");
console.log(JSON.stringify({status:"CAPACITY_LIMIT_VERIFIED",commands:JOURNAL_MAX_COMMANDS,buildMs,replayMs,bytes:Buffer.byteLength(text),note:"contiguous simple-record bulk path; mixed-command production scalability and device limits remain unverified"},null,2));
