import assert from "node:assert/strict";
import {previewLegacy,importIntoEmpty} from "../src/legacy-import.mjs";
import {parseJournal} from "../src/journal.mjs";
const asOf="2026-12-15",opts={month:"2026-12",asOf,through:"2027-02-28",openingMinor:0};
const first={id:"e_1",amount:100,cat:"shopping",note:"جهاز",date:"2026-11-05",bnpl:"tabby",ts:1},i={id:"i_1",name:"جهاز",amount:100,months:3,start:"2026-12",day:5,mode:"manual",paid:0,paidBase:0,trackPayments:true,paidOn:[{k:0,d:"2026-12-05",ts:2}],bn:"tabby",cat:"shopping",ex:"e_1",ts:1};
const raw={app:"masarifi",version:2,expenses:[first],incomes:[],insts:[i],debts:[],goals:[],fixeds:[],budget:0,cats:null,cbud:{},rates:{},prefs:{}};
const p=previewLegacy(JSON.stringify(raw),{asOf});assert.equal(p.status,"IMPORT_PREVIEW",JSON.stringify(p.issues));const j=importIntoEmpty(p),v=j.view(opts);
assert.equal(v.projection.quality.cents.confirmedOut,20000);assert.equal(v.projection.quality.cents.plannedOut,20000);assert.equal(j.snapshot().rules[0].firstMovementId,"e_1");assert.equal(j.snapshot().rules[0].purchaseProvider,"tabby");assert.equal(j.snapshot().rules[0].sourceTimestamp,1);assert.equal(v.projection.rows.filter(r=>r.category==="shopping").length,4);assert.equal(j.apply("domain",{type:"void",id:"e_1"}).status,"BLOCKED");assert.deepEqual(parseJournal(JSON.stringify(j.exportJournal())).snapshot(),j.snapshot());
assert.equal(previewLegacy(JSON.stringify({...raw,insts:[{...i,ex:"missing"}]}),{asOf}).status,"BLOCKED");console.log("RC1 BNPL first-payment linkage, category, remaining payments and no double counting passed.");
