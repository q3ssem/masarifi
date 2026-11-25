import assert from "node:assert/strict";
import {readFile,readdir,lstat} from "node:fs/promises";
import {resolve,join} from "node:path";
import {createHash} from "node:crypto";
import {pathToFileURL} from "node:url";
const hash=b=>createHash("sha256").update(b).digest("hex");
const shaOK=s=>typeof s==="string"&&/^[a-f0-9]{64}$/.test(s);
const forbidden=new Set(["legacy-bridge.mjs","migration.mjs","projection-parity.mjs","data-shadow.mjs","persistent-shadow.mjs","operations-model.mjs","journal-sync.mjs"]);
async function inventory(root,relative=""){const items=[];for(const name of await readdir(join(root,relative))){const path=relative?relative+"/"+name:name,info=await lstat(join(root,path));assert.ok(!info.isSymbolicLink(),"symlink: "+path);if(info.isDirectory()){assert.ok(path==="app"||path==="src","unexpected directory: "+path);items.push(...await inventory(root,path));}else{assert.ok(info.isFile(),"not regular file: "+path);items.push(path);}}return items.sort();}
export async function verifyLocalRelease(directory){
 const root=resolve(directory),actual=await inventory(root),manifest=JSON.parse(await readFile(join(root,"build-manifest.json"),"utf8"));
 assert.match(manifest.version,/^62\.7\.0-rc[23]\.\d+-local-dev$/);
 assert.equal(manifest.entry,"app/index.html");assert.equal(manifest.releaseAuthorized,false);assert.equal(manifest.legacyMigrationComplete,false);assert.equal(manifest.cloudSync,false);assert.equal(manifest.storage,"local-encrypted");
 assert.ok(Array.isArray(manifest.assets)&&manifest.assets.length>0&&manifest.assets.length<=100,"asset count");
 const assets=new Map();for(const a of manifest.assets){assert.ok(a&&typeof a.path==="string"&&(/^(app|src)\/[A-Za-z0-9_-]+\.(html|css|mjs|png|webmanifest)$/.test(a.path)||/^app\/(?:Tajawal-(?:Regular|Bold)\.ttf|Cairo-Variable\.ttf|IBMPlexSansArabic-(?:Regular|Bold)\.ttf|(?:Tajawal|Cairo|IBMPlexSansArabic)-OFL\.txt)$/.test(a.path))&&!forbidden.has(a.path.split("/").at(-1)),"invalid asset path");assert.ok(!assets.has(a.path),"duplicate asset");assert.ok(Number.isSafeInteger(a.bytes)&&a.bytes>0&&shaOK(a.sha256),"invalid asset metadata");const content=await readFile(join(root,a.path));assert.equal(content.length,a.bytes,"size mismatch: "+a.path);assert.equal(hash(content),a.sha256,"hash mismatch: "+a.path);assets.set(a.path,a);}
 assert.deepEqual(actual,[...assets.keys(),"README.txt","build-manifest.json"].sort(),"unlisted/missing package files");
 for(const p of ["app/index.html","app/app.mjs","app/app.webmanifest","app/offline.mjs","app/offline-worker.mjs","app/icon-180.png","app/icon-192.png","app/icon-512.png","src/journal.mjs","src/journal-store.mjs","src/secure-backup.mjs"])assert.ok(assets.has(p),"required asset: "+p);
 const html=await readFile(join(root,manifest.entry),"utf8");assert.match(html,/connect-src 'none'/);if(html.includes("font-src")){assert.match(html,/font-src 'self'/);for(const p of ["Tajawal-Regular.ttf","Tajawal-Bold.ttf","Cairo-Variable.ttf","IBMPlexSansArabic-Regular.ttf","IBMPlexSansArabic-Bold.ttf","Tajawal-OFL.txt","Cairo-OFL.txt","IBMPlexSansArabic-OFL.txt"])assert.ok(assets.has("app/"+p),"missing local typography asset "+p);}assert.doesNotMatch(html,/id="(?:syncPanel|syncToken)"/);
 const pwa=JSON.parse(await readFile(join(root,"app/app.webmanifest"),"utf8"));assert.equal(pwa.start_url,"./index.html");assert.equal(pwa.scope,"./");assert.equal(pwa.display,"standalone");
 const worker=await readFile(join(root,"app/offline-worker.mjs"),"utf8"),match=worker.match(/const ENTRIES=(\[[^\n]+\]);/);assert.ok(match,"missing shell inventory");
 const expected=[...assets.values()].filter(a=>a.path!=="app/offline-worker.mjs").sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0).map(a=>({path:"../"+a.path,hash:a.sha256}));assert.deepEqual(JSON.parse(match[1]),expected,"worker shell inventory mismatch");
 return {version:manifest.version,assets:assets.size,bytes:[...assets.values()].reduce((n,a)=>n+a.bytes,0),manifestSha256:hash(await readFile(join(root,"build-manifest.json"))),releaseAuthorized:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){assert.ok(process.argv[2],"usage: verify-local-release.mjs DIRECTORY");console.log(JSON.stringify(await verifyLocalRelease(process.argv[2])));}
