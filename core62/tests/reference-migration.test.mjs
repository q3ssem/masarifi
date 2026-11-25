import assert from "node:assert/strict";
import {previewLegacy,importIntoEmpty} from "../src/legacy-import.mjs";
import {parseJournal} from "../src/journal.mjs";
const asOf="2026-12-15",opts={month:"2026-12",asOf,through:asOf,openingMinor:0};
const raw={app:"masarifi",version:2,expenses:[],incomes:[],insts:[],debts:[],goals:[],fixeds:[],budget:0,cats:null,cbud:{},rates:{},prefs:{wl:[{id:"w_1",n:"جهاز",a:100,d:"2026-11-01",s:"",sd:""}],nw:{a:[{id:"a_1",n:"حساب",t:"bank",v:200}],h:{"2026-11":-50}}}};
const p=previewLegacy(JSON.stringify(raw),{asOf});assert.equal(p.status,"IMPORT_PREVIEW",JSON.stringify(p.issues));const s=importIntoEmpty(p),v=s.view(opts);
assert.equal(v.wishes[0].amountMinor,10000);assert.equal(v.assetReferences[0].valueMinor,20000);assert.equal(v.wealthHistory[0].netMinor,-5000);assert.equal(v.wealth.netMinor,0);assert.equal(v.projection.quality.cents.confirmedOut,0);
assert.equal(s.apply("wish-status",{id:"w_1",status:"bought",statusDate:asOf}).status,"APPLIED_SHADOW");assert.equal(s.view(opts).wishes[0].status,"bought");assert.equal(s.view(opts).projection.quality.cents.confirmedOut,0);
assert.equal(s.apply("wish-status",{id:"w_1",status:"bought",statusDate:"2026-10-01"}).status,"BLOCKED");assert.deepEqual(parseJournal(JSON.stringify(s.exportJournal())).snapshot(),s.snapshot());console.log("RC1 wishlist and wealth references: preserved history, editing status, no double counting and replay passed.");
