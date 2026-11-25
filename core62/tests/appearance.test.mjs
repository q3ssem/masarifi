import assert from "node:assert/strict";
import {appearanceStore,normalizeAppearance} from "../app/appearance.mjs";
const ids=["reef6181","dawn6181"],m=new Map(),storage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)},a=appearanceStore(storage,ids);
assert.deepEqual(a.read(),{layout:"classic",theme:ids[0],mode:"light",style:"original",motion:"ios",font:"tajawal"});
assert.equal(a.save({layout:"unified",theme:ids[1],mode:"dark",style:"glass",motion:"quick",secret:"never"}),true);
assert.deepEqual(a.read(),{layout:"unified",theme:ids[1],mode:"dark",style:"glass",motion:"quick",font:"tajawal"});
assert.equal([...m.values()][0].includes("secret"),false);
assert.deepEqual(normalizeAppearance({layout:"unknown",theme:"unknown",mode:"unknown"},ids),{layout:"classic",theme:ids[0],mode:"light",style:"original",motion:"ios",font:"tajawal"});
const unavailable=appearanceStore(undefined,ids);assert.equal(unavailable.save({layout:"unified"}),false);assert.equal(unavailable.read().layout,"classic");
console.log("Dual layout device preference allowlist passed.");

assert.deepEqual(normalizeAppearance({style:"invalid",motion:"invalid"},ids),{layout:"classic",theme:ids[0],mode:"light",style:"original",motion:"ios",font:"tajawal"});assert.equal(a.save({style:"android",motion:"off"}),true);assert.equal(a.read().style,"android");assert.equal(a.read().motion,"off");

for(const style of ["paper","mono"]){assert.equal(a.save({style,motion:"spring"}),true);assert.equal(a.read().style,style);assert.equal(a.read().motion,"spring");}

import {THEMES,themeTokens} from "../src/ui-model.mjs";
assert.equal(THEMES.length,12);assert.equal(new Set(THEMES.map(t=>t[0])).size,12);for(const t of THEMES)for(const mode of ["light","dark"]){const vars=themeTokens(t[0],mode);for(const k of ["--page","--panel","--accent","--action","--ink","--muted","--border"])assert.ok(vars[k]);assert.equal(normalizeAppearance({theme:t[0]},THEMES.map(x=>x[0])).theme,t[0]);}

for(const font of ["tajawal","cairo","plex","system"]){assert.equal(a.save({font}),true);assert.equal(a.read().font,font);}assert.equal(normalizeAppearance({font:"unknown"},ids).font,"tajawal");
