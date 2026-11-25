import {analyzeLedger,BUCKETS,validRow} from "./ledger.mjs";
export function reconcileMonthly(source,target){
 if(!Array.isArray(source)||!Array.isArray(target)||source.length>25000||target.length>25000)throw Error("reconcile-contract");
 if(!source.every(validRow)||!target.every(validRow)||!analyzeLedger(source).complete||!analyzeLedger(target).complete)return {status:"BLOCKED",code:"ledger-quality",productionWriteAllowed:false};
 const group=rows=>{const map=new Map();for(const r of rows){if(r.kind==="transfer")continue;const m=r.date.slice(0,7);if(!map.has(m))map.set(m,[]);map.get(m).push(r);}return map;};
 const a=group(source),b=group(target),months=[...new Set([...a.keys(),...b.keys()])].sort().map(month=>{const old=analyzeLedger(a.get(month)??[]),next=analyzeLedger(b.get(month)??[]);const differences=BUCKETS.filter(k=>old.cents[k]!==next.cents[k]);const countDifferences=Object.keys(old.counts).filter(k=>old.counts[k]!==next.counts[k]);return {month,source:old.cents,target:next.cents,sourceCounts:old.counts,targetCounts:next.counts,differences,countDifferences,match:!differences.length&&!countDifferences.length};});
 return {status:months.every(m=>m.match)?"MONTHLY_TOTALS_MATCH":"BLOCKED",months,identityVerified:false,productionWriteAllowed:false};
}
