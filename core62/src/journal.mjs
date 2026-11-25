import {createWorkspace} from "./workspace.mjs";
const MAX_COMMANDS=2000,MAX_TEXT=8*1024*1024;
const jcopy=x=>JSON.parse(JSON.stringify(x));
const jfail=code=>({status:"BLOCKED",code,productionWriteAllowed:false});
function safeJSON(x,depth=0){if(depth>24)throw Error("journal-depth");if(x===null||typeof x==="string"||typeof x==="boolean"||Number.isSafeInteger(x))return;if(Array.isArray(x)){for(const v of x)safeJSON(v,depth+1);return;}if(x&&typeof x==="object"&&Object.getPrototypeOf(x)===Object.prototype){for(const k of Object.keys(x)){if(["__proto__","constructor","prototype"].includes(k))throw Error("journal-key");safeJSON(x[k],depth+1);}return;}throw Error("journal-value");}
export function createJournalSession(input=null){const w=createWorkspace();let commands=[],serial=0;
 if(input!==null){safeJSON(input);if(input.format!=="masarifi62-journal"||input.version!==1||!Array.isArray(input.commands)||input.commands.length>MAX_COMMANDS||!Number.isSafeInteger(input.serial)||input.serial<0||Object.keys(input).length!==4)throw Error("journal-format");
 for(const c of input.commands){if(!c||typeof c.type!=="string"||!c.fields||Object.keys(c).length!==2)throw Error("journal-command");const r=w.apply(c.type,c.fields);if(r.status!=="APPLIED_SHADOW")throw Error("journal-replay:"+r.code);commands.push(jcopy(c));}serial=input.serial;}
 const snapshot=()=>w.snapshot(),view=opts=>w.view(opts);
 function apply(type,fields,expected=snapshot().revision){if(expected!==snapshot().revision)return {status:"CONFLICT",productionWriteAllowed:false};if(commands.length>=MAX_COMMANDS)return jfail("journal-limit");try{safeJSON(fields);const record={type,fields:jcopy(fields)};if(JSON.stringify({format:"masarifi62-journal",version:1,serial,commands:[...commands,record]}).length>MAX_TEXT)return jfail("journal-size");const r=w.apply(type,record.fields,expected);if(r.status==="APPLIED_SHADOW")commands.push(record);return r;}catch{return jfail("invalid-command");}}
 function nextId(prefix){if(typeof prefix!=="string"||!/^[A-Za-z][A-Za-z0-9_-]{0,20}$/.test(prefix)||serial>=Number.MAX_SAFE_INTEGER)throw Error("id-contract");return prefix+"_"+(++serial);}
 function exportJournal(){return jcopy({format:"masarifi62-journal",version:1,serial,commands});}
 return Object.freeze({snapshot,view,apply,nextId,exportJournal});
}
export function parseJournal(text){if(typeof text!=="string"||text.length>MAX_TEXT)throw Error("journal-size");return createJournalSession(JSON.parse(text));}
