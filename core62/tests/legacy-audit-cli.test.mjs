import assert from "node:assert/strict";
import {mkdtemp,writeFile,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
const dir=await mkdtemp(join(tmpdir(),"masarifi-audit-")),backup=join(dir,"backup.json"),rows=join(dir,"rows.json");
try{
 const raw={app:"masarifi",version:2,expenses:[{id:"e_1",amount:12.34,cat:"food",note:"private-test",date:"2026-12-20"}],incomes:[],insts:[],debts:[],goals:[],fixeds:[],budget:0,cats:null,cbud:{},rates:{},prefs:{}};
 const text=JSON.stringify(raw);await writeFile(backup,text);
 const independent=[{id:"e_1",date:"2026-12-20",status:"planned",kind:"expense",category:"food",amountMinor:-1234}];await writeFile(rows,JSON.stringify(independent));
 const run=(strict=false)=>spawnSync(process.execPath,["core62/scripts/audit-legacy-readonly.mjs",backup,rows,"2026-12-15","2026-12-31",...(strict?["--strict-identity"]:[])],{encoding:"utf8"});
 let out=run();assert.equal(out.status,0,out.stderr);const report=JSON.parse(out.stdout);assert.equal(report.status,"MONTHLY_TOTALS_MATCH");assert.equal(report.identityVerified,false);assert.equal(report.productionWriteAllowed,false);assert.ok(!out.stdout.includes("private-test"));
 assert.equal(JSON.parse(run(true).stdout).identityVerified,true);
 await writeFile(rows,JSON.stringify([{...independent[0],id:"different"}]));out=run();assert.equal(out.status,0);assert.equal(JSON.parse(out.stdout).rowIdentity.identityVerified,false);
 out=run(true);assert.equal(out.status,1);assert.equal(JSON.parse(out.stdout).status,"BLOCKED");
 await writeFile(rows,JSON.stringify([{...independent[0],amountMinor:-1235}]));out=run();assert.equal(out.status,1);assert.equal(JSON.parse(out.stdout).status,"BLOCKED");assert.equal(await readFile(backup,"utf8"),text);
 console.log("Read-only migration audit: independent synthetic match, mismatch rejection and unchanged source passed.");
}finally{await rm(dir,{recursive:true,force:true});}
