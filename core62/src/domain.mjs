import {isDate,safeMinor} from "./money.mjs";
import {analyzeLedger} from "./ledger.mjs";
// Clean, in-memory domain model; no legacy state, DOM, network, or storage dependency.
const FAMILIES=Object.freeze(["debt","installment","association","fixed","bnpl"]);
const idOK=x=>typeof x==="string"&&/^[A-Za-z0-9:_-]{1,100}$/.test(x);
const amountOK=x=>Number.isSafeInteger(x)&&x>0;
const textOK=x=>typeof x==="string"&&x.length<=160;
const copy=x=>JSON.parse(JSON.stringify(x));
const deny=code=>({status:"BLOCKED",code,productionWriteAllowed:false});
const must=(x,code)=>{if(!x)throw Error(code);};
const exact=(x,keys)=>!!x&&typeof x==="object"&&!Array.isArray(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(x,k));
export function emptyDomain(){return {schema:1,revision:0,accounts:[],movements:[],obligations:[],audit:[]};}
function find(xs,id){return xs.find(x=>x.id===id);}
function requireAccount(s,id,date){if(id===null)return;const a=find(s.accounts,id);must(a&&!a.archived&&date>=a.openingDate,"account-unavailable");}
function normalizeCommand(c){must(c&&typeof c.type==="string"&&idOK(c.opId)&&Number.isSafeInteger(c.expectedRevision)&&c.expectedRevision>=0,"command-contract");const fields={account:["id","name","openingMinor","openingDate"],archive:["id"],record:["id","direction","amountMinor","date","category","note","accountId"],edit:["id","direction","amountMinor","date","category","note","accountId"],void:["id"],transfer:["id","from","to","amountMinor","date","note"],obligation:["id","family","direction","amountMinor","due","name"],settle:["id","obligationId","amountMinor","date","accountId","note"]};const extra=fields[c.type];must(extra&&Array.isArray(extra)&&exact(c,["type","opId","expectedRevision",...extra]),"command-fields");return JSON.stringify(Object.fromEntries(["type","opId","expectedRevision",...extra].map(k=>[k,c[k]])));}
function remainingBig(s,id){const o=find(s.obligations,id);must(o,"obligation-missing");let paid=0n;for(const m of s.movements)if(!m.voided&&m.kind==="settlement"&&m.obligationId===id)paid+=BigInt(m.amountMinor);return BigInt(o.amountMinor)-paid;}
export function accountBalances(s){const balances=new Map(s.accounts.map(a=>[a.id,BigInt(a.openingMinor)]));for(const m of s.movements){if(m.voided)continue;const v=BigInt(m.amountMinor);if(m.kind==="transfer"){balances.set(m.from,balances.get(m.from)-v);balances.set(m.to,balances.get(m.to)+v);}else if(m.accountId!==null)balances.set(m.accountId,balances.get(m.accountId)+(m.direction==="in"?v:-v));}return s.accounts.map(a=>({id:a.id,balanceMinor:safeMinor(balances.get(a.id)),archived:a.archived}));}
export function obligationStatus(s){return s.obligations.map(o=>({id:o.id,family:o.family,direction:o.direction,due:o.due,remainingMinor:safeMinor(remainingBig(s,o.id))}));}
export function domainLedger(s){return s.movements.filter(m=>!m.voided&&m.kind!=="transfer").map(m=>({id:m.id,date:m.date,amountMinor:m.direction==="in"?m.amountMinor:-m.amountMinor,status:"confirmed",kind:m.kind==="settlement"?find(s.obligations,m.obligationId).family:m.direction==="in"?"income":"expense",category:m.direction==="in"?null:m.category}));}
function validateState(s){must(s&&s.schema===1&&Number.isSafeInteger(s.revision)&&s.revision>=0&&["accounts","movements","obligations","audit"].every(k=>Array.isArray(s[k]))&&s.audit.length===s.revision,"state-contract");
const unique=xs=>{const ids=new Set();for(const x of xs){must(x&&idOK(x.id)&&!ids.has(x.id),"duplicate-state-id");ids.add(x.id);}};
unique(s.accounts);unique(s.movements);unique(s.obligations);
for(const a of s.accounts)must(textOK(a.name)&&a.name.trim()&&isDate(a.openingDate)&&Number.isSafeInteger(a.openingMinor)&&typeof a.archived==="boolean","account-state");
for(const o of s.obligations)must(FAMILIES.includes(o.family)&&["in","out"].includes(o.direction)&&amountOK(o.amountMinor)&&isDate(o.due)&&textOK(o.name)&&o.name.trim(),"obligation-state");
for(const m of s.movements){must(amountOK(m.amountMinor)&&isDate(m.date)&&textOK(m.note)&&typeof m.voided==="boolean","movement-state");const validRef=id=>{const a=find(s.accounts,id);return a&&m.date>=a.openingDate;};if(m.kind==="transfer"){must(m.from!==m.to&&validRef(m.from)&&validRef(m.to),"transfer-state");}else{must(["record","settlement"].includes(m.kind)&&["in","out"].includes(m.direction)&&(m.accountId===null||validRef(m.accountId))&&(m.category===null||textOK(m.category)),"movement-state");if(m.kind==="settlement"){const o=find(s.obligations,m.obligationId);must(o&&o.direction===m.direction&&m.category===o.family,"settlement-state");}}}
const ops=new Set();for(let i=0;i<s.audit.length;i++){const a=s.audit[i];must(a&&idOK(a.opId)&&!ops.has(a.opId)&&a.revision===i+1&&typeof a.command==="string","audit-state");ops.add(a.opId);}
for(const o of s.obligations)must(remainingBig(s,o.id)>=0n,"overpaid-state");accountBalances(s);must(analyzeLedger(domainLedger(s)).complete,"ledger-quality");}
export function execute(s,c){
try{validateState(s);const command=normalizeCommand(c);const old=s.audit.find(a=>a.opId===c.opId);if(old)return old.command===command?{status:"ALREADY_APPLIED",state:s,productionWriteAllowed:false}:deny("op-id-reused");
if(c.expectedRevision!==s.revision)return {status:"CONFLICT",revision:s.revision,productionWriteAllowed:false};must(s.revision<Number.MAX_SAFE_INTEGER,"revision-overflow");
const n=copy(s);let before=null,after=null;
switch(c.type){
case "account":must(idOK(c.id)&&!find(n.accounts,c.id)&&textOK(c.name)&&c.name.trim()&&Number.isSafeInteger(c.openingMinor)&&isDate(c.openingDate),"account-contract");after={id:c.id,name:c.name,openingMinor:c.openingMinor,openingDate:c.openingDate,archived:false};n.accounts.push(after);break;
case "archive":{const a=find(n.accounts,c.id);must(a&&!a.archived,"account-unavailable");before=copy(a);a.archived=true;after=a;break;}
case "record":case "edit":{const m=find(n.movements,c.id);must(idOK(c.id)&&(c.type==="record"?!m:m&&m.kind==="record"&&!m.voided),"record-id");must(["in","out"].includes(c.direction)&&amountOK(c.amountMinor)&&isDate(c.date)&&textOK(c.note)&&(c.direction==="in"?c.category===null:typeof c.category==="string"&&c.category.trim()&&textOK(c.category)),"record-contract");requireAccount(n,c.accountId,c.date);after={id:c.id,kind:"record",direction:c.direction,amountMinor:c.amountMinor,date:c.date,category:c.category,note:c.note,accountId:c.accountId,voided:false};if(m){before=copy(m);n.movements[n.movements.indexOf(m)]=after;}else n.movements.push(after);break;}
case "void":{const m=find(n.movements,c.id);must(m&&!m.voided,"movement-unavailable");before=copy(m);m.voided=true;after=m;break;}
case "transfer":must(idOK(c.id)&&!find(n.movements,c.id)&&idOK(c.from)&&idOK(c.to)&&c.from!==c.to&&amountOK(c.amountMinor)&&isDate(c.date)&&textOK(c.note),"transfer-contract");requireAccount(n,c.from,c.date);requireAccount(n,c.to,c.date);after={id:c.id,kind:"transfer",from:c.from,to:c.to,amountMinor:c.amountMinor,date:c.date,note:c.note,voided:false};n.movements.push(after);break;
case "obligation":must(idOK(c.id)&&!find(n.obligations,c.id)&&FAMILIES.includes(c.family)&&["in","out"].includes(c.direction)&&amountOK(c.amountMinor)&&isDate(c.due)&&textOK(c.name)&&c.name.trim(),"obligation-contract");after={id:c.id,family:c.family,direction:c.direction,amountMinor:c.amountMinor,due:c.due,name:c.name};n.obligations.push(after);break;
case "settle":{const o=find(n.obligations,c.obligationId);must(idOK(c.id)&&!find(n.movements,c.id)&&o&&amountOK(c.amountMinor)&&isDate(c.date)&&textOK(c.note)&&BigInt(c.amountMinor)<=remainingBig(n,o.id),"settlement-contract");requireAccount(n,c.accountId,c.date);after={id:c.id,kind:"settlement",obligationId:o.id,direction:o.direction,amountMinor:c.amountMinor,date:c.date,category:o.family,accountId:c.accountId,note:c.note,voided:false};n.movements.push(after);break;}
default:return deny("unknown-command");
}
n.revision++;n.audit.push({revision:n.revision,opId:c.opId,command,before:copy(before),after:copy(after)});validateState(n);return {status:"APPLIED_SHADOW",state:n,productionWriteAllowed:false};
}catch(e){return deny(e instanceof RangeError?"balance-overflow":String(e.message||"invalid-command"));}
}
