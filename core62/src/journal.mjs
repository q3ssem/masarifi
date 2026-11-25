import {createWorkspace} from "./workspace.mjs";
export const JOURNAL_MAX_COMMANDS=20000,JOURNAL_MAX_BYTES=8*1024*1024;
const jcopy=x=>JSON.parse(JSON.stringify(x));
const jfail=code=>({status:"BLOCKED",code,productionWriteAllowed:false});
function journalBytes(s){let n=0;for(const c of s){const v=c.codePointAt(0);n+=v<=127?1:v<=2047?2:v<=65535?3:4;}return n;}
function safeJSON(x,depth=0){if(depth>24)throw Error("journal-depth");if(x===null||typeof x==="string"||typeof x==="boolean"||Number.isSafeInteger(x))return;if(Array.isArray(x)){for(const v of x)safeJSON(v,depth+1);return;}if(x&&typeof x==="object"&&Object.getPrototypeOf(x)===Object.prototype){for(const k of Object.keys(x)){if(["__proto__","constructor","prototype"].includes(k))throw Error("journal-key");safeJSON(x[k],depth+1);}return;}throw Error("journal-value");}
const journalEnvelope=(serial,commands)=>({format:"masarifi62-journal",version:1,serial,commands});
function checkRecord(c){if(!c||typeof c.type!=="string"||!c.fields||Object.keys(c).length!==2||!Object.hasOwn(c,"type")||!Object.hasOwn(c,"fields"))throw Error("journal-command");safeJSON(c);return jcopy(c);}
const isRecord=c=>c.type==="domain"&&c.fields.type==="record";
export function createJournalSession(input=null){
 const w=createWorkspace();let commands=[],serial=0,bodyBytes=0;const used=new Set();
 function remember(c){bodyBytes+=journalBytes(JSON.stringify(c))+(commands.length?1:0);commands.push(c);if(typeof c.fields.id==="string")used.add(c.fields.id);}
 function fits(count,extra){return count<=JOURNAL_MAX_COMMANDS&&journalBytes(JSON.stringify(journalEnvelope(Number.MAX_SAFE_INTEGER,[])))+bodyBytes+extra<=JOURNAL_MAX_BYTES;}
 if(input!==null){safeJSON(input);if(input.format!=="masarifi62-journal"||input.version!==1||!Array.isArray(input.commands)||input.commands.length>JOURNAL_MAX_COMMANDS||!Number.isSafeInteger(input.serial)||input.serial<0||Object.keys(input).length!==4||journalBytes(JSON.stringify(input))>JOURNAL_MAX_BYTES)throw Error("journal-format");
 const list=input.commands.map(checkRecord);serial=input.serial;
 for(let i=0;i<list.length;){const c=list[i];if(isRecord(c)){let end=i+1;while(end<list.length&&isRecord(list[end]))end++;const batch=list.slice(i,end),r=w.applyRecords(batch.map(x=>x.fields),commands.length);if(r.status!=="APPLIED_SHADOW")throw Error("journal-replay:"+r.code);for(const x of batch)remember(x);i=end;}else{const r=w.apply(c.type,c.fields,commands.length);if(r.status!=="APPLIED_SHADOW")throw Error("journal-replay:"+r.code);remember(c);i++;}}}
 const snapshot=()=>w.snapshot(),view=opts=>w.view(opts);
 function apply(type,fields,expected=commands.length){if(expected!==commands.length)return {status:"CONFLICT",productionWriteAllowed:false};try{const c=checkRecord({type,fields});if(commands.length>=JOURNAL_MAX_COMMANDS)return jfail("journal-limit");if(!fits(commands.length+1,journalBytes(JSON.stringify(c))+(commands.length?1:0)))return jfail("journal-size");const r=w.apply(type,c.fields,expected);if(r.status==="APPLIED_SHADOW")remember(c);return r;}catch{return jfail("invalid-command");}}
 function applyRecords(fields,expected=commands.length){if(expected!==commands.length)return {status:"CONFLICT",productionWriteAllowed:false};try{if(!Array.isArray(fields)||!fields.length)return jfail("batch-contract");if(commands.length+fields.length>JOURNAL_MAX_COMMANDS)return jfail("journal-limit");const list=fields.map(f=>checkRecord({type:"domain",fields:f}));if(!list.every(isRecord))return jfail("batch-contract");const extra=list.reduce((n,c,i)=>n+journalBytes(JSON.stringify(c))+(commands.length||i?1:0),0);if(!fits(commands.length+list.length,extra))return jfail("journal-size");const r=w.applyRecords(list.map(c=>c.fields),expected);if(r.status==="APPLIED_SHADOW")for(const c of list)remember(c);return r;}catch{return jfail("invalid-command");}}
 function nextId(prefix){if(typeof prefix!=="string"||!/^[A-Za-z][A-Za-z0-9_-]{0,20}$/.test(prefix))throw Error("id-contract");let id;do{if(serial>=Number.MAX_SAFE_INTEGER)throw Error("id-overflow");id=prefix+"_"+(++serial);}while(used.has(id));return id;}
 const exportJournal=()=>jcopy(journalEnvelope(serial,commands));
 return Object.freeze({snapshot,view,apply,applyRecords,nextId,exportJournal});
}
export function parseJournal(text){if(typeof text!=="string"||text.length>JOURNAL_MAX_BYTES||journalBytes(text)>JOURNAL_MAX_BYTES)throw Error("journal-size");return createJournalSession(JSON.parse(text));}
