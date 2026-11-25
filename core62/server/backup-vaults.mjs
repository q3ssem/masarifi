import {DatabaseSync} from "node:sqlite";
import {open,lstat,rm,chmod,realpath} from "node:fs/promises";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
export async function backupVaults(source,destination){
 const src=await realpath(source),dst=resolve(destination);
 if(!(await lstat(src)).isFile()||src===dst)throw Error("backup-path");
 const file=await open(dst,"wx",0o600);await file.close();
 let db,check;
 try{
 db=new DatabaseSync(src,{readOnly:true});db.exec("PRAGMA busy_timeout=5000");
 db.prepare("VACUUM INTO ?").run(dst);db.close();db=null;
 await chmod(dst,0o600);check=new DatabaseSync(dst,{readOnly:true});
 const integrity=check.prepare("PRAGMA quick_check").all();if(integrity.length!==1||Object.values(integrity[0])[0]!=="ok")throw Error("backup-integrity");
 const row=check.prepare("SELECT count(*) AS count FROM vaults").get();check.close();check=null;
 return {status:"BACKUP_VERIFIED",vaultCount:row.count};
 }catch(e){if(check)check.close();if(db)db.close();await rm(dst,{force:true});throw e;}
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 if(process.argv.length!==4)throw Error("Usage: node core62/server/backup-vaults.mjs source.sqlite destination.sqlite");
 console.log(JSON.stringify(await backupVaults(process.argv[2],process.argv[3])));
}
