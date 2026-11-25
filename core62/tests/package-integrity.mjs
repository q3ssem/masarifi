import assert from "node:assert/strict";
import {mkdtemp,rm,readFile,writeFile,cp,unlink} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {execFileSync} from "node:child_process";
import {verifyLocalRelease} from "../scripts/verify-local-release.mjs";
const original=resolve(process.argv[2]??"dist/masarifi62-pre-rc"),root=await mkdtemp(join(tmpdir(),"masarifi-package-qa-"));
try{
 const first=await verifyLocalRelease(original),rebuild=join(root,"rebuild");
 execFileSync(process.execPath,["core62/scripts/build-clean-release.mjs",rebuild],{stdio:"inherit"});
 assert.deepEqual(await verifyLocalRelease(rebuild),first,"non-reproducible build");
 for(const p of ["build-manifest.json","README.txt"])assert.deepEqual(await readFile(join(original,p)),await readFile(join(rebuild,p)));
 const copy=join(root,"negative");
 async function rejects(label,mutate){await rm(copy,{recursive:true,force:true});await cp(original,copy,{recursive:true});await mutate(copy);await assert.rejects(verifyLocalRelease(copy),undefined,label);console.log("Rejected: "+label);}
 await rejects("modified asset",async p=>{const file=join(p,"app/app.mjs");const b=await readFile(file);b[0]^=1;await writeFile(file,b);});
 await rejects("missing asset",p=>unlink(join(p,"app/app.mjs")));
 await rejects("unlisted asset",p=>writeFile(join(p,"app/unlisted.mjs"),"export {};"));
 async function modify(p,change){const file=join(p,"build-manifest.json"),m=JSON.parse(await readFile(file,"utf8"));change(m);await writeFile(file,JSON.stringify(m));}
 await rejects("duplicate manifest path",p=>modify(p,m=>m.assets.push(m.assets[0])));
 await rejects("path traversal",p=>modify(p,m=>m.assets[0].path="../secret"));
 await rejects("cloud enabled",p=>modify(p,m=>m.cloudSync=true));
 await rejects("unauthorized release flag",p=>modify(p,m=>m.releaseAuthorized=true));
 await rejects("inconsistent worker inventory",async p=>{const file=join(p,"app/offline-worker.mjs"),old=await readFile(file,"utf8"),next=old.replace(/const ENTRIES=\[[^\n]+\];/,"const ENTRIES=[];");assert.notEqual(old,next);await writeFile(file,next);const {createHash}=await import("node:crypto");await modify(p,m=>{const a=m.assets.find(a=>a.path==="app/offline-worker.mjs");a.bytes=Buffer.byteLength(next);a.sha256=createHash("sha256").update(next).digest("hex");});});
 console.log(JSON.stringify({status:"PACKAGE_INTEGRITY_PASS",...first,reproducible:true,negativeCases:8}));
}finally{await rm(root,{recursive:true,force:true});}
