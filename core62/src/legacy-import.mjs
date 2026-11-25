import {planAssociation} from "./association-import.mjs";
import {validRecordMetadata} from "./record-metadata.mjs";
import {isDate,minorFromDecimal} from "./money.mjs";
import {accountBalances} from "./domain.mjs";
import {createJournalSession} from "./journal.mjs";
import {JOURNAL_MAX_COMMANDS,JOURNAL_MAX_BYTES,utf8Bytes} from "./text-limits.mjs";
import {expandSchedules} from "./schedule.mjs";
import {planWalletMigration} from "./wallet-import.mjs";
const families=["expenses","incomes","insts","debts","goals","fixeds"];
const nonempty=x=>x!==null&&x!==undefined&&x!==false&&x!==0&&x!==""&&(Array.isArray(x)?x.length>0:typeof x==="object"?Object.keys(x).length>0:true);
export function previewLegacy(text,{asOf}={}){if(typeof text!=="string"||text.length>JOURNAL_MAX_BYTES||utf8Bytes(text)>JOURNAL_MAX_BYTES||!isDate(asOf))throw Error("legacy-size-or-date");const raw=JSON.parse(text);if(!raw||raw.app!=="masarifi"||raw.version!==2||raw.enc===1||!families.every(k=>Array.isArray(raw[k])))throw Error("unsupported-legacy-format");const issues=[],commands=[],ordinary=[],counts=Object.fromEntries(families.map(k=>[k,raw[k].length])),seen=new Set();
 for(const k of ["rates","audit59"])if(nonempty(raw[k]))issues.push({path:k,code:"requires-metadata-mapping"});
 const prefs=raw.prefs??{};if(!prefs||typeof prefs!=="object"||Array.isArray(prefs))issues.push({path:"prefs",code:"preferences-contract"});else for(const k of Object.keys(prefs))if(!["wallet59","ri","jm"].includes(k)&&nonempty(prefs[k]))issues.push({path:"prefs."+k,code:"requires-metadata-mapping"});
 for(const k of Object.keys(raw))if(!["app","version","exportedAt",...families,"budget","cats","cbud","rates","prefs","audit59"].includes(k))issues.push({path:k,code:"unknown-field"});
 for(const key of ["expenses","incomes"])for(let i=0;i<raw[key].length;i++){const e=raw[key][i],dir=key==="expenses"?"out":"in";try{if(!e||typeof e.id!=="string"||!(/^[A-Za-z0-9_-]{3,60}$/).test(e.id)||seen.has(e.id)||!isDate(e.date)||e.date>asOf||typeof e.amount!=="number"||!Number.isFinite(e.amount)||e.amount<=0||typeof e.note!=="string"||e.note.length>160)throw Error("record-contract");const amountMinor=minorFromDecimal(String(e.amount));const allowed=["id","amount","date","note","ts",...(dir==="out"?["cat","tag","cur","orig","bnpl","mood","w"]:["src"])];for(const k of Object.keys(e))if(!allowed.includes(k)&&nonempty(e[k]))throw Error("unmapped-record-metadata:"+k);if(dir==="out"&&(typeof e.cat!=="string"||!e.cat.trim()))throw Error("category");if(e.ts!==undefined&&(!Number.isSafeInteger(e.ts)||e.ts<0))throw Error("timestamp-contract");const metadata={};if(dir==="in"&&nonempty(e.src))metadata.incomeSource=e.src;if(dir==="out"){if(nonempty(e.tag))metadata.tag=e.tag;if(nonempty(e.cur)){metadata.currency=e.cur;metadata.originalMinor=minorFromDecimal(String(e.orig));}else if(nonempty(e.orig))throw Error("original-without-currency");if(nonempty(e.bnpl))metadata.purchaseProvider=e.bnpl;if(nonempty(e.mood))metadata.mood=e.mood;if(nonempty(e.w))metadata.needClass=e.w;}if(Object.keys(metadata).length&&!validRecordMetadata(metadata,dir))throw Error("metadata-contract");seen.add(e.id);ordinary.push({type:"record",id:e.id,direction:dir,amountMinor,date:e.date,category:dir==="out"?e.cat:null,note:e.note,accountId:null,...(e.ts!==undefined?{timestamp:e.ts}:{}),...(Object.keys(metadata).length?{metadata}:{})});}catch(e){issues.push({path:key+"["+i+"]",code:String(e.message)});}}

 let walletBalances=null;
 if(prefs.wallet59!==undefined&&prefs.wallet59!==null){const p=planWalletMigration(prefs.wallet59,ordinary,{asOf});if(p.status!=="WALLET_PREVIEW")issues.push({path:"prefs.wallet59",code:p.code});else{commands.push(...p.commands);walletBalances=p.balances;}}
 else commands.push(...ordinary.map(({timestamp,...fields})=>({type:"domain",fields:{...fields,...(timestamp!==undefined?{sourceTimestamp:timestamp}:{})}})));
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

 for(let i=0;i<raw.fixeds.length;i++)group("fixeds",i,(f,out)=>{
   require(f&&originalId(f.id)&&!seen.has(f.id)&&typeof f.name==="string"&&f.name.trim()&&f.name.length<=160&&typeof f.cat==="string"&&f.cat.trim()&&f.cat.length<=160&&isDate(f.start+"-01")&&f.trackFrom===f.start&&Array.isArray(f.paidMonths)&&Array.isArray(f.paidOn),"fixed-tracked-contract");
   knownFields(f,["id","name","amount","cat","start","end","trackFrom","paidMonths","paidOn"]);
   require(!f.end||isDate(f.end+"-01")&&f.end>=f.start,"fixed-end");
   const amountMinor=strictAmount(f.amount),end=f.end?f.end+"-01":null,r={id:f.id,kind:"fixed",direction:"out",amountMinor,start:f.start+"-01",day:1,everyMonths:1,count:null,end,name:f.name,category:f.cat};
   const paid=new Map();
   for(const p of f.paidOn){require(p&&isDate(p.m+"-01")&&isDate(p.d)&&p.d<=asOf&&p.m>=f.start&&(!f.end||p.m<=f.end)&&!paid.has(p.m),"fixed-payment");knownFields(p,["m","d"]);paid.set(p.m,p.d);}
   require(f.paidMonths.every(m=>paid.has(m))&&new Set(f.paidMonths).size===f.paidMonths.length,"fixed-payment-date-unknown");
   const current=asOf.slice(0,7)+"-01",to=end&&end<current?end:current;
   if(r.start<=to){const past=expandSchedules([r],{from:r.start,to});require(past.every(o=>o.due>=current||paid.has(o.due.slice(0,7))),"fixed-past-unpaid-needs-review");}
   out.push({type:"rule",fields:r});
   for(const [m,d] of paid){const due=m+"-01";out.push({type:"materialize",fields:{scheduleId:r.id,due}},domain({type:"settle",id:"legacy:"+f.id+":"+m,obligationId:"sch:"+f.id+":"+due,amountMinor,date:d,accountId:null,note:f.name}));}
   seen.add(f.id);
 });

 try{if(nonempty(raw.budget))commands.push({type:"budget-default",fields:{category:null,limitMinor:strictAmount(raw.budget)}});if(nonempty(raw.cbud)){require(raw.cbud&&typeof raw.cbud==="object"&&!Array.isArray(raw.cbud),"category-budget-contract");for(const [category,v] of Object.entries(raw.cbud)){require(/^[A-Za-z0-9_-]{1,40}$/.test(category),"category-budget-id");if(v===0)continue;commands.push({type:"budget-default",fields:{category,limitMinor:strictAmount(v)}});}}if(nonempty(raw.cats)){require(Array.isArray(raw.cats)&&raw.cats.length<=30,"category-list");const ids=new Set();for(const c of raw.cats){require(c&&typeof c.id==="string"&&/^[A-Za-z0-9_-]{1,40}$/.test(c.id)&&!ids.has(c.id)&&typeof c.name==="string"&&c.name.trim()&&c.name.length<=24&&typeof c.icon==="string"&&/^[a-z0-9-]{1,30}$/.test(c.icon)&&typeof c.v==="string"&&/^--k-[a-z0-9-]{1,25}$/.test(c.v),"category-contract");knownFields(c,["id","name","icon","v"]);ids.add(c.id);commands.push({type:"category",fields:{id:c.id,name:c.name,icon:c.icon,colorRole:c.v.slice(4)}});}}}catch(e){issues.push({path:"budget/cats/cbud",code:String(e.message)});}
 if(nonempty(prefs.ri)){if(!Array.isArray(prefs.ri)||prefs.ri.length>20)issues.push({path:"prefs.ri",code:"income-rules-contract"});else{const matched=new Set();for(let i=0;i<prefs.ri.length;i++){const r=prefs.ri[i],out=[];try{require(r&&originalId(r.id)&&!seen.has(r.id)&&typeof r.name==="string"&&r.name.trim()&&r.name.length<=40&&typeof r.src==="string"&&r.src.trim()&&r.src.length<=20&&isDate(r.start+"-01")&&Number.isInteger(r.day)&&r.day>=1&&r.day<=31&&(!r.stop||isDate(r.stop)&&r.stop>=r.start+"-01"),"income-rule-contract");knownFields(r,["id","name","src","amount","day","start","stop"]);const rule={id:r.id,kind:"income",direction:"in",amountMinor:strictAmount(r.amount),start:r.start+"-01",day:r.day,everyMonths:1,count:null,end:r.stop||null,name:r.name,incomeSource:r.src};out.push({type:"rule",fields:rule});const local=new Set();if(rule.start<=asOf){for(const o of expandSchedules([rule],{from:rule.start,to:asOf})){const exact=ordinary.filter(m=>m.direction==="in"&&m.date===o.due&&m.amountMinor===o.amountMinor&&m.metadata?.incomeSource===r.src&&!matched.has(m.id)&&!local.has(m.id));require(exact.length===1,"recurring-income-history-needs-review");local.add(exact[0].id);out.push({type:"match-income",fields:{scheduleId:r.id,due:o.due,movementId:exact[0].id}});}}for(const id of local)matched.add(id);seen.add(r.id);commands.push(...out);}catch(e){issues.push({path:"prefs.ri["+i+"]",code:String(e.message)});}}}}
 if(nonempty(prefs.jm)){if(!Array.isArray(prefs.jm)||prefs.jm.length>20)issues.push({path:"prefs.jm",code:"association-list"});else for(let i=0;i<prefs.jm.length;i++){const j=prefs.jm[i];if(seen.has(j?.id)){issues.push({path:"prefs.jm["+i+"]",code:"duplicate-association"});continue;}const p=planAssociation(j,{asOf});if(p.status!=="PREVIEW")issues.push({path:"prefs.jm["+i+"]",code:p.code});else{seen.add(j.id);commands.push(...p.commands);}}}
 if(commands.length>JOURNAL_MAX_COMMANDS)issues.push({path:"records",code:"journal-limit"});return {status:issues.length?"BLOCKED":"IMPORT_PREVIEW",counts,commands,issues,...(walletBalances?{walletBalances}:{}),sourcePreserved:true,productionWriteAllowed:false};}
export function importIntoEmpty(preview){if(preview?.status!=="IMPORT_PREVIEW"||!Array.isArray(preview.commands)||!Array.isArray(preview.issues)||preview.issues.length)throw Error("import-blocked");const s=createJournalSession({format:"masarifi62-journal",version:1,serial:0,commands:preview.commands});if(preview.walletBalances){const actual=accountBalances(s.snapshot().domain);if(actual.length!==preview.walletBalances.length||preview.walletBalances.some(x=>actual.find(a=>a.id===x.id)?.balanceMinor!==x.balanceMinor))throw Error("wallet-parity");}return s;}
