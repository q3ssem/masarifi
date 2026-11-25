import {DatabaseSync} from "node:sqlite";
import {syncHeadTransition} from "../src/journal-sync.mjs";
// Durable reference adapter. Production identity and deployment are separate.
export function openSqliteVaults(path){
 const db=new DatabaseSync(path);db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS vaults (uid TEXT PRIMARY KEY NOT NULL, revision INTEGER NOT NULL CHECK(revision>=1), envelope TEXT NOT NULL, last_op TEXT NOT NULL)");
 const get=db.prepare("SELECT revision,envelope,last_op FROM vaults WHERE uid=?"),put=db.prepare("INSERT INTO vaults(uid,revision,envelope,last_op) VALUES(?,?,?,?) ON CONFLICT(uid) DO UPDATE SET revision=excluded.revision,envelope=excluded.envelope,last_op=excluded.last_op");
 function read(uid){const row=get.get(uid);return row?{revision:row.revision,envelope:JSON.parse(row.envelope),lastOp:row.last_op}:{revision:0,envelope:null,lastOp:null};}
 function cas(uid,request){db.exec("BEGIN IMMEDIATE");try{const h=read(uid),r=syncHeadTransition(h,request);if(r.next)put.run(uid,r.next.revision,JSON.stringify(r.next.envelope),r.next.lastOp);db.exec("COMMIT");const {next,...reply}=r;return reply;}catch(e){db.exec("ROLLBACK");throw e;}}
 return Object.freeze({read,cas,close:()=>db.close()});
}
