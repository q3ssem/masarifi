import {readFile} from "node:fs/promises";
import {previewLegacy,importIntoEmpty} from "../src/legacy-import.mjs";
import {reconcileMonthly} from "../src/monthly-reconciliation.mjs";
import {isDate} from "../src/money.mjs";
const [backup,sourceRows,asOf,through]=process.argv.slice(2);
if(process.argv.length!==6||!isDate(asOf)||!isDate(through)||asOf>through)throw Error("Usage: node core62/scripts/audit-legacy-readonly.mjs backup.json independent-legacy-rows.json YYYY-MM-DD YYYY-MM-DD");
const read=async path=>{const b=await readFile(path);if(b.length>16*1024*1024)throw Error("input-size");return b.toString("utf8");};
try{
 const preview=previewLegacy(await read(backup),{asOf});
 if(preview.status!=="IMPORT_PREVIEW"){console.log(JSON.stringify({status:"BLOCKED",counts:preview.counts,issues:preview.issues.map(x=>({path:x.path,code:x.code})),productionWriteAllowed:false},null,2));process.exitCode=1;}
 else{
  const session=importIntoEmpty(preview),view=session.view({month:asOf.slice(0,7),asOf,through});
  if(view.projection.status!=="PREVIEW_ONLY")throw Error("projection-blocked");
  const result=reconcileMonthly(JSON.parse(await read(sourceRows)),view.projection.rows);
  // Only aggregate evidence; no raw transactions, notes, keys, or journal output.
  console.log(JSON.stringify({status:result.status,counts:preview.counts,months:result.months,walletChecked:!!preview.walletBalances,investmentChecked:!!preview.investmentParity,identityVerified:false,productionWriteAllowed:false},null,2));
  if(result.status!=="MONTHLY_TOTALS_MATCH")process.exitCode=1;
 }
}catch{console.error("Audit blocked: invalid input, unsupported data, or inconsistent projection. Source not modified.");process.exitCode=1;}
