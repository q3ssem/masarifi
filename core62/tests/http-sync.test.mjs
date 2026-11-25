import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
import {createJournalSession,parseJournal} from "../src/journal.mjs";
import {createHttpTransport,inspectRemote,preparePush,commitPrepared,journalRelation} from "../src/journal-sync.mjs";
import {createSyncServer,createMemoryVaults} from "../server/sync-server.mjs";
const store=createMemoryVaults(),server=createSyncServer({authenticate:a=>a==="Bearer synthetic-a"?"a":a==="Bearer synthetic-b"?"b":null,store});
await new Promise(r=>server.listen(0,"127.0.0.1",r));try{
 const url="http://127.0.0.1:"+server.address().port,transport=token=>createHttpTransport({baseURL:url,token,fetchImpl:fetch,allowLocalTest:true}),a=transport("synthetic-a"),b=transport("synthetic-b"),pw="synthetic-password";
 const s=createJournalSession(),rec=id=>({type:"record",id,direction:"out",amountMinor:101,date:"2026-12-01",category:"food",note:"private synthetic",accountId:null});
 s.apply("domain",rec("one"));assert.equal((await inspectRemote(a,webcrypto,s,pw)).status,"EMPTY");
 const p=await preparePush(a,webcrypto,s,pw);assert.equal(p.status,"PREPARED");assert.equal((await commitPrepared(a,p)).status,"ACK");assert.equal((await commitPrepared(a,p)).status,"ACK");
 assert.equal((await inspectRemote(b,webcrypto,s,pw)).status,"EMPTY");assert.equal(JSON.stringify(await a.read()).includes("private synthetic"),false);
 await assert.rejects(transport("wrong").read());await assert.rejects(inspectRemote(a,webcrypto,s,"wrong-password"));
 const remote=(await inspectRemote(a,webcrypto,createJournalSession(),pw));assert.equal(remote.status,"REMOTE_AHEAD");assert.deepEqual(remote.remote.snapshot(),s.snapshot());
 const fork=parseJournal(JSON.stringify(s.exportJournal()));s.apply("domain",rec("two"));fork.apply("domain",rec("other"));
 const [p1,p2]=await Promise.all([preparePush(a,webcrypto,s,pw),preparePush(a,webcrypto,fork,pw)]);
 assert.equal((await commitPrepared(a,p1)).status,"ACK");assert.equal((await commitPrepared(a,p2)).status,"CONFLICT");
 assert.equal((await inspectRemote(a,webcrypto,fork,pw)).status,"DIVERGED");assert.equal((await preparePush(a,webcrypto,fork,pw)).status,"DIVERGED");
 assert.equal(journalRelation(s,remote.remote),"LOCAL_AHEAD");console.log("RC1 HTTP encrypted sync integration: auth, account isolation, replay, CAS, divergence, pull and password rejection passed.");
}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
