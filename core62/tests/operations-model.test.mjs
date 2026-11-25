import {newLabSession,labMoney} from "../src/operations-model.mjs";
const checks=[];function check(name,f){try{if(!f())throw Error("assertion");checks.push({name,pass:true});}catch(e){checks.push({name,pass:false,error:String(e)});}}
const a=newLabSession(),b=newLabSession();
check("session starts empty",()=>a.view().revision===0&&a.view().accounts.length===0);
const id=a.nextId("account");check("new account command",()=>a.send("account",{id,name:"تجريبي",openingMinor:labMoney("1000.25"),openingDate:"2026-12-01"}).status==="APPLIED_SHADOW");
check("isolated sessions",()=>b.view().revision===0&&b.view().accounts.length===0);
const rec=a.nextId("record");check("record expense command",()=>a.send("record",{id:rec,direction:"out",amountMinor:labMoney("50.25"),date:"2026-12-02",category:"food",note:"تجريبي",accountId:id}).status==="APPLIED_SHADOW");
check("view follows command",()=>a.view().accounts[0].balanceMinor===95000&&a.view().totals.cents.confirmedOut===5025);
const view=a.view();view.accounts[0].balanceMinor=0;view.movements[0].amountMinor=0;check("view mutations isolated",()=>a.view().accounts[0].balanceMinor===95000&&a.view().movements[0].amountMinor===5025);
check("invalid command doesn't change revision",()=>a.send("void",{id:"missing"}).status==="BLOCKED"&&a.view().revision===2);
check("void reflected in balances",()=>a.send("void",{id:rec}).status==="APPLIED_SHADOW"&&a.view().accounts[0].balanceMinor===100025&&a.view().totals.cents.confirmedOut===0);
check("decimal parser exact",()=>labMoney("0.01")===1&&labMoney("-0.01")===-1);
const result={passed:checks.filter(x=>x.pass).length,total:checks.length,checks};
console.log(JSON.stringify(result,null,2));if(result.passed!==result.total)process.exitCode=1;
