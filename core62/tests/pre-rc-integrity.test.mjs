import {createJournalSession,parseJournal,JOURNAL_MAX_COMMANDS} from "../src/journal.mjs";
import {parseCSV} from "../src/reporting.mjs";
const checks=[];function check(name,f){try{if(f()!==true)throw Error("assertion");checks.push({name,pass:true});}catch(e){checks.push({name,pass:false,error:String(e)});}}
const throws=f=>{try{f();return false;}catch{return true;}};
const a=createJournalSession();const rec=(id,amountMinor=100)=>({type:"record",id,direction:"out",amountMinor,date:"2026-12-01",category:"food",note:"اختبار",accountId:null});
check("first command",()=>a.apply("domain",rec("expense_1")).status==="APPLIED_SHADOW");
check("failed operation",()=>a.apply("domain",rec("expense_1")).status==="BLOCKED");
check("second command",()=>a.apply("domain",rec("expense_2")).status==="APPLIED_SHADOW");
check("replay audit exact after rejection",()=>JSON.stringify(parseJournal(JSON.stringify(a.exportJournal())).snapshot())===JSON.stringify(a.snapshot()));
check("generated id skips imported ids",()=>a.nextId("expense")==="expense_3");
check("reject extra budget field",()=>a.apply("budget",{month:"2026-12",category:"food",limitMinor:100,oldJunk:true}).code==="operation-fields");
check("reject reserved domain op id",()=>a.apply("domain",{...rec("x"),opId:"override"}).code==="reserved-command-fields");
check("no state mutation on invalid operation",()=>a.snapshot().revision===2);
check("reject oversized CSV final line",()=>throws(()=>parseCSV(Array.from({length:JOURNAL_MAX_COMMANDS+2},()=>"a").join("\n"))));
const result={passed:checks.filter(x=>x.pass).length,total:checks.length,checks};
console.log(JSON.stringify(result,null,2));if(result.passed!==result.total)process.exitCode=1;
