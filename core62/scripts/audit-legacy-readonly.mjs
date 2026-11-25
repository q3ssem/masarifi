import {readFile} from "node:fs/promises";
import {previewLegacy,importIntoEmpty} from "../src/legacy-import.mjs";
import {reconcileMonthly,reconcileRowIdentity} from "../src/monthly-reconciliation.mjs";
import {isDate} from "../src/money.mjs";
const [backup,sourceRows,asOf,through,mode]=process.argv.slice(2);
if(![6,7].includes(process.argv.length)||mode!==undefined&&mode!=="--strict-identity"||!isDate(asOf)||!isDate(through)||asOf>through)throw Error("Usage: node core62/scripts/audit-legacy-readonly.mjs backup.json independent-legacy-rows.json YYYY-MM-DD YYYY-MM-DD [--strict-identity]");
const read=async path=>{const b=await readFile(path);if(b.length>16*1024*1024)throw Error("input-size");return b.toString("utf8");};
try{
 const preview=previewLegacy(await read(backup),{asOf});
 if(preview.status!=="IMPORT_PREVIEW"){console.log(JSON.stringify({status:"BLOCKED",counts:preview.counts,issues:preview.issues.map(x=>({path:x.path,code:x.code})),productionWriteAllowed:false},null,2));process.exitCode=1;}
 else{
  const session=importIntoEmpty(preview),view=session.view({month:asOf.slice(0,7),asOf,through});
  if(view.projection.status!=="PREVIEW_ONLY")throw Error("projection-blocked");
  const independent=JSON.parse(await read(sourceRows));const result=reconcileMonthly(independent,view.projection.rows),identity=reconcileRowIdentity(independent,view.projection.rows);const strict=mode==="--strict-identity";const accepted=result.status==="MONTHLY_TOTALS_MATCH"&&(!strict||identity.identityVerified);
  // Only aggregate evidence; no raw transactions, notes, keys, or journal output.
  console.log(JSON.stringify({status:accepted?result.status:"BLOCKED",counts:preview.counts,months:result.months,walletChecked:!!preview.walletBalances,investmentChecked:!!preview.investmentParity,identityVerified:strict&&identity.identityVerified,rowIdentity:identity,productionWriteAllowed:false},null,2));
  if(!accepted)process.exitCode=1;
 }
}catch{console.error("Audit blocked: invalid input, unsupported data, or inconsistent projection. Source not modified.");process.exitCode=1;}
