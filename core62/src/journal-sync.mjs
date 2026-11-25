import {isBackupEnvelope,encryptBackup,decryptBackup} from "./secure-backup.mjs";
import {parseJournal} from "./journal.mjs";
// Strict append-only journal comparison. Divergence never auto-merges.
function stable(x){if(x===null||typeof x!=="object")return JSON.stringify(x);if(Array.isArray(x))return "["+x.map(stable).join(",")+"]";return "{"+Object.keys(x).sort().map(k=>JSON.stringify(k)+":"+stable(x[k])).join(",")+"}";}
export function journalRelation(local,remote){const a=local.exportJournal(),b=remote.exportJournal(),n=Math.min(a.commands.length,b.commands.length);for(let i=0;i<n;i++)if(stable(a.commands[i])!==stable(b.commands[i]))return "DIVERGED";if(a.commands.length===b.commands.length)return "EQUAL";return a.commands.length>b.commands.length?"LOCAL_AHEAD":"REMOTE_AHEAD";}
const clone=x=>JSON.parse(JSON.stringify(x));
const validOp=x=>typeof x==="string"&&/^[a-f0-9]{32}$/.test(x);
export function syncHeadTransition(head,request){
 const current=head??{revision:0,envelope:null,lastOp:null};
 if(!request||!validOp(request.opId)||!Number.isSafeInteger(request.expectedRevision)||request.expectedRevision<0||!isBackupEnvelope(request.envelope))return {status:"BLOCKED"};
 if(current.lastOp===request.opId){return current.revision===request.expectedRevision+1&&stable(current.envelope)===stable(request.envelope)?{status:"ACK",revision:current.revision,opId:request.opId}:{status:"CONFLICT",revision:current.revision};}
 if(request.expectedRevision!==current.revision||current.revision>=Number.MAX_SAFE_INTEGER)return {status:"CONFLICT",revision:current.revision};
 const next={revision:current.revision+1,envelope:clone(request.envelope),lastOp:request.opId};return {status:"ACK",revision:next.revision,opId:request.opId,next};
}
export async function inspectRemote(transport,crypto,local,password){const h=await transport.read();if(!h||!Number.isSafeInteger(h.revision)||h.revision<0)throw Error("remote-contract");if(h.revision===0&&h.envelope===null)return {status:"EMPTY",revision:0};if(h.revision===0||!isBackupEnvelope(h.envelope))throw Error("remote-envelope");const remote=parseJournal(await decryptBackup(crypto,h.envelope,password));return {status:journalRelation(local,remote),revision:h.revision,remote};}
export async function preparePush(transport,crypto,local,password){const snapshot=parseJournal(JSON.stringify(local.exportJournal())),remote=await inspectRemote(transport,crypto,snapshot,password);if(!["EMPTY","LOCAL_AHEAD"].includes(remote.status))return {status:remote.status,revision:remote.revision};const opId=Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,"0")).join("");return {status:"PREPARED",request:{opId,expectedRevision:remote.revision,envelope:await encryptBackup(crypto,JSON.stringify(snapshot.exportJournal()),password)}};}
export async function commitPrepared(transport,prepared){if(prepared?.status!=="PREPARED")return {status:"BLOCKED"};const r=prepared.request,a=await transport.write(r);if(a?.status==="ACK"&&a.opId===r.opId&&a.revision===r.expectedRevision+1)return {status:"ACK",revision:a.revision};return {status:a?.status==="CONFLICT"?"CONFLICT":"BLOCKED"};}
export function createHttpTransport({baseURL,token,fetchImpl,allowLocalTest=false}){const u=new URL(baseURL);if(u.username||u.password||u.search||u.hash||!(u.protocol==="https:"||allowLocalTest&&u.protocol==="http:"&&u.hostname==="127.0.0.1")||typeof token!=="string"||!token||typeof fetchImpl!=="function")throw Error("transport-contract");const endpoint=u.href.replace(/\/$/,"")+"/v1/vault";
 async function call(method,body){const r=await fetchImpl(endpoint,{method,headers:{authorization:"Bearer "+token,...(body?{"content-type":"application/json"}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:"no-store",redirect:"error",credentials:"omit"});if(!r.ok&&r.status!==409)throw Error("transport-http-"+r.status);return r.json();}
 return Object.freeze({read:()=>call("GET"),write:r=>call("PUT",r)});
}
