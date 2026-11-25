import assert from "node:assert/strict";
import {createJournalSession,parseJournal} from "../src/journal.mjs";
const s=createJournalSession(),date="2026-12-01",opts={month:"2026-12",asOf:date,through:"2026-12-31",openingMinor:0};
const rule={id:"rent",kind:"fixed",direction:"out",amountMinor:10000,start:date,day:1,everyMonths:1,count:2,end:null,name:"إيجار"};
assert.equal(s.apply("rule",rule).status,"APPLIED_SHADOW");const before=s.snapshot(),f={scheduleId:"rent",due:date,id:"payment1",amountMinor:10001,date,accountId:null,note:"إيجار"};
assert.equal(s.apply("pay-occurrence",f).status,"BLOCKED");assert.deepEqual(s.snapshot(),before);
assert.equal(s.apply("pay-occurrence",{...f,amountMinor:4000}).status,"APPLIED_SHADOW");assert.equal(s.snapshot().revision,2);assert.equal(s.snapshot().domain.revision,2);assert.equal(s.view(opts).obligations[0].remainingMinor,6000);assert.equal(s.view(opts).projection.quality.cents.confirmedOut,4000);
assert.equal(s.apply("pay-occurrence",{...f,id:"payment2",amountMinor:6000}).status,"APPLIED_SHADOW");assert.equal(s.view(opts).obligations[0].remainingMinor,0);assert.equal(s.view(opts).projection.quality.cents.confirmedOut,10000);assert.equal(s.apply("pay-occurrence",{...f,id:"payment3",amountMinor:1}).status,"BLOCKED");assert.deepEqual(parseJournal(JSON.stringify(s.exportJournal())).snapshot(),s.snapshot());
console.log("RC1 atomic pay occurrence: rollback, partial payment, full payment, no duplicate settlement and replay passed.");
