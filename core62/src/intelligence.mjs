import {safeMinor,isDate} from "./money.mjs";
import {analyzeLedger} from "./ledger.mjs";
import {forecast} from "./projections.mjs";
// Pure, conservative scenario analytics, no financial transactions.
export function financialDNA(rows,month){
  if(typeof month!=="string"||!isDate(month+"-01"))throw Error("month-contract");
  const a=analyzeLedger(rows);if(!a.complete)return {status:"BLOCKED",issues:a.issues};
  const out=new Map();let total=0n,income=0n;
  for(const r of rows){if(r.status!=="confirmed"||!r.date.startsWith(month+"-"))continue;
    if(r.amountMinor>0){income+=BigInt(r.amountMinor);continue;}
    if(r.kind==="transfer")continue;
    const k=r.category??"uncategorized",v=BigInt(-r.amountMinor);total+=v;out.set(k,(out.get(k)||0n)+v);
  }
  return {status:"ANALYSIS_ONLY",month,incomeMinor:safeMinor(income),outflowMinor:safeMinor(total),netMinor:safeMinor(income-total),categories:[...out].map(([category,v])=>({category,amountMinor:safeMinor(v),shareBps:total?Number(v*10000n/total):0})).sort((a,b)=>b.amountMinor-a.amountMinor||(a.category<b.category?-1:a.category>b.category?1:0))};
}
export function anomalyHunter(rows,{asOf,minSamples=5,ratioBps=20000}={}){
  if(!isDate(asOf)||!Number.isInteger(minSamples)||minSamples<3||!Number.isInteger(ratioBps)||ratioBps<10000)throw Error("anomaly-contract");
  const a=analyzeLedger(rows);if(!a.complete)return {status:"BLOCKED",issues:a.issues};
  const prior=new Map(),today=[];for(const r of rows){if(r.status!=="confirmed"||r.amountMinor>=0||r.kind==="transfer")continue;
    const k=r.category??"uncategorized";if(r.date<asOf){if(!prior.has(k))prior.set(k,[]);prior.get(k).push(-r.amountMinor);}else if(r.date===asOf)today.push(r);
  }
  const medians=new Map();for(const [k,v] of prior){if(v.length<minSamples)continue;v.sort((a,b)=>a-b);medians.set(k,{n:v.length,median2:BigInt(v[(v.length-1)>>1])+BigInt(v[v.length>>1])});}
  const alerts=[];for(const r of today){const m=medians.get(r.category??"uncategorized");if(m&&BigInt(-r.amountMinor)*20000n>=m.median2*BigInt(ratioBps))alerts.push({id:r.id,amountMinor:-r.amountMinor,medianMinor:Number(m.median2/2n),samples:m.n,reason:"above-historical-median"});}
  return {status:"REVIEW_ONLY",alerts,notFraudDetermination:true};
}
export function decisionLab(rows,options,decision){
  if(!decision||!Number.isSafeInteger(decision.costMinor)||decision.costMinor<0||!isDate(decision.date)||!options||decision.date<options.asOf||decision.date>options.through)throw Error("decision-contract");
  const baseline=forecast(rows,options);if(baseline.status==="BLOCKED")return baseline;
  if(decision.costMinor===0)return {status:"SIMULATION_ONLY",baseline,scenario:baseline,deltaMinor:0};
  const candidate={id:"decision-lab:simulation",date:decision.date,amountMinor:-decision.costMinor,status:"planned",kind:"scenario",category:null};
  if(rows.some(r=>r.id===candidate.id))return {status:"BLOCKED",issues:[{code:"reserved-scenario-id"}]};
  const scenario=forecast([...rows,candidate],options);if(scenario.status==="BLOCKED")return scenario;
  try{return {status:"SIMULATION_ONLY",baseline,scenario,deltaMinor:safeMinor(BigInt(scenario.closingMinor)-BigInt(baseline.closingMinor)),introducesDeficit:baseline.firstDeficit===null&&scenario.firstDeficit!==null};}catch{return {status:"BLOCKED",issues:[{code:"delta-overflow"}]};}
}
export function smartAllocation(availableMinor,obligations){
  if(!Number.isSafeInteger(availableMinor)||availableMinor<0||!Array.isArray(obligations))throw Error("allocation-contract");
  const seen=new Set();for(const x of obligations){if(!x||typeof x.id!=="string"||!x.id||seen.has(x.id)||!Number.isSafeInteger(x.amountMinor)||x.amountMinor<0||!isDate(x.due)||!Number.isInteger(x.priority)||x.priority<0||x.priority>3)throw Error("obligation-contract");seen.add(x.id);}
  let remaining=availableMinor;const items=[...obligations].sort((a,b)=>a.priority-b.priority||a.due.localeCompare(b.due)||(a.id<b.id?-1:a.id>b.id?1:0)).map(x=>{const allocatedMinor=Math.min(remaining,x.amountMinor);remaining-=allocatedMinor;return {id:x.id,allocatedMinor,shortfallMinor:x.amountMinor-allocatedMinor};});
  return {status:"SIMULATION_ONLY",availableMinor,remainingMinor:remaining,items,fullyFunded:items.every(x=>x.shortfallMinor===0)};
}
