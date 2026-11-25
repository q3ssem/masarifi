import {isDate,minorFromDecimal,safeMinor} from "./money.mjs";
import {expandSchedules} from "./schedule.mjs";
const need=(x,c)=>{if(!x)throw Error(c);};
const key=x=>typeof x==="string"&&/^[A-Za-z0-9_-]{3,40}$/.test(x);
const allowed=(x,a)=>x&&typeof x==="object"&&!Array.isArray(x)&&Object.keys(x).every(k=>a.includes(k));
function monthAt(start,i){const y=Number(start.slice(0,4)),m=Number(start.slice(5,7))-1,k=y*12+m+i;return String(Math.floor(k/12)).padStart(4,"0")+"-"+String(k%12+1).padStart(2,"0");}
export function validAssociationDescriptor(a){return !!a&&key(a.id)&&typeof a.name==="string"&&a.name.trim()&&a.name.length<=40&&Number.isSafeInteger(a.amountMinor)&&a.amountMinor>0&&Number.isInteger(a.members)&&a.members>=2&&a.members<=60&&Number.isInteger(a.turn)&&a.turn>=1&&a.turn<=a.members&&Array.isArray(a.names)&&a.names.length<=a.members&&a.names.every(n=>typeof n==="string"&&n.length<=30)&&isDate(a.start+"-01")&&Number.isInteger(a.day)&&a.day>=1&&a.day<=28&&(a.stop===null||isDate(a.stop+"-01")&&a.stop>=a.start)&&typeof a.hidden==="boolean";}
export function planAssociation(j,{asOf}={}){
 try{need(isDate(asOf)&&allowed(j,["id","name","amount","n","turn","start","day","names","stop","hide","trackFrom","paidMonths","paidOn","gotOn","gotTs"]),"association-contract");
 need(typeof j.amount==="number"&&Number.isFinite(j.amount),"association-amount");
 const d={id:j.id,name:j.name,amountMinor:minorFromDecimal(String(j.amount)),members:j.n,turn:j.turn,names:j.names??[],start:j.start,day:j.day,stop:j.stop||null,hidden:j.hide===true};need(validAssociationDescriptor(d)&&j.trackFrom===j.start&&Array.isArray(j.paidMonths)&&Array.isArray(j.paidOn),"association-tracked-contract");
 const rule={id:d.id,kind:"association",direction:"out",amountMinor:d.amountMinor,start:d.start+"-01",day:d.day,everyMonths:1,count:d.members,end:null,name:d.name,category:"jamiya"};
 const finalMonth=monthAt(d.start,d.members-1);const occurrences=expandSchedules([rule],{from:rule.start,to:finalMonth+"-28"}).filter(o=>!d.stop||o.due.slice(0,7)<d.stop);
 need(occurrences.length>0,"association-stopped-before-start");rule.count=occurrences.length;
 const paid=new Map();for(const p of j.paidOn){need(allowed(p,["m","d","ts"])&&isDate(p.d)&&p.d<=asOf&&p.d.slice(0,7)===p.m&&!paid.has(p.m)&&occurrences.some(o=>o.due.slice(0,7)===p.m)&&(p.ts===undefined||Number.isSafeInteger(p.ts)&&p.ts>=0),"association-payment");paid.set(p.m,p);}
 need(j.paidMonths.every(m=>paid.has(m))&&new Set(j.paidMonths).size===j.paidMonths.length,"association-payment-date-unknown");
 // Prior unpaid months have different legacy projection semantics; require review.
 need(occurrences.every(o=>o.due.slice(0,7)>=asOf.slice(0,7)||paid.has(o.due.slice(0,7))),"association-past-unpaid");
 const commands=[{type:"association",fields:d},{type:"rule",fields:rule}];
 for(const o of occurrences){const p=paid.get(o.due.slice(0,7));if(p)commands.push({type:"materialize",fields:{scheduleId:d.id,due:o.due}},{type:"domain",fields:{type:"settle",id:"legacy:"+d.id+":"+p.m,obligationId:o.id,amountMinor:d.amountMinor,date:p.d,accountId:null,note:d.name,...(p.ts!==undefined?{sourceTimestamp:p.ts}:{})}});}
 const turn=occurrences[d.turn-1];
 if(turn){const payout=safeMinor(BigInt(d.amountMinor)*BigInt(d.members)),id="association-payout:"+d.id;
 commands.push({type:"domain",fields:{type:"obligation",id,family:"association",direction:"in",amountMinor:payout,due:turn.due,name:"قبض "+d.name}});
 if(j.gotOn){need(isDate(j.gotOn)&&j.gotOn<=asOf&&j.gotOn>=turn.due&&(j.gotTs===undefined||Number.isSafeInteger(j.gotTs)&&j.gotTs>=0),"association-receipt");commands.push({type:"domain",fields:{type:"settle",id:"legacy:receipt:"+d.id,obligationId:id,amountMinor:payout,date:j.gotOn,accountId:null,note:"قبض "+d.name,...(j.gotTs!==undefined?{sourceTimestamp:j.gotTs}:{})}});}else need(!j.gotTs,"association-receipt-timestamp");}
 else need(!j.gotOn&&!j.gotTs,"association-receipt-after-stop");
 return {status:"PREVIEW",commands};
 }catch(e){return {status:"BLOCKED",code:String(e.message),commands:[]};}
}
