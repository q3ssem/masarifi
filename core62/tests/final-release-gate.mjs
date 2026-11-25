import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {readFile,writeFile} from "node:fs/promises";
import {resolve,join} from "node:path";
import {createHash} from "node:crypto";
const base="7ab060eb7b224d0acf5db558b1d71a745a178fd7";
const root=resolve(process.argv[2]??"dist/masarifi62-pre-rc");
const allowed=new Set(["core62/app/app.css","core62/app/index.html","core62/scripts/build-clean-release.mjs","core62/tests/historical-upgrade.mjs","core62/docs/RC3_LOCAL_ACCEPTANCE.md",".github/workflows/core62-check.yml","core62/tests/visual-acceptance.mjs","core62/tests/final-release-gate.mjs","core62/app/app.mjs","core62/tests/browser-release.mjs","core62/tests/identity-comparison.mjs","core62/src/secure-backup.mjs","core62/src/search.mjs","core62/tests/secure-backup.test.mjs","core62/tests/audit-02.test.mjs","core62/tests/audit-03-stress.mjs","core62/tests/audit-03.test.mjs","core62/tests/audit-03-browser.mjs"]);
const changed=execFileSync("git",["diff","--name-only","--no-renames",base,"HEAD"],{encoding:"utf8"}).trim().split("\n").filter(Boolean);
assert.ok(changed.length>0);for(const path of changed)assert.ok(allowed.has(path),"Unexpected file changed: "+path);
// Explicitly allow only these two display-label changes to the application controller.
const originalController=execFileSync("git",["show",base+":core62/app/app.mjs"],{encoding:"utf8"});
const expectedController=originalController.replace('"المتبقي قبل الالتزامات","hero-label"','"المتبقي المؤكد للشهر","hero-label"').replace('["التزامات مخططة",q?.plannedOut]','["مصروفات مخططة",q?.plannedOut]');
assert.notEqual(expectedController,originalController,"expected display label patch missing from baseline");
assert.equal(await readFile(resolve("core62/app/app.mjs"),"utf8"),expectedController,"unexpected controller changes");
const manifest=JSON.parse(await readFile(join(root,"build-manifest.json"),"utf8"));
assert.equal(manifest.version,"62.7.0-rc3.21-local-dev");
assert.equal(manifest.releaseAuthorized,false);assert.equal(manifest.legacyMigrationComplete,false);assert.equal(manifest.cloudSync,false);assert.equal(manifest.storage,"local-encrypted");
assert.equal(manifest.entry,"app/index.html");
assert.ok(manifest.assets.length>0);assert.equal(new Set(manifest.assets.map(a=>a.path)).size,manifest.assets.length);
for(const a of manifest.assets){assert.ok(/^(app|src)\//.test(a.path)&&!a.path.split("/").includes(".."));const bytes=await readFile(join(root,a.path));assert.equal(bytes.length,a.bytes,a.path);assert.equal(createHash("sha256").update(bytes).digest("hex"),a.sha256,a.path);}
const html=await readFile(join(root,manifest.entry),"utf8");assert.match(html,/<title>[^<]*RC3\.21<\/title>/);assert.match(html,/dir="rtl"/);assert.match(html,/connect-src 'none'/);
const evidence={candidate:manifest.version,baseline:base,changed,assetsVerified:manifest.assets.length,financialSourceChanged:false,nonFinancialRuntimeChanges:["core62/src/secure-backup.mjs","core62/src/search.mjs"],releaseAuthorized:false,browserEvidence:"SEPARATE_CI_JOBS_REQUIRED",deviceEvidence:"PENDING",ownerApproval:"PENDING"};
await writeFile(join(root,"../final-release-evidence.json"),JSON.stringify(evidence,null,2)+"\n");console.log(JSON.stringify(evidence,null,2));
