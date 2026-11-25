import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {encryptBackup,decryptBackup} from "../src/secure-backup.mjs";
import {openSqliteVaults} from "../server/sqlite-vaults.mjs";
const dir=await mkdtemp(join(tmpdir(),"masarifi62-rc1-")),path=join(dir,"vault.sqlite"),pw="synthetic-password";
let a,b;try{
 const envelope=await encryptBackup(webcrypto,"synthetic confidential",pw),request={opId:"a".repeat(32),expectedRevision:0,envelope};
 a=openSqliteVaults(path);assert.equal(a.cas("account-a",request).status,"ACK");a.close();a=null;
 a=openSqliteVaults(path);b=openSqliteVaults(path);assert.equal(a.read("account-a").revision,1);assert.equal(await decryptBackup(webcrypto,a.read("account-a").envelope,pw),"synthetic confidential");assert.equal(b.read("account-b").revision,0);
 assert.equal(a.cas("account-a",request).status,"ACK");const next={opId:"b".repeat(32),expectedRevision:1,envelope};
 assert.equal(a.cas("account-a",next).status,"ACK");assert.equal(b.cas("account-a",{...next,opId:"c".repeat(32)}).status,"CONFLICT");
 assert.equal(b.read("account-a").revision,2);assert.equal(b.cas("account-b",request).status,"ACK");assert.equal(a.read("account-a").revision,2);
 assert.equal(a.cas("account-a",{...next,opId:"d".repeat(32),expectedRevision:2,envelope:{}}).status,"BLOCKED");assert.equal(a.read("account-a").revision,2);
 console.log("RC1 SQLite persistence: reopen, authenticated ciphertext recovery, isolated accounts, idempotent retry and stale CAS passed.");
}finally{a?.close();b?.close();await rm(dir,{recursive:true,force:true});}
