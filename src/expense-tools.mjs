import {minorFromDecimal,safeMinor} from "./money.mjs";
// Equal shares are reference allocations of an existing confirmed expense, not new ledger rows.
export function equalShares(amountMinor,names){
 if(!Number.isSafeInteger(amountMinor)||amountMinor<=0||!Array.isArray(names)||names.length<2||names.length>30||names.length>amountMinor||names.some(n=>typeof n!=="string"||n!==n.trim()||!n||n.length>60)||new Set(names).size!==names.length)throw Error("split-contract");
 const total=BigInt(amountMinor),count=BigInt(names.length),base=total/count,remainder=total%count;
 return names.map((name,i)=>({name,amountMinor:safeMinor(base+(BigInt(i)<remainder?1n:0n))}));
}
// Intentionally conservative: a single explicitly SAR-denominated amount only.
// The user supplies date, direction, category and note independently. Raw SMS is not journaled.
export function previewSmsAmount(text){
 if(typeof text!=="string"||!text.trim()||text.length>2000)throw Error("sms-size");
 const s=text.replace(/[٠-٩]/g,c=>String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/[۰-۹]/g,c=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/٫/g,".").replace(/٬/g,",");
 if(/(?:USD|EUR|AED|KWD|BHD|QAR|GBP|دولار|يورو)/i.test(s))throw Error("sms-currency");
 const currency=/(?:SAR|ر\.?\s?س\.?|ريال سعودي)/gi;
 if([...s.matchAll(currency)].length!==1)throw Error("sms-ambiguous");
 const pattern=/(?:SAR|ر\.?\s?س\.?|ريال سعودي)\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)(?![\d.,])|(?<![\d.,])(\d+(?:,\d{3})*(?:\.\d{1,2})?)\s*(?:SAR|ر\.?\s?س\.?|ريال سعودي)/gi;
 const hits=[...s.matchAll(pattern)];
 if(hits.length!==1)throw Error("sms-ambiguous");
 const hit=hits[0];const prefix=s.slice(0,hit.index).trimEnd();if(["-","+","−"].includes(prefix.at(-1)))throw Error("sms-signed");const raw=hit[1]??hit[2];if(!/^(?:0|[1-9]\d*|[1-9]\d{0,2}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(raw))throw Error("sms-amount");
 const amountMinor=minorFromDecimal(raw.replace(/,/g,""));if(amountMinor<=0)throw Error("sms-amount");
 return {status:"REVIEW_REQUIRED",amountMinor};
}
