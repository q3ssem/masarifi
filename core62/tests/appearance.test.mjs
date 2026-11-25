import assert from "node:assert/strict";
import {appearanceStore,normalizeAppearance} from "../app/appearance.mjs";
const ids=["reef6181","dawn6181"],m=new Map(),storage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)},a=appearanceStore(storage,ids);
assert.deepEqual(a.read(),{layout:"classic",theme:ids[0],mode:"light",style:"original",motion:"ios"});
assert.equal(a.save({layout:"unified",theme:ids[1],mode:"dark",style:"glass",motion:"quick",secret:"never"}),true);
assert.deepEqual(a.read(),{layout:"unified",theme:ids[1],mode:"dark",style:"glass",motion:"quick"});
assert.equal([...m.values()][0].includes("secret"),false);
assert.deepEqual(normalizeAppearance({layout:"unknown",theme:"unknown",mode:"unknown"},ids),{layout:"classic",theme:ids[0],mode:"light",style:"original",motion:"ios"});
const unavailable=appearanceStore(undefined,ids);assert.equal(unavailable.save({layout:"unified"}),false);assert.equal(unavailable.read().layout,"classic");
console.log("Dual layout device preference allowlist passed.");

assert.deepEqual(normalizeAppearance({style:"invalid",motion:"invalid"},ids),{layout:"classic",theme:ids[0],mode:"light",style:"original",motion:"ios"});assert.equal(a.save({style:"android",motion:"off"}),true);assert.equal(a.read().style,"android");assert.equal(a.read().motion,"off");
