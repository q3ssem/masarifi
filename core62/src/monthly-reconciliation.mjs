import {analyzeLedger,BUCKETS,validRow} from "./ledger.mjs";
export function reconcileMonthly(source,target){
 if(!Array.isArray(source)||!Array.isArray(target)||source.length>25000||target.length>25000)throw Error("reconcile-contract");
 if(!source.every(validRow)||!target.every(validRow)||!analyzeLedger(source).complete||!analyzeLedger(target).complete)return {status:"BLOCKED",code:"ledger-quality",productionWriteAllowed:false};
 const group=rows=>{const map=new Map();for(const r of rows){if(r.kind==="transfer")continue;const m=r.date.slice(0,7);if(!map.has(m))map.set(m,[]);map.get(m).push(r);}return map;};
 const a=group(source),b=group(target),months=[...new Set([...a.keys(),...b.keys()])].sort().map(month=>{const old=analyzeLedger(a.get(month)??[]),next=analyzeLedger(b.get(month)??[]);const differences=BUCKETS.filter(k=>old.cents[k]!==next.cents[k]);const countDifferences=Object.keys(old.counts).filter(k=>old.counts[k]!==next.counts[k]);return {month,source:old.cents,target:next.cents,sourceCounts:old.counts,targetCounts:next.counts,differences,countDifferences,match:!differences.length&&!countDifferences.length};});
 return {status:months.every(m=>m.match)?"MONTHLY_TOTALS_MATCH":"BLOCKED",months,identityVerified:false,productionWriteAllowed:false};
}

// Independent exact normalized row identity check. No fuzzy matches or remapping.
// Transfer reconciliation is separate, and notes/metadata/account links need their own audit.
export function reconcileRowIdentity(source,target){
 if(!Array.isArray(source)||!Array.isArray(target)||source.length>25000||target.length>25000)throw Error("reconcile-contract");
 if(!source.every(validRow)||!target.every(validRow)||!analyzeLedger(source).complete||!analyzeLedger(target).complete)return {status:"BLOCKED",code:"ledger-quality",identityVerified:false,productionWriteAllowed:false};
 const key=r=>JSON.stringify([r.id,r.date,r.status,r.kind]);
 const map=rows=>new Map(rows.filter(r=>r.kind!=="transfer").map(r=>[key(r),r]));
 const a=map(source),b=map(target);
 let missing=0,extra=0,changed=0,matched=0;
 for(const [id,r] of a){const s=b.get(id);if(!s)missing++;else if(r.amountMinor!==s.amountMinor||r.category!==s.category)changed++;else matched++;}
 for(const id of b.keys())if(!a.has(id))extra++;
 const ok=missing===0&&extra===0&&changed===0;
 return {status:ok?"ROW_IDENTITY_MATCH":"BLOCKED",matched,missing,extra,changed,identityVerified:ok,scope:"normalized-non-transfer-row-id-date-status-kind-amount-category",productionWriteAllowed:false};
}
