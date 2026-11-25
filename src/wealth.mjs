import {isDate,safeMinor} from "./money.mjs";
import {accountBalances,obligationStatus} from "./domain.mjs";
const keyOK=x=>typeof x==="string"&&/^[A-Za-z0-9:_-]{1,100}$/.test(x);
const nonnegative=x=>Number.isSafeInteger(x)&&x>=0;
const labelOK=x=>typeof x==="string"&&x.trim().length>0&&x.length<=160;
const need=(x,msg)=>{if(!x)throw Error(msg);};
export function portfolioReport(holdings,events,{asOf}={}){
  need(Array.isArray(holdings)&&Array.isArray(events)&&isDate(asOf)&&holdings.length<=10000&&events.length<=100000,"portfolio-contract");
  const map=new Map(),ids=new Set();for(const h of holdings){need(h&&keyOK(h.id)&&!map.has(h.id)&&labelOK(h.name)&&labelOK(h.category),"holding-contract");map.set(h.id,{id:h.id,name:h.name,category:h.category,metadata:h.metadata??null,basis:0n,realized:0n,dividends:0n,valuation:null,valuationDate:null,lastDate:null});}
  for(const e of events){need(e&&keyOK(e.id)&&!ids.has(e.id)&&map.has(e.holdingId)&&isDate(e.date)&&["buy","sell","dividend","value"].includes(e.type)&&nonnegative(e.amountMinor),"investment-event");ids.add(e.id);const h=map.get(e.holdingId);
    need(h.lastDate===null||e.date>=h.lastDate,"event-order");h.lastDate=e.date;
    if(e.type==="sell")need(nonnegative(e.basisRemovedMinor),"sale-basis");else need(e.basisRemovedMinor===undefined,"unexpected-basis");
    if(e.type!=="value")need(e.amountMinor>0,"zero-event");
    if(e.date>asOf)continue;const a=BigInt(e.amountMinor);
    if(e.type==="buy"){h.basis+=a;h.valuation=null;h.valuationDate=null;}
    if(e.type==="sell"){const b=BigInt(e.basisRemovedMinor);need(b<=h.basis,"basis-underflow");h.basis-=b;h.realized+=a-b;h.valuation=null;h.valuationDate=null;}
    if(e.type==="dividend")h.dividends+=a;
    if(e.type==="value"){h.valuation=a;h.valuationDate=e.date;}
  }
  try{let basis=0n,market=0n,realized=0n,dividends=0n;const missing=[],items=[];for(const h of map.values()){basis+=h.basis;realized+=h.realized;dividends+=h.dividends;if(h.valuation===null)missing.push(h.id);else market+=h.valuation;
    items.push({id:h.id,name:h.name,category:h.category,...(h.metadata?{metadata:h.metadata}:{}),basisMinor:safeMinor(h.basis),marketMinor:h.valuation===null?null:safeMinor(h.valuation),valuationDate:h.valuationDate,realizedMinor:safeMinor(h.realized),dividendsMinor:safeMinor(h.dividends),unrealizedMinor:h.valuation===null?null:safeMinor(h.valuation-h.basis)});}
    return {status:missing.length?"INCOMPLETE_VALUATION":"ANALYSIS_ONLY",asOf,items,missing,basisMinor:safeMinor(basis),marketMinor:missing.length?null:safeMinor(market),realizedMinor:safeMinor(realized),dividendsMinor:safeMinor(dividends),unrealizedMinor:missing.length?null:safeMinor(market-basis),totalProfitMinor:missing.length?null:safeMinor(market-basis+realized+dividends),cashLinked:false};
  }catch{return {status:"BLOCKED",code:"portfolio-overflow"};}
}
export function wealthSnapshot(state,portfolio,assets,{asOf}={}){
  need(isDate(asOf)&&Array.isArray(assets)&&assets.length<=10000&&portfolio?.asOf===asOf,"wealth-contract");
  if(state.accounts.some(a=>a.openingDate>asOf)||state.movements.some(m=>!m.voided&&m.date>asOf))return {status:"BLOCKED",code:"future-domain-record"};
  if(portfolio.status!=="ANALYSIS_ONLY"||!nonnegative(portfolio.marketMinor))return {status:"BLOCKED",code:"incomplete-portfolio"};
  const seen=new Set([...state.accounts.map(x=>x.id),...portfolio.items.map(x=>x.id)]);let other=0n,cash=0n,overdraft=0n,debt=0n,receivable=0n;
  for(const a of assets){need(a&&keyOK(a.id)&&!seen.has(a.id)&&labelOK(a.name)&&nonnegative(a.valueMinor)&&isDate(a.valuedOn)&&a.valuedOn<=asOf,"asset-contract");seen.add(a.id);other+=BigInt(a.valueMinor);}
  for(const a of accountBalances(state)){const b=BigInt(a.balanceMinor);if(b>=0n)cash+=b;else overdraft-=b;}
  for(const o of obligationStatus(state)){if(!["debt","installment","bnpl"].includes(o.family))continue;
    if(o.direction==="out")debt+=BigInt(o.remainingMinor);else if(o.family==="debt"&&!o.id.startsWith("sch:"))receivable+=BigInt(o.remainingMinor);}
  try{const totalAssets=cash+other+BigInt(portfolio.marketMinor)+receivable,liabilities=overdraft+debt;
    return {status:"ANALYSIS_ONLY",asOf,cashMinor:safeMinor(cash),overdraftMinor:safeMinor(overdraft),propertyMinor:safeMinor(other),investmentMinor:portfolio.marketMinor,receivableMinor:safeMinor(receivable),debtMinor:safeMinor(debt),assetsMinor:safeMinor(totalAssets),liabilitiesMinor:safeMinor(liabilities),netMinor:safeMinor(totalAssets-liabilities),coverage:"explicit-inputs-only",investmentCashLinked:false};
  }catch{return {status:"BLOCKED",code:"wealth-overflow"};}
}
