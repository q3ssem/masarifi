import {readFile} from "node:fs/promises";
import {reconcileMonthly} from "../src/monthly-reconciliation.mjs";
const [source,target]=process.argv.slice(2);
if(!source||!target||process.argv.length!==4)throw Error("Usage: node core62/scripts/reconcile-monthly.mjs source-rows.json target-rows.json");
const read=async path=>{const text=await readFile(path,"utf8");if(Buffer.byteLength(text)>16*1024*1024)throw Error("reconciliation-input-too-large");return JSON.parse(text);};
const report=reconcileMonthly(await read(source),await read(target));
console.log(JSON.stringify(report,null,2));if(report.status!=="MONTHLY_TOTALS_MATCH")process.exitCode=1;
