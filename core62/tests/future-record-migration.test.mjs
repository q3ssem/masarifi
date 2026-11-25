import assert from "node:assert/strict";
import {previewLegacy,importIntoEmpty} from "../src/legacy-import.mjs";
import {parseJournal} from "../src/journal.mjs";
const asOf="2026-12-15",opts={month:"2026-12",asOf,through:"2026-12-31",openingMinor:10000};
const raw={app:"masarifi",version:2,expenses:[{id:"e_1",amount:12.34,cat:"food",note:"موعد",date:"2026-12-20",ts:123}],incomes:[{id:"n_1",amount:50,src:"salary",note:"راتب",date:"2026-12-25"}],insts:[],debts:[],goals:[],fixeds:[],budget:0,cats:null,cbud:{},rates:{},prefs:{}};
const p=previewLegacy(JSON.stringify(raw),{asOf});assert.equal(p.status,"IMPORT_PREVIEW",JSON.stringify(p.issues));const s=importIntoEmpty(p);let v=s.view(opts);
assert.equal(v.movements.length,0);assert.equal(v.plannedRecords.length,2);assert.equal(v.projection.quality.cents.confirmedOut,0);assert.equal(v.projection.quality.cents.plannedOut,1234);assert.equal(v.projection.quality.cents.plannedIn,5000);assert.equal(v.forecast.closingMinor,13766);
assert.equal(s.apply("confirm-record",{id:"e_1",date:asOf,accountId:null}).status,"APPLIED_SHADOW");v=s.view(opts);assert.equal(v.plannedRecords.length,1);assert.equal(v.projection.quality.cents.confirmedOut,1234);assert.equal(v.projection.quality.cents.plannedOut,0);assert.equal(v.movements[0].sourceTimestamp,123);assert.equal(s.apply("confirm-record",{id:"e_1",date:asOf,accountId:null}).status,"BLOCKED");assert.equal(s.apply("cancel-record",{id:"n_1"}).status,"APPLIED_SHADOW");assert.deepEqual(parseJournal(JSON.stringify(s.exportJournal())).snapshot(),s.snapshot());console.log("RC1 future records: planned buckets, explicit confirmation/cancellation, no premature cash and exact replay passed.");

assert.equal(previewLegacy(JSON.stringify({...raw,prefs:{ri:[{id:"r_1",name:"راتب",src:"salary",amount:50,day:25,start:"2026-12",stop:""}]}}),{asOf}).status,"BLOCKED");
