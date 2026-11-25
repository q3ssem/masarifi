import {encryptBackup,decryptBackup,isBackupEnvelope} from "./secure-backup.mjs";
import {parseJournal} from "./journal.mjs";
const DB="masarifi62-clean-encrypted-v1",STORE="journal";
export function vaultTransition(head,expected,envelope,{recover=false}={}){
 const current=head??{generation:0,envelope:null};if(!Number.isSafeInteger(current.generation)||current.generation<0||current.generation>=Number.MAX_SAFE_INTEGER||!Number.isSafeInteger(expected)||expected!==current.generation)return {status:"CONFLICT",generation:current.generation};
 if(!isBackupEnvelope(envelope))return {status:"BLOCKED",code:"invalid-envelope"};
 if(head&&(!isBackupEnvelope(current.envelope)||current.previous!=null&&!isBackupEnvelope(current.previous)||current.quarantine!=null&&!isBackupEnvelope(current.quarantine)))return {status:"BLOCKED",code:"invalid-head"};
 if(recover&&(!head||!isBackupEnvelope(current.previous)))return {status:"BLOCKED",code:"no-previous"};
 return {status:"SAVED",next:{generation:current.generation+1,envelope,previous:recover?current.previous:current.envelope??null,quarantine:recover?current.envelope:current.quarantine??null}};
}
export function openJournalStore(idb){return new Promise((resolve,reject)=>{let request;try{request=idb.open(DB,1);}catch(e){reject(e);return;}let canceled=false;request.onblocked=()=>{canceled=true;reject(Error("vault-open-blocked"));};request.onerror=()=>reject(request.error||Error("vault-open"));request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE);};request.onsuccess=()=>{const db=request.result;if(canceled){db.close();return;}db.onversionchange=()=>db.close();
 function tx(mode,expected,envelope,recover=false){return new Promise((res,rej)=>{let t;try{t=db.transaction(STORE,mode);}catch(e){rej(e);return;}let result,err;t.oncomplete=()=>res(result);t.onabort=()=>rej(err||t.error||Error("vault-abort"));t.onerror=()=>{};const os=t.objectStore(STORE),r=os.get("head");r.onsuccess=()=>{try{const head=r.result??null;if(mode==="readonly"){result=head;return;}result=vaultTransition(head,expected,envelope,{recover});if(result.status==="SAVED")os.put(result.next,"head");}catch(e){err=e;t.abort();}};});}
 resolve(Object.freeze({read:()=>tx("readonly"),save:(expected,envelope)=>tx("readwrite",expected,envelope),recover:(expected,envelope)=>tx("readwrite",expected,envelope,true),close:()=>db.close()}));};});}
export async function saveEncrypted(store,crypto,session,password,expected){
 const plaintext=JSON.stringify(session.exportJournal()),head=await store.read(),generation=head?.generation??0;
 if(generation!==expected)return {status:"CONFLICT",generation};
 if(head)await decryptBackup(crypto,head.envelope,password);
 const envelope=await encryptBackup(crypto,plaintext,password);return store.save(expected,envelope);
}
export async function loadEncrypted(store,crypto,password,{previous=false}={}){const head=await store.read();if(!head)return {status:"EMPTY",generation:0};const envelope=previous?head.previous:head.envelope;if(!envelope)throw Error("no-revision");const session=parseJournal(await decryptBackup(crypto,envelope,password));return {status:"LOADED",generation:head.generation,session};}
export async function recoverPreviousEncrypted(store,crypto,password,expected){
 const head=await store.read();if(!head||head.generation!==expected)return {status:"CONFLICT",generation:head?.generation??0};
 if(!isBackupEnvelope(head.previous))return {status:"BLOCKED",code:"no-previous"};
 const session=parseJournal(await decryptBackup(crypto,head.previous,password));
 const envelope=await encryptBackup(crypto,JSON.stringify(session.exportJournal()),password);
 const result=await store.recover(expected,envelope);
 return result.status==="SAVED"?{status:"RECOVERED",generation:result.next.generation,session}:result;
}
