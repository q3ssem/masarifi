import assert from "node:assert/strict";
import {mkdtemp,rm,stat} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {webcrypto} from "node:crypto";
import {openSqliteVaults} from "../server/sqlite-vaults.mjs";
import {backupVaults} from "../server/backup-vaults.mjs";
import {encryptBackup,decryptBackup} from "../src/secure-backup.mjs";
import {createJournalSession} from "../src/journal.mjs";
const dir=await mkdtemp(join(tmpdir(),"masarifi-backup-")),source=join(dir,"live.sqlite"),dest=join(dir,"backup.sqlite");
let db,restored;
try{db=openSqliteVaults(source);const j=createJournalSession(),pw="synthetic-only-password",json=JSON.stringify(j.exportJournal()),envelope=await encryptBackup(webcrypto,json,pw);
assert.equal(db.cas("a",{opId:"a".repeat(32),expectedRevision:0,envelope}).status,"ACK");
assert.deepEqual(await backupVaults(source,dest),{status:"BACKUP_VERIFIED",vaultCount:1});assert.equal((await stat(dest)).mode&0o777,0o600);
assert.equal(db.cas("b",{opId:"b".repeat(32),expectedRevision:0,envelope}).status,"ACK");
restored=openSqliteVaults(dest);assert.equal(restored.read("a").revision,1);assert.equal(restored.read("b").revision,0);assert.equal(await decryptBackup(webcrypto,restored.read("a").envelope,pw),json);
await assert.rejects(backupVaults(source,dest),/EEXIST/);console.log("SQLite snapshot: online backup, integrity check, exclusive destination, encrypted restore verified.");
}finally{if(restored)restored.close();if(db)db.close();await rm(dir,{recursive:true,force:true});}
