import {isDate} from "./money.mjs";
// Arabic/Latin search: no execution or dynamic HTML.
export function normalizeSearch(x){return String(x??"").normalize("NFKC").toLowerCase().replace(/[\u064b-\u065f\u0670\u0640]/g,"").replace(/[أإآٱ]/g,"ا").replace(/ى/g,"ي").replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).trim();}
export function searchMovements(rows,query,{from=null,to=null,status="all",limit=100}={}){
 if(!Array.isArray(rows)||rows.length>500000||typeof query!=="string"||query.length>160||!Number.isInteger(limit)||limit<1||limit>200||!["all","confirmed","planned","assumed","voided"].includes(status)||(from!==null&&!isDate(from))||(to!==null&&!isDate(to))||(from&&to&&from>to))throw Error("search-contract");
 const tokens=normalizeSearch(query).split(/\s+/).filter(Boolean),out=[];let total=0;for(const r of rows){if(!r||typeof r.id!=="string"||!isDate(r.date)||!Number.isSafeInteger(r.amountMinor))continue;if((from&&r.date<from)||(to&&r.date>to)||(status!=="all"&&r.status!==status))continue;
 const amount=BigInt(r.amountMinor),abs=amount<0n?-amount:amount,decimal=(amount<0n?"-":"")+String(abs/100n)+"."+String(abs%100n).padStart(2,"0");
 const hay=normalizeSearch([r.id,r.date,r.kind,r.status,r.category,r.note,r.name,r.metadata?.incomeSource,r.metadata?.tag,r.metadata?.currency,r.metadata?.purchaseProvider,decimal].join(" "));if(tokens.every(t=>hay.includes(t))){total++;if(out.length<limit)out.push({...r});}}
 return {status:"READ_ONLY",total,results:out,truncated:total>limit};
}
