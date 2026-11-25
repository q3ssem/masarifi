import {chooseLedgerAnalysis} from "../src/legacy-bridge.mjs";
import {fin618Analyze} from "./fixtures/legacy6181-projection.mjs";
const tests=[];function check(name,fn){try{if(fn()!==true)throw Error("assertion");tests.push({name,pass:true});}catch(e){tests.push({name,pass:false,error:String(e)});}}
const row=(id,a,status="confirmed",d="2026-12-01",kind="expense",category="food")=>({id,a,status,d,kind,category,n:"synthetic",ts:1});
const rows=[row("i",123.45,"confirmed","2026-12-01","income",null),row("e",-10.01),row("a",-11.11,"assumed"),row("p",-12.34,"planned"),row("pi",20,"planned","2026-12-20","income",null)];
const l=fin618Analyze(rows),original=JSON.stringify(rows),lBefore=JSON.stringify(l);
const good=chooseLedgerAnalysis(rows,l);
check("exact valid bridge",()=>good.bridgeStatus==="CORE62_PARITY_OK"&&JSON.stringify(good.cents)===JSON.stringify(l.cents));
check("legacy display contract",()=>JSON.stringify(good.totals)===JSON.stringify(l.totals)&&JSON.stringify(good.counts)===JSON.stringify(l.counts)&&good.complete);
check("no source or legacy mutation",()=>JSON.stringify(rows)===original&&JSON.stringify(l)===lBefore);
check("fresh result objects",()=>good.cents!==l.cents&&good.totals!==l.totals&&good.counts!==l.counts);
check("duplicates retain legacy warnings",()=>{const bad=[rows[1],rows[1]],legacy=fin618Analyze(bad),a=chooseLedgerAnalysis(bad,legacy);return a.bridgeStatus==="LEGACY_FALLBACK"&&a.issues===legacy.issues&&!a.complete;});
check("mismatch does not substitute totals",()=>{const bad={...l,cents:{...l.cents,confirmedOut:1}};return chooseLedgerAnalysis(rows,bad).bridgeStatus==="LEGACY_FALLBACK"&&chooseLedgerAnalysis(rows,bad).cents===bad.cents;});
check("stricter core validation uses fallback",()=>{const r=[row("x",-1,"confirmed","2026-12-01","")],legacy=fin618Analyze(r);return legacy.complete&&chooseLedgerAnalysis(r,legacy).bridgeStatus==="LEGACY_FALLBACK";});
check("empty month parity",()=>chooseLedgerAnalysis([],fin618Analyze([])).bridgeStatus==="CORE62_PARITY_OK");
check("invalid amount fallback",()=>{const r=[row("x",0)];return chooseLedgerAnalysis(r,fin618Analyze(r)).bridgeStatus==="LEGACY_FALLBACK";});
check("invalid date fallback",()=>{const r=[row("x",1,"confirmed","2026-02-30")];return chooseLedgerAnalysis(r,fin618Analyze(r)).bridgeStatus==="LEGACY_FALLBACK";});
check("overflow fallback",()=>{const r=[row("x",90071992547409.9),row("y",100)];return chooseLedgerAnalysis(r,fin618Analyze(r)).bridgeStatus==="LEGACY_FALLBACK";});
const stress=[];for(const n of [100000,250000]){const large=Array.from({length:n},(_,i)=>row("r:"+i,i%2?1.03:-1.01,["confirmed","assumed","planned"][i%3]));const start=Date.now(),old=fin618Analyze(large),a=chooseLedgerAnalysis(large,old),ms=Date.now()-start;const exact=a.bridgeStatus==="CORE62_PARITY_OK"&&JSON.stringify(a.cents)===JSON.stringify(old.cents);stress.push({rows:n,ms,exact});check("integrated bridge "+n,()=>exact);}
const result={passed:tests.filter(x=>x.pass).length,total:tests.length,stress,tests};
console.log(JSON.stringify(result,null,2));if(result.passed!==result.total)process.exitCode=1;
