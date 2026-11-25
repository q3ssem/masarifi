import {previewLegacy,importIntoEmpty} from "../src/legacy-import.mjs";
import {parseJournal} from "../src/journal.mjs";
const checks=[];function check(name,f){try{if(f()!==true)throw Error("assertion");checks.push({name,pass:true});}catch(e){checks.push({name,pass:false,error:String(e)});}}
const base={app:"masarifi",version:2,expenses:[],incomes:[],insts:[],debts:[],goals:[],fixeds:[],budget:0,cats:null,cbud:{},rates:{},prefs:{}},asOf="2026-12-31";
const fx={id:"fx_1",name:"اتصالات",cat:"phone",amount:120.25,start:"2026-11",end:"2027-01",trackFrom:"2026-11",paidMonths:["2026-11"],paidOn:[{m:"2026-11",d:"2026-11-20"}]};
const preview=x=>previewLegacy(JSON.stringify({...base,fixeds:[x]}),{asOf});
const p=preview(fx);check("tracked fixed preview",()=>p.status==="IMPORT_PREVIEW");const s=importIntoEmpty(p),v=s.view({month:"2026-12",asOf,through:"2027-02-28",openingMinor:0});
check("category and confirmed date preserved",()=>v.projection.rows.some(r=>r.category==="phone"&&r.date==="2026-11-20"&&r.amountMinor===-12025&&r.status==="confirmed"));
check("outstanding category preserved",()=>v.projection.rows.filter(r=>r.status==="planned"&&r.category==="phone").length===2&&v.projection.quality.cents.plannedOut===24050);
check("end month inclusive",()=>v.occurrences.every(o=>o.due<="2027-01-01"));
check("tracked explicit history before anchor preserved",()=>preview({...fx,trackFrom:"2026-12"}).status==="IMPORT_PREVIEW");
check("month-only payment accepted as estimated",()=>preview({...fx,paidMonths:["2026-11","2026-12"]}).status==="IMPORT_PREVIEW");
check("past unpaid semantics blocked",()=>preview({...fx,paidMonths:[],paidOn:[]}).status==="BLOCKED");
check("unmapped timestamps blocked",()=>preview({...fx,ts:123}).status==="BLOCKED");
check("category survives replay",()=>JSON.stringify(parseJournal(JSON.stringify(s.exportJournal())).snapshot())===JSON.stringify(s.snapshot()));
const result={passed:checks.filter(c=>c.pass).length,total:checks.length,checks};
console.log(JSON.stringify(result,null,2));if(result.passed!==result.total)process.exitCode=1;
