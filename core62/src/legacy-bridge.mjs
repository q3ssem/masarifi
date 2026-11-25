import {BUCKETS} from "./ledger.mjs";
import {legacyRows} from "./migration.mjs";
import {gate} from "./projection-parity.mjs";
// The legacy result is authoritative unless both financial and row parity pass.
export const BRIDGE_VERSION="62.6.1-alpha.1";
export function chooseLedgerAnalysis(original,legacy){
  const fallback=reason=>({...legacy,bridgeStatus:"LEGACY_FALLBACK",bridgeReason:reason});
  if(!legacy||legacy.complete!==true)return fallback("legacy-incomplete");
  try{
    const converted=legacyRows(original),report=gate(original,converted,legacy);
    if(report.status!=="PROJECTION_PARITY_OK")return fallback("parity-blocked");
    const a=report.totals.actual;
    // Preserve the legacy result contract and provide fresh objects; no mutation.
    const cents={...a.cents},totals=Object.fromEntries(BUCKETS.map(k=>[k,cents[k]/100]));
    return {...legacy,cents,totals,counts:{...a.counts},issues:[],valid:a.valid,count:a.count,complete:true,bridgeStatus:"CORE62_PARITY_OK",bridgeReason:null};
  }catch{return fallback("core-exception");}
}
