export function validRecordMetadata(m,direction){if(!m||typeof m!=="object"||Array.isArray(m))return false;const ks=Object.keys(m);if(!ks.length||ks.some(k=>!["incomeSource","tag","currency","originalMinor","purchaseProvider","mood","needClass"].includes(k)))return false;
 const text=(x,max)=>typeof x==="string"&&x.trim().length>0&&x.length<=max;
 if(Object.hasOwn(m,"incomeSource")&&(direction!=="in"||!text(m.incomeSource,20)))return false;
 if(direction==="in"&&ks.some(k=>k!=="incomeSource"))return false;
 if(Object.hasOwn(m,"tag")&&!text(m.tag,20))return false;
 if(Object.hasOwn(m,"currency")!==Object.hasOwn(m,"originalMinor"))return false;
 if(Object.hasOwn(m,"currency")&&(!/^[A-Z]{3}$/.test(m.currency)||m.currency==="SAR"||!Number.isSafeInteger(m.originalMinor)||m.originalMinor<=0))return false;
 if(Object.hasOwn(m,"purchaseProvider")&&!["tabby","tamara"].includes(m.purchaseProvider))return false;
 if(Object.hasOwn(m,"mood")&&!["happy","calm","bored","stress","rush","occ"].includes(m.mood))return false;
 if(Object.hasOwn(m,"needClass")&&!["y","m","n","s"].includes(m.needClass))return false;
 return true;
}
export function validHistoricalWalletEvent(h){return !!h&&typeof h==="object"&&!Array.isArray(h)&&Object.keys(h).length===8&&["id","date","kind","detail","ref","beforeMinor","afterMinor","origin"].every(k=>Object.hasOwn(h,k))&&typeof h.id==="string"&&/^[A-Za-z0-9:_-]{1,100}$/.test(h.id)&&typeof h.date==="string"&&["create","rename","transfer","void","reinstate","link","unlink","reconcile","archive","unarchive"].includes(h.kind)&&typeof h.detail==="string"&&h.detail.length<=160&&typeof h.ref==="string"&&h.ref.length<=220&&[h.beforeMinor,h.afterMinor].every(x=>x===null||Number.isSafeInteger(x))&&h.origin==="imported-history";}
