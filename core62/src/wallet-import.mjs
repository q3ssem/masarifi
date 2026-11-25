import {isDate,minorFromDecimal,safeMinor} from "./money.mjs";
// Exact migration for the supported subset: ordinary linked movements, no pre-anchor links,
// no unknown history, no transfer crossing an anchor, no historical reconciliation guessing.
const idOK=x=>typeof x==="string"&&/^[A-Za-z0-9:_-]{1,100}$/.test(x);
const money=v=>{if(typeof v!=="number"||!Number.isFinite(v))throw Error("wallet-amount");return minorFromDecimal(String(v));};
const need=(v,c)=>{if(!v)throw Error(c);};
const keys=(x,allowed)=>x&&typeof x==="object"&&!Array.isArray(x)&&Object.keys(x).every(k=>allowed.includes(k));
export function planWalletMigration(w,records,{asOf}={}){
 try{need(isDate(asOf)&&keys(w,["accounts","transfers","links","history"])&&["accounts","transfers","links","history"].every(k=>Array.isArray(w[k])),"wallet-contract");
 need(w.accounts.length<=30&&w.transfers.length<=500&&w.links.length<=1000&&w.history.length===0,"wallet-history-needs-mapping");
 const accounts=new Map(),sourceRows=new Map(),commands=[],links=new Map(),expected=new Map(),ids=new Set(records.map(r=>r.id));
 for(const r of records){const sign=r.direction==="in"?1:-1;const key=[r.id,r.date,sign*r.amountMinor/100,r.timestamp??0,r.direction==="in"?"income":"expense"].join("|");need(!sourceRows.has(key),"wallet-ambiguous-row");sourceRows.set(key,r);}
 for(const a of w.accounts){need(keys(a,["id","name","type","start","opening","anchor","balance","archived"])&&idOK(a.id)&&!accounts.has(a.id)&&typeof a.name==="string"&&a.name.trim()&&a.name.length<=60&&["bank","cash","digital"].includes(a.type)&&isDate(a.start)&&isDate(a.anchor)&&a.start<=a.anchor&&a.anchor<=asOf&&typeof a.archived==="boolean","wallet-account");
 const opening=money(a.opening),balance=money(a.balance);need(a.start!==a.anchor||opening===balance,"same-day-reconciliation-needs-review");accounts.set(a.id,a);expected.set(a.id,BigInt(balance));commands.push({type:"domain",fields:{type:"account",id:a.id,name:a.name,openingMinor:opening,openingDate:a.start,accountType:a.type}});if(a.anchor!==a.start)commands.push({type:"domain",fields:{type:"reconcile",id:a.id,date:a.anchor,balanceMinor:balance}});}
 for(const l of w.links){need(keys(l,["key","account","date"])&&typeof l.key==="string"&&!links.has(l.key)&&accounts.has(l.account)&&isDate(l.date),"wallet-link");const r=sourceRows.get(l.key),a=accounts.get(l.account);need(r&&r.date===l.date&&r.date>=a.anchor&&r.date<=asOf,"wallet-link-unmapped-or-pre-anchor");links.set(l.key,l.account);expected.set(a.id,expected.get(a.id)+BigInt(r.direction==="in"?r.amountMinor:-r.amountMinor));}
 const recordCommands=records.map(r=>{const key=[r.id,r.date,(r.direction==="in"?1:-1)*r.amountMinor/100,r.timestamp??0,r.direction==="in"?"income":"expense"].join("|");const {timestamp,...fields}=r;return {type:"domain",fields:{...fields,accountId:links.get(key)??null,...(timestamp!==undefined?{sourceTimestamp:timestamp}:{})}};});
 const transfers=[];
 for(const t of w.transfers){need(keys(t,["id","from","to","date","amount","note","void"])&&idOK(t.id)&&!ids.has(t.id)&&accounts.has(t.from)&&accounts.has(t.to)&&t.from!==t.to&&isDate(t.date)&&t.date>=accounts.get(t.from).anchor&&t.date>=accounts.get(t.to).anchor&&t.date<=asOf&&typeof t.note==="string"&&t.note.length<=80&&typeof t.void==="boolean","wallet-transfer");const a=money(t.amount);need(a>0,"wallet-transfer-amount");ids.add(t.id);transfers.push({type:"domain",fields:{type:"transfer",id:t.id,from:t.from,to:t.to,date:t.date,amountMinor:a,note:t.note}});if(t.void)transfers.push({type:"domain",fields:{type:"void",id:t.id}});else{expected.set(t.from,expected.get(t.from)-BigInt(a));expected.set(t.to,expected.get(t.to)+BigInt(a));}}
 const archives=w.accounts.filter(a=>a.archived).map(a=>({type:"domain",fields:{type:"archive",id:a.id}}));
 return {status:"WALLET_PREVIEW",commands:[...commands,...recordCommands,...transfers,...archives],balances:[...expected].map(([id,b])=>({id,balanceMinor:safeMinor(b)}))};
 }catch(e){return {status:"BLOCKED",code:String(e.message),commands:[]};}
}
