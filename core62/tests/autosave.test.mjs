import assert from "node:assert/strict";
import {createAutosave} from "../src/autosave.mjs";
let rev=1,seen=[],resolveSave,block=true,status=[];
const a=createAutosave({capture:()=>rev,save:async(r,p)=>{seen.push([r,p]);if(block)await new Promise(resolve=>resolveSave=resolve);return {status:"SAVED"};},onStatus:s=>status.push(s)});
assert.equal((await a.request()).status,"OFF");a.enable("synthetic-password");const p=a.request();await Promise.resolve();rev=2;a.request();rev=3;a.request();block=false;resolveSave();await p;assert.deepEqual(seen.map(x=>x[0]),[1,3]);assert.equal(a.active(),true);a.stop();assert.equal(a.active(),false);
const b=createAutosave({capture:()=>0,save:async()=>({status:"CONFLICT"})});b.enable("synthetic-password");assert.equal((await b.request()).status,"CONFLICT");assert.equal(b.active(),false);
const c=createAutosave({capture:()=>0,save:async()=>{throw Error("quota");}});c.enable("synthetic-password");assert.equal((await c.request()).status,"ERROR");assert.equal(c.active(),false);
console.log(JSON.stringify({passed:7,total:7,scope:"autosave serialization, coalescing, stop, conflict and failure"}));