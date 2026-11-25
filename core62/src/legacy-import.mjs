import {isDate,minorFromDecimal} from "./money.mjs";
import {createJournalSession,JOURNAL_MAX_COMMANDS} from "./journal.mjs";
import {expandSchedules} from "./schedule.mjs";
const families=["expenses","incomes","insts","debts","goals","fixeds"];
const nonempty=x=>x!==null&&x!==undefined&&x!==false&&x!==0&&x!==""&&(Array.isArray(x)?x.length>0:typeof x==="object"?Object.keys(x).length>0:true);
export function previewLegacy(text,{asOf}={}){if(typeof text!=="string"||text.length>8*1024*1024||!isDate(asOf))throw Error("legacy-size-or-date");const raw=JSON.parse(text);if(!raw||raw.app!=="masarifi"||raw.version!==2||raw.enc===1||!families.every(k=>Array.isArray(raw[k])))throw Error("unsupported-legacy-format");const issues=[],commands=[],counts=Object.fromEntries(families.map(k=>[k,raw[k].length])),seen=new Set();
 for(const k of ["fixeds"])if(raw[k].length)issues.push({path:k,count:raw[k].length,code:"requires-specialized-mapping"});
 for(const k of ["budget","cats","cbud","rates","prefs","audit59"])if(nonempty(raw[k]))issues.push({path:k,code:"requires-metadata-mapping"});
 for(const k of Object.keys(raw))if(!["app","version","exportedAt",...families,"budget","cats","cbud","rates","prefs","audit59"].includes(k))issues.push({path:k,code:"unknown-field"});
 for(const key of ["expenses","incomes"])for(let i=0;i<raw[key].length;i++){const e=raw[key][i],dir=key==="expenses"?"out":"in";try{if(!e||typeof e.id!=="string"||!(/^[A-Za-z0-9_-]{3,60}$/).test(e.id)||seen.has(e.id)||!isDate(e.date)||e.date>asOf||typeof e.amount!=="number"||!Number.isFinite(e.amount)||e.amount<=0||typeof e.note!=="string"||e.note.length>160)throw Error("record-contract");const amountMinor=minorFromDecimal(String(e.amount));const allowed=["id","amount","date","note",...(dir==="out"?["cat"]:[])];for(const k of Object.keys(e))if(!allowed.includes(k)&&nonempty(e[k]))throw Error("unmapped-record-metadata:"+k);if(dir==="out"&&(typeof e.cat!=="string"||!e.cat.trim()))throw Error("category");seen.add(e.id);commands.push({type:"domain",fields:{type:"record",id:e.id,direction:dir,amountMinor,date:e.date,category:dir==="out"?e.cat:null,note:e.note,accountId:null}});}catch(e){issues.push({path:key+"["+i+"]",code:String(e.message)});}}

 const strictAmount=v=>{if(typeof v!=="number"||!Number.isFinite(v)||v<=0)throw Error("amount-contract");return minorFromDecimal(String(v));};
 const originalId=x=>typeof x==="string"&&/^[A-Za-z0-9_-]{3,60}$/.test(x);
 const require=(v,code)=>{if(!v)throw Error(code);};
 const domain=fields=>({type:"domain",fields});
 // A group is staged as a unit; the original file remains the historical reference.
 function group(key,i,fn){const local=[];try{fn(raw[key][i],local);commands.push(...local);}catch(e){issues.push({path:key+"["+i+"]",code:String(e.message)});}}
 function knownFields(o,allowed){for(const k of Object.keys(o))if(!allowed.includes(k)&&nonempty(o[k]))throw Error("unmapped-record-metadata:"+k);}
 for(let i=0;i<raw.debts.length;i++)group("debts",i,(d,out)=>{
   require(d&&originalId(d.id)&&!seen.has(d.id)&&["owe","owed"].includes(d.dir)&&isDate(d.due)&&typeof d.who==="string"&&d.who.trim()&&d.who.length<=160&&Array.isArray(d.pays),"debt-contract");
   require((d.plan===undefined||d.plan==="due")&&!nonempty(d.monthly),"monthly-debt-requires-mapping");
   knownFields(d,["id","who","dir","amount","due","plan","monthly","pays"]);
   const a=strictAmount(d.amount),direction=d.dir==="owe"?"out":"in";let paid=0n;
   out.push(domain({type:"obligation",id:d.id,family:"debt",direction,amountMinor:a,due:d.due,name:d.who}));
   d.pays.forEach((p,k)=>{require(p&&isDate(p.d)&&p.d<=asOf,"payment-date");knownFields(p,["a","d"]);const v=strictAmount(p.a);paid+=BigInt(v);out.push(domain({type:"settle",id:"legacy:"+d.id+":"+k,obligationId:d.id,amountMinor:v,date:p.d,accountId:null,note:d.who}));});
   require(paid<=BigInt(a),"overpayment");seen.add(d.id);
 });
 for(let i=0;i<raw.insts.length;i++)group("insts",i,(x,out)=>{
   require(x&&originalId(x.id)&&!seen.has(x.id)&&typeof x.name==="string"&&x.name.trim()&&isDate(x.start+"-01")&&Number.isInteger(x.months)&&x.months>=1&&x.months<=360&&Number.isInteger(x.day)&&x.day>=1&&x.day<=31&&Array.isArray(x.paidOn),"installment-contract");
   require(!nonempty(x.bn)&&!nonempty(x.ex)&&!nonempty(x.cat),"installment-special-metadata");
   require(!nonempty(x.paidBase),"assumed-payment-history");
   require(x.trackPayments===true||x.mode==="manual","automatic-history-requires-review");
   knownFields(x,["id","name","amount","months","start","day","mode","paid","paidBase","trackPayments","paidOn","bn","cat","ex"]);
   const amountMinor=strictAmount(x.amount),r={id:x.id,kind:"installment",direction:"out",amountMinor,start:x.start+"-01",day:x.day,everyMonths:1,count:x.months,end:null,name:x.name};
   require(x.months<=120,"long-schedule-requires-review");
   const y=Number(x.start.slice(0,4)),month=Number(x.start.slice(5,7)),last=y*12+month-1+x.months-1,ey=Math.floor(last/12),em=last%12+1;
   require(ey<=9999,"schedule-range");
   const endMonth=String(ey).padStart(4,"0")+"-"+String(em).padStart(2,"0");let lastDay=31;while(!isDate(endMonth+"-"+lastDay))lastDay--;
   const occurrences=expandSchedules([r],{from:r.start,to:endMonth+"-"+lastDay}),used=new Set();
   require(x.trackPayments===true||Number.isInteger(x.paid)&&x.paid===x.paidOn.length,"assumed-payment-history");
   out.push({type:"rule",fields:r});
   for(const p of x.paidOn){require(p&&Number.isInteger(p.k)&&p.k>=0&&p.k<x.months&&!used.has(p.k)&&isDate(p.d)&&p.d<=asOf,"installment-payment");knownFields(p,["k","d"]);if(x.trackPayments!==true)require(p.k<x.paid,"manual-payment-index");used.add(p.k);const o=occurrences[p.k];out.push({type:"materialize",fields:{scheduleId:r.id,due:o.due}},domain({type:"settle",id:"legacy:"+x.id+":"+p.k,obligationId:o.id,amountMinor,date:p.d,accountId:null,note:x.name}));}
   seen.add(x.id);
 });
 for(let i=0;i<raw.goals.length;i++)group("goals",i,(g,out)=>{
   require(g&&originalId(g.id)&&!seen.has(g.id)&&typeof g.name==="string"&&g.name.trim()&&isDate(g.deadline+"-01"),"goal-contract");knownFields(g,["id","name","target","saved","deadline"]);
   require(g.saved===0,"goal-savings-date-unknown");out.push({type:"goal",fields:{id:g.id,name:g.name,targetMinor:strictAmount(g.target),due:g.deadline+"-01"}});seen.add(g.id);
 });
 if(commands.length>JOURNAL_MAX_COMMANDS)issues.push({path:"records",code:"journal-limit"});return {status:issues.length?"BLOCKED":"IMPORT_PREVIEW",counts,commands,issues,sourcePreserved:true,productionWriteAllowed:false};}
export function importIntoEmpty(preview){if(preview?.status!=="IMPORT_PREVIEW"||!Array.isArray(preview.commands)||!Array.isArray(preview.issues)||preview.issues.length)throw Error("import-blocked");return createJournalSession({format:"masarifi62-journal",version:1,serial:0,commands:preview.commands});}
