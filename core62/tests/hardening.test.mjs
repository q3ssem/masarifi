import {STATUSES,BUCKETS,analyzeLedger} from "../src/ledger.mjs";
import {forecast,envelope} from "../src/projections.mjs";
import {anomalyHunter} from "../src/intelligence.mjs";
import {buildDashboard} from "../src/ui-model.mjs";
import {mergeThreeWay,newQueue,enqueue,acknowledge} from "../src/sync-guardian.mjs";
import {stableCapture,createShadowStore} from "../src/data-shadow.mjs";
import {legacyRows} from "../src/migration.mjs";
import {gate} from "../src/projection-parity.mjs";
import {fin618Analyze} from "./fixtures/legacy6181-projection.mjs";
const tests=[];function check(name,fn){try{if(fn()!==true)throw Error("assertion");tests.push({name,pass:true});}catch(e){tests.push({name,pass:false,error:String(e)});}}
const row=(id,amountMinor,status="confirmed",date="2026-12-01",kind="expense",category="food")=>({id,amountMinor,status,date,kind,category});
const transfer=[row("a",100,"confirmed","2026-12-01","transfer",null),row("b",-100,"confirmed","2026-12-01","transfer"),row("p",-100,"planned","2026-12-20","transfer")];
check("dashboard excludes internal transfers",()=>buildDashboard(transfer,"2026-12").analysis.cents.confirmedIn===0&&buildDashboard(transfer,"2026-12").analysis.cents.confirmedOut===0);
check("forecast excludes internal transfers",()=>forecast(transfer,{openingMinor:1000,asOf:"2026-12-01",through:"2026-12-31"}).closingMinor===1000);
check("envelope excludes internal transfers",()=>envelope(transfer,{category:"food",month:"2026-12",limitMinor:1000}).remainingIncludingPlansMinor===1000);
check("ledger still preserves original movement",()=>analyzeLedger(transfer).count===3&&analyzeLedger(transfer).cents.confirmedOut===100);
check("status contracts frozen",()=>Object.isFrozen(STATUSES)&&Object.isFrozen(BUCKETS));
check("invalid calendar month blocked",()=>{try{buildDashboard([],"2026-13");return false;}catch{return true;}});
const d=(id,value)=>({id,deleted:false,value:{amountMinor:value}});
const q=newQueue(),op={id:"op",baseRevision:0,documents:[d("b",1),d("a",2)]},pending=enqueue(q,op);
check("equivalent doc order is idempotent",()=>enqueue(pending.state,{...op,documents:[...op.documents].reverse()}).status==="ALREADY_QUEUED");
check("sparse arrays blocked",()=>mergeThreeWay([], [{id:"x",deleted:false,value:{a:Array(3)}}],[]).status==="BLOCKED");
check("large aggregate snapshot blocked",()=>mergeThreeWay([],Array.from({length:18},(_,i)=>({id:"id"+i,deleted:false,value:{large:"x".repeat(250000)}})),[]).status==="BLOCKED");
check("sync state queue limit enforced",()=>enqueue({...q,pending:[op,op]},op).status==="BLOCKED");
check("invalid acknowledgement state blocked",()=>acknowledge({...pending.state,completed:null},{id:"op",baseRevision:0,revision:1,accepted:true}).status==="BLOCKED");
check("half-halalah median explicitly marked",()=>{const h=[row("1",-100,"confirmed","2026-12-01"),row("2",-101,"confirmed","2026-12-02"),row("3",-101,"confirmed","2026-12-03"),row("4",-100,"confirmed","2026-12-04"),row("5",-300,"confirmed","2026-12-05")];return anomalyHunter(h,{asOf:"2026-12-05",minSamples:4}).alerts[0].medianHalfHalalah===true;});
const legacy={expenses:[],incomes:[],insts:[],debts:[],goals:[],fixeds:[],budget:0,cats:null,cbud:{},rates:{},prefs:{},audit59:[]};const raw=JSON.stringify(legacy),storage={length:1,key:()=> "masarifi.v2",getItem:()=>raw};const capture=stableCapture(storage),store=createShadowStore();for(let i=0;i<8;i++)store.commit(storage,capture,i);
check("memory history bounded",()=>store.rollback(0,8).code==="unknown-revision"&&store.rollback(5,8).status==="SHADOW_ROLLED_BACK");
const stages=[100000,250000,500000],stress=[];
for(const n of stages){const r=Array.from({length:n},(_,i)=>({id:"stress:"+i,d:"2026-12-"+String(1+i%28).padStart(2,"0"),a:i%2?1.03:-1.01,status:["confirmed","assumed","planned"][i%3],kind:i%2?"income":"expense",category:i%2?null:"food"}));const start=Date.now(),old=fin618Analyze(r),converted=legacyRows(r),out=gate(r,converted,old),ms=Date.now()-start;const exact=out.status==="PROJECTION_PARITY_OK"&&BUCKETS.every(k=>old.cents[k]===out.totals.actual.cents[k]);stress.push({rows:n,ms,exact,oldCount:old.count,newCount:out.totals.actual.count});check("legacy parity "+n,()=>exact&&out.totals.actual.count===n);}
let seed=123456789;function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;}
let ok=true;const start=Date.now();for(let i=0;i<2000;i++){const r=Array.from({length:32},(_,j)=>({id:"f:"+i+":"+j,d:"2026-12-"+String(1+random()%28).padStart(2,"0"),a:(1+random()%100000)/100*(random()%2?1:-1),status:["confirmed","assumed","planned"][random()%3],kind:"expense",category:"food"}));if(gate(r,legacyRows(r),fin618Analyze(r)).status!=="PROJECTION_PARITY_OK"){ok=false;break;}}
check("2000 seeded parity batches",()=>ok);
const result={passed:tests.filter(x=>x.pass).length,total:tests.length,stress,fuzz:{batches:2000,rowsPerBatch:32,ms:Date.now()-start,exact:ok},tests};
console.log(JSON.stringify(result,null,2));if(result.passed!==result.total)process.exitCode=1;
