import {searchMovements} from "../src/search.mjs";
import {encryptBackup,decryptBackup,isBackupEnvelope} from "../src/secure-backup.mjs";
import {createAutosave} from "../src/autosave.mjs";
const check=(ok,label)=>{if(!ok)throw Error(label);};
const timed=async(fn)=>{const start=performance.now();const value=await fn();return {value,ms:Math.round(performance.now()-start)};};
export async function runAudit03(crypto=globalThis.crypto){
 const results={search:[],backup:[],autosave:null};
 const rows=Array.from({length:20000},(_,i)=>({id:"r"+i,date:"2026-12-01",amountMinor:-12345,status:i%2?"confirmed":"planned",kind:"expense",category:"food",note:(i%2?"قَهْوَة ١٢٣":"طعام ٤٥٦")+" "+"ملاحظة ".repeat(12)}));
 for(const query of ["","قهوة 123","not found"]){const expected=query===""?20000:query==="قهوة 123"?10000:0;const times=[];for(let i=0;i<20;i++){const {value,ms}=await timed(()=>searchMovements(rows,query,{limit:100,offset:expected?expected-100:0}));check(value.total===expected,"search total");check(value.results.length===(expected?100:0),"search page");check(!value.truncated,"search last page");if(expected)check(value.results.at(-1).id==="r19999","search order");times.push(ms);}times.sort((a,b)=>a-b);results.search.push({query,rows:rows.length,repetitions:times.length,medianMs:times[10],p95Ms:times[18],maxMs:times.at(-1)});}
 const password="synthetic-audit-03-only";
 for(const bytes of [1024*1024,8*1024*1024]){const plain="م".repeat(bytes/2);const enc=await timed(()=>encryptBackup(crypto,plain,password));check(isBackupEnvelope(enc.value),"valid envelope");const dec=await timed(()=>decryptBackup(crypto,enc.value,password));check(dec.value===plain,"roundtrip equality");check(enc.value.ciphertext.length===2*(bytes+16),"cipher length");const changed={...enc.value,ciphertext:(enc.value.ciphertext[0]==="0"?"1":"0")+enc.value.ciphertext.slice(1)};let rejected=false;try{await decryptBackup(crypto,changed,password);}catch{rejected=true;}check(rejected,"tampered backup accepted");results.backup.push({bytes,encryptMs:enc.ms,decryptMs:dec.ms,tamperRejected:true});}
 let revision=1,release,concurrent=0,peakConcurrent=0;const saved=[];
 const auto=createAutosave({capture:()=>revision,save:async(r)=>{concurrent++;peakConcurrent=Math.max(peakConcurrent,concurrent);saved.push(r);if(r===1)await new Promise(resolve=>release=resolve);concurrent--;return {status:"SAVED"};}});
 auto.enable(password);const pending=auto.request();await Promise.resolve();for(let i=2;i<=20000;i++){revision=i;auto.request();}release();await pending;
 check(saved.length===2&&saved[0]===1&&saved[1]===20000,"coalesced latest revision");check(peakConcurrent===1,"parallel save");check(!auto.busy(),"stuck busy");auto.stop();check((await auto.request()).status==="OFF","stop request");results.autosave={requests:20000,writes:saved.length,peakConcurrent,latestRevision:saved.at(-1)};
 return results;
}
