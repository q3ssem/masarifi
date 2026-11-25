import {isDate,minorFromDecimal} from "./money.mjs";
import {execute,emptyDomain,accountBalances,obligationStatus,domainLedger} from "./domain.mjs";
import {expandSchedules,materializeOccurrence,scheduledLedger} from "./schedule.mjs";
import {budgetOverview,goalProgress} from "./planning.mjs";
import {portfolioReport,wealthSnapshot} from "./wealth.mjs";
import {searchMovements} from "./search.mjs";
import {forecast} from "./projections.mjs";
const clone=x=>JSON.parse(JSON.stringify(x));
const validKey=x=>typeof x==="string"&&/^[A-Za-z0-9_-]{1,64}$/.test(x);
const positive=x=>Number.isSafeInteger(x)&&x>0;
const error=code=>({status:"BLOCKED",code,productionWriteAllowed:false});
const monthEnd=m=>{if(!isDate(m+"-01"))throw Error("month");for(let d=31;d>=28;d--){const v=m+"-"+d;if(isDate(v))return v;}};
export function createWorkspace(){
 let state={revision:0,domain:emptyDomain(),rules:[],limits:[],goals:[],contributions:[],holdings:[],events:[],assets:[]},serial=0;
 const snapshot=()=>clone(state);
 const nextId=prefix=>prefix+"_"+(++serial);
 function apply(type,fields,expected=state.revision){
  if(expected!==state.revision)return {status:"CONFLICT",revision:state.revision,productionWriteAllowed:false};
  try{const n=clone(state),f=clone(fields);let outcome;
   if(type==="domain"){if(f.type==="account"&&(n.assets.some(a=>a.id===f.id)||n.holdings.some(h=>h.id===f.id)))return error("duplicate-asset-identity");outcome=execute(n.domain,{...f,opId:nextId("op"),expectedRevision:n.domain.revision});if(outcome.status!=="APPLIED_SHADOW")return error(outcome.code??outcome.status);n.domain=outcome.state;}
   else if(type==="rule"){if(!validKey(f.id)||n.rules.some(r=>r.id===f.id))return error("duplicate-rule");expandSchedules([f],{from:f.start,to:f.start});n.rules.push(f);}
   else if(type==="materialize"){const r=n.rules.find(r=>r.id===f.scheduleId);if(!r||!isDate(f.due))return error("schedule-missing");const o=expandSchedules([r],{from:f.due,to:f.due}).find(x=>x.due===f.due);if(!o)return error("occurrence-missing");outcome=materializeOccurrence(n.domain,o,nextId("op"));if(outcome.status==="ALREADY_MATERIALIZED")return {status:outcome.status,revision:state.revision,productionWriteAllowed:false};if(outcome.status!=="APPLIED_SHADOW")return error(outcome.code??outcome.status);n.domain=outcome.state;}
   else if(type==="budget"){if(!isDate(f.month+"-01")||typeof f.category!=="string"||!f.category.trim()||!Number.isSafeInteger(f.limitMinor)||f.limitMinor<0)return error("budget-contract");n.limits=n.limits.filter(x=>x.month!==f.month||x.category!==f.category);n.limits.push(f);}
   else if(type==="goal"){if(!validKey(f.id)||n.goals.some(g=>g.id===f.id)||!positive(f.targetMinor)||!isDate(f.due)||typeof f.name!=="string"||!f.name.trim())return error("goal-contract");n.goals.push(f);}
   else if(type==="contribution"){const g=n.goals.find(g=>g.id===f.goalId);if(!g||!validKey(f.id)||n.contributions.some(x=>x.id===f.id)||!isDate(f.date)||!Number.isSafeInteger(f.amountMinor)||f.amountMinor===0)return error("contribution-contract");n.contributions.push(f);const cs=n.contributions.filter(x=>x.goalId===g.id);for(const d of [...new Set(cs.map(x=>x.date))])if(goalProgress(g,cs,{asOf:d}).status==="BLOCKED")return error("goal-balance");}
   else if(type==="holding"){if(!validKey(f.id)||n.holdings.some(x=>x.id===f.id)||n.assets.some(a=>a.id===f.id)||n.domain.accounts.some(a=>a.id===f.id))return error("holding-id");n.holdings.push(f);portfolioReport(n.holdings,n.events,{asOf:"9999-12-31"});}
   else if(type==="investment"){n.events.push(f);const p=portfolioReport(n.holdings,n.events,{asOf:"9999-12-31"});if(p.status==="BLOCKED")return error(p.code);}
   else if(type==="asset"){if(!validKey(f.id)||n.assets.some(x=>x.id===f.id)||!isDate(f.valuedOn)||!Number.isSafeInteger(f.valueMinor)||f.valueMinor<0||typeof f.name!=="string"||!f.name.trim()||n.domain.accounts.some(a=>a.id===f.id)||n.holdings.some(h=>h.id===f.id))return error("asset-contract");n.assets.push(f);}
   else return error("unknown-operation");
   n.revision++;state=n;return {status:"APPLIED_SHADOW",revision:n.revision,productionWriteAllowed:false};
  }catch(e){return error(String(e.message||"invalid-operation"));}
 }
 function view({month,asOf,through,openingMinor=0,query=""}={}){
  if(!isDate(month+"-01")||!isDate(asOf)||!isDate(through)||asOf>through)throw Error("workspace-period");
  const n=snapshot(),from=[month+"-01",asOf,...n.rules.map(r=>r.start)].sort()[0],to=[monthEnd(month),through,asOf].sort().at(-1);
  let occurrences=[],projection;
  try{occurrences=expandSchedules(n.rules,{from,to});projection=scheduledLedger(n.domain,occurrences);}catch(e){projection=error(String(e.message));}
  const p=portfolioReport(n.holdings,n.events,{asOf}),wealth=wealthSnapshot(n.domain,p,n.assets.filter(a=>a.valuedOn<=asOf),{asOf});
  const actual=domainLedger(n.domain).map(r=>({...r,note:n.domain.movements.find(m=>m.id===r.id)?.note??""}));
  const search=searchMovements(actual,query,{limit:100});
  return {revision:n.revision,accounts:accountBalances(n.domain).map(a=>({...a,name:n.domain.accounts.find(x=>x.id===a.id).name})),obligations:obligationStatus(n.domain).map(a=>({...a,name:n.domain.obligations.find(x=>x.id===a.id).name})),movements:n.domain.movements,occurrences:occurrences.filter(o=>o.due<=through).slice(0,200),occurrenceCount:occurrences.length,projection,forecast:projection.status==="PREVIEW_ONLY"?forecast(projection.rows,{openingMinor,asOf,through}):projection,budget:projection.status==="PREVIEW_ONLY"?budgetOverview(projection.rows,month,n.limits.filter(l=>l.month===month)):projection,goals:n.goals.map(g=>({...g,...goalProgress(g,n.contributions.filter(c=>c.goalId===g.id),{asOf})})),portfolio:p,wealth,search,auditCount:n.domain.audit.length};
 }
 return Object.freeze({snapshot,apply,nextId,view});
}
export function inputMinor(s){return minorFromDecimal(String(s).trim());}
