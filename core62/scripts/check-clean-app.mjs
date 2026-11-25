import assert from "node:assert/strict";
import {readFile,stat} from "node:fs/promises";
import {resolve,dirname,relative,extname} from "node:path";
import {fileURLToPath} from "node:url";
const root=fileURLToPath(new URL("../",import.meta.url)),entry=resolve(root,"app/app.mjs"),seen=new Set(),forbidden=new Set(["legacy-bridge.mjs","migration.mjs","projection-parity.mjs","data-shadow.mjs","persistent-shadow.mjs","operations-model.mjs"]);
async function walk(file){const rel=relative(root,file);assert.ok(!rel.startsWith("..")&&!forbidden.has(rel.split("/").at(-1)),"forbidden dependency "+rel);if(seen.has(file))return;seen.add(file);const src=await readFile(file,"utf8");if(rel!=="app/data-center.mjs"&&rel!=="src/journal-store.mjs"&&rel!=="app/appearance.mjs")assert.doesNotMatch(src,/\b(?:localStorage|sessionStorage|indexedDB|fetch|XMLHttpRequest|WebSocket)\s*[.(]/,"unexpected data/network dependency "+rel);for(const m of src.matchAll(/(?:^|\n)\s*import\s+[^;\n]+?\s+from\s+["']([^"']+)["']/g)){assert.ok(m[1].startsWith(".")&&extname(m[1])===".mjs","external or non-module import");await walk(resolve(dirname(file),m[1]));}}
await walk(entry);const html=await readFile(resolve(root,"app/index.html"),"utf8");
assert.match(html,/connect-src 'none'/);assert.match(html,/script type="module" src="\.\/app\.mjs"/);
for(const m of html.matchAll(/(?:href|src)="([^"]+)"/g)){const p=resolve(root,"app",m[1]);assert.ok(!relative(root,p).startsWith(".."));assert.ok((await stat(p)).isFile());}
console.log("Clean graph verified: "+seen.size+" JS modules, local assets only. This is a static check, not a security audit.");
