import {readFile,writeFile,mkdir,copyFile,readdir,stat} from "node:fs/promises";
import {resolve,dirname,relative,extname} from "node:path";
import {fileURLToPath} from "node:url";
import {createHash} from "node:crypto";
import assert from "node:assert/strict";
const source=fileURLToPath(new URL("../",import.meta.url)),out=resolve(process.argv[2]??"dist/masarifi62-pre-rc");
assert.ok(relative(source,out).startsWith(".."),"output must be outside core62 source");
await mkdir(out,{recursive:true});assert.deepEqual(await readdir(out),[],"output directory must be empty");
const picked=new Set(),forbidden=new Set(["legacy-bridge.mjs","migration.mjs","projection-parity.mjs","data-shadow.mjs","persistent-shadow.mjs","operations-model.mjs"]);
function inside(path){const rel=relative(source,path);assert.ok(rel&&!rel.startsWith("..")&&!forbidden.has(rel.split("/").at(-1)),"outside clean distribution: "+rel);assert.ok(rel.startsWith("app/")||rel.startsWith("src/"),"unapproved directory: "+rel);return rel;}
async function add(file){const rel=inside(file);if(picked.has(rel))return;picked.add(rel);const content=await readFile(file,"utf8");if(extname(file)===".mjs"){for(const m of content.matchAll(/(?:^|\n)\s*import\s+[^;\n]+?\s+from\s+["']([^"']+)["']/g)){assert.ok(m[1].startsWith(".")&&m[1].endsWith(".mjs"),"external import");await add(resolve(dirname(file),m[1]));}}else if(extname(file)===".html"){for(const m of content.matchAll(/(?:href|src)="([^"]+)"/g))await add(resolve(dirname(file),m[1]));}else assert.equal(extname(file),".css");}
await add(resolve(source,"app/index.html"));
const assets=[];for(const rel of [...picked].sort()){const dest=resolve(out,rel);await mkdir(dirname(dest),{recursive:true});await copyFile(resolve(source,rel),dest);const buf=await readFile(dest);assets.push({path:rel,bytes:buf.length,sha256:createHash("sha256").update(buf).digest("hex")});}
const manifest={version:"62.7.0-rc1.10-dev",entry:"app/index.html",releaseAuthorized:false,legacyMigrationComplete:false,assets};
await writeFile(resolve(out,"build-manifest.json"),JSON.stringify(manifest,null,2)+"\n");
await writeFile(resolve(out,"README.txt"),"Masarifi 62.7.0 RC1.10 development snapshot\nServe app/index.html on an isolated HTTPS origin or localhost. Preview only; synthetic data. Reference sync runtime only; no hosted production or full legacy migration. No production release authorized.\n");
console.log("Clean distribution: "+assets.length+" files, "+assets.reduce((n,x)=>n+x.bytes,0)+" bytes; no legacy runtime, tests, demo or docs.");
