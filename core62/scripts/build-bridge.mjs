// Regenerate inline bundle from canonical ES modules. Does not touch any data.
import {readFile,writeFile} from "node:fs/promises";
const root=new URL("../../",import.meta.url);
const names=["money","ledger","migration","projection-parity","legacy-bridge"];
const strip=s=>s.replace(/^import .*;\s*$/gm,"").replace(/^export \{[^}]+\};?\s*$/gm,"").replace(/\bexport (?=function|const|async function)/g,"");
const bundled=(await Promise.all(names.map(n=>readFile(new URL("core62/src/"+n+".mjs",root),"utf8")))).map(strip).join("\n");
const script="/* Generated from core62/src; see core62/scripts/build-bridge.mjs. */\n(function(root){\"use strict\";\n"+bundled+"\nObject.defineProperty(root,\"Masarifi62Bridge\",{value:Object.freeze({version:BRIDGE_VERSION,chooseLedgerAnalysis}),configurable:false,writable:false});\n})(window);\n";
if(/<\/script/i.test(script))throw Error("unsafe script");
const path=new URL("index.html",root),html=await readFile(path,"utf8"),re=/<!-- CORE62_BRIDGE_BEGIN -->\n<script>\n[\s\S]*?<\/script>\n<!-- CORE62_BRIDGE_END -->/g;
if([...html.matchAll(re)].length!==1)throw Error("bridge marker");
const next=html.replace(re,()=>"<!-- CORE62_BRIDGE_BEGIN -->\n<script>\n"+script+"</script>\n<!-- CORE62_BRIDGE_END -->");
if(process.argv.includes("--check")){if(next!==html)throw Error("stale embedded bridge");console.log("bridge up to date");}else await writeFile(path,next);
