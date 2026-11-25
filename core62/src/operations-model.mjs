import {emptyDomain,execute,accountBalances,obligationStatus,domainLedger} from "./domain.mjs";
import {analyzeLedger} from "./ledger.mjs";
import {minorFromDecimal} from "./money.mjs";
export function newLabSession(){let state=emptyDomain(),serial=0;
function send(type,fields){const result=execute(state,{...fields,type,opId:"lab:"+ ++serial,expectedRevision:state.revision});if(result.status==="APPLIED_SHADOW")state=result.state;return {status:result.status,code:result.code??null,revision:state.revision};}
function nextId(prefix){return prefix+":"+(serial+1);}
function view(){return {revision:state.revision,accounts:accountBalances(state).map(a=>({...a,name:state.accounts.find(x=>x.id===a.id).name})),obligations:obligationStatus(state).map(o=>({...o,name:state.obligations.find(x=>x.id===o.id).name})),movements:state.movements.map(m=>({...m})).reverse(),totals:analyzeLedger(domainLedger(state)),auditCount:state.audit.length};}
return Object.freeze({send,nextId,view});}
export function labMoney(s){return minorFromDecimal(String(s).trim());}
