import {isDate,safeMinor} from "./money.mjs";
import {analyzeLedger} from "./ledger.mjs";
function monthAt(date,offset){const k=Number(date.slice(0,4))*12+Number(date.slice(5,7))-1+offset,y=Math.floor(k/12);if(y<1||y>9999)throw Error("debt-window");return String(y).padStart(4,"0")+"-"+String(k%12+1).padStart(2,"0")+"-01";}
// Recompute the monthly allocation from remaining principal; never create a second obligation.
export function projectMonthlyDebt(projection,domain,plans,{asOf,through}){
 if(projection.status!=="PREVIEW_ONLY"||!plans.length)return projection;
 try{if(!isDate(asOf)||!isDate(through)||asOf>through)throw Error("debt-period");const ids=new Set(plans.map(p=>p.obligationId)),rows=projection.rows.filter(r=>!(r.status==="planned"&&ids.has(r.id)));
 for(const p of plans){const o=domain.obligations.find(x=>x.id===p.obligationId);if(!o||o.family!=="debt"||o.direction!=="out"||!Number.isSafeInteger(p.monthlyMinor)||p.monthlyMinor<=0)throw Error("debt-plan");const moves=domain.movements.filter(m=>m.kind==="settlement"&&m.obligationId===o.id&&!m.voided);if(moves.some(m=>m.date>asOf))throw Error("debt-future-payment-review");const amount=BigInt(p.monthlyMinor),paid=moves.reduce((s,m)=>s+BigInt(m.amountMinor),0n),paidThis=moves.filter(m=>m.date.slice(0,7)===asOf.slice(0,7)).reduce((s,m)=>s+BigInt(m.amountMinor),0n);let remaining=BigInt(o.amountMinor)-paid;if(remaining<0n)throw Error("debt-overpaid");for(let i=0;remaining>0n&&i<600;i++){const due=monthAt(asOf,i);if(due>through)break;const limit=i===0?(amount>paidThis?amount-paidThis:0n):amount,v=remaining<limit?remaining:limit;if(v===0n)continue;rows.push({id:"debt-plan:"+o.id+":"+due,date:due,amountMinor:-safeMinor(v),status:"planned",kind:"debt",category:o.category??o.family});remaining-=v;}}
 const quality=analyzeLedger(rows);if(!quality.complete)throw Error("debt-ledger-quality");return {...projection,rows,quality};
 }catch(e){return {status:"BLOCKED",code:String(e.message),productionWriteAllowed:false};}
}
