import {newLabSession,labMoney} from "../src/operations-model.mjs";
import {THEMES} from "../src/ui-model.mjs";
const $=id=>document.getElementById(id),session=newLabSession();
const el=(tag,text,cls)=>{const e=document.createElement(tag);e.textContent=text??"";if(cls)e.className=cls;return e;};
const money=n=>{const b=BigInt(n),a=b<0n?-b:b;return (b<0n?"−":"")+new Intl.NumberFormat("ar-SA").format(a/100n)+"٫"+new Intl.NumberFormat("ar-SA",{minimumIntegerDigits:2,useGrouping:false}).format(a%100n)+" ر.س";};
const family={debt:"دين",installment:"قسط",association:"جمعية",fixed:"ثابت",bnpl:"شراء آجل"};
const errors={"account-unavailable":"الحساب غير متاح","record-id":"الحركة غير متاحة","settlement-contract":"السداد يتجاوز المتبقي أو بياناته غير صالحة","movement-unavailable":"الحركة معكوسة أو غير متاحة","record-contract":"راجع بيانات الحركة","balance-overflow":"المبلغ يتجاوز الحد الحسابي","transfer-contract":"راجع الحسابين والمبلغ"};
for(const [id,name] of THEMES){const o=el("option",name);o.value=id;$("theme").append(o);}
for(const id of ["theme","mode"])$(id).addEventListener("change",()=>document.documentElement.dataset[id]=$(id).value);
function field(id,label,{type="text",value="",opts=null}={}){const l=el("label",label),x=el(opts?"select":"input");x.id=id;x.name=id;if(opts){for(const [v,t] of opts){const o=el("option",t);o.value=v;x.append(o);}}else{x.type=type;x.value=value;if(id==="amount"||id==="opening")x.inputMode="decimal";}l.append(x);$("fields").append(l);return x;}
const v=id=>$(id)?.value??"";
const active=()=>session.view().accounts.filter(a=>!a.archived).map(a=>[a.id,a.name]);
function fields(){const action=v("action");$("fields").replaceChildren();const accounts=active(),optional=[["","بدون حساب"],...accounts],rows=session.view().movements.filter(m=>!m.voided);
const date=()=>field("date","التاريخ",{type:"date",value:"2026-12-01"}),amount=()=>field("amount","المبلغ بالريال",{value:"100"}),note=()=>field("note","الوصف");
const direction=()=>field("direction","الاتجاه",{opts:[["out","مصروف / دفع"],["in","دخل / قبض"]]});
const acct=()=>field("accountId","الحساب",{opts:optional});
if(action==="account"){field("name","اسم الحساب",{value:"حساب تجريبي"});field("opening","الرصيد الافتتاحي",{value:"1000"});date();}
if(action==="record"||action==="edit"){if(action==="edit")field("target","الحركة",{opts:rows.filter(m=>m.kind==="record").map(m=>[m.id,m.note||m.id])});direction();amount();date();field("category","الفئة",{value:"عام"});note();acct();}
if(action==="transfer"){field("from","من حساب",{opts:accounts});field("to","إلى حساب",{opts:accounts});amount();date();note();}
if(action==="obligation"){field("family","نوع الالتزام",{opts:Object.entries(family)});direction();field("name","اسم الالتزام",{value:"التزام تجريبي"});amount();date();}
if(action==="settle"){field("target","الالتزام",{opts:session.view().obligations.filter(o=>o.remainingMinor>0).map(o=>[o.id,o.name+" · "+money(o.remainingMinor)])});amount();date();acct();note();}
if(action==="void")field("target","الحركة",{opts:rows.map(m=>[m.id,(m.note||m.id)+" · "+money(m.amountMinor)])});
if(action==="archive")field("target","الحساب",{opts:accounts});
}
function makeLine(label,value){const r=el("div","","row");r.append(el("span",label),el("strong",value));return r;}
function render(){const x=session.view();$("metrics").replaceChildren(...[["الدخل المؤكد",money(x.totals.cents.confirmedIn)],["المصروف المؤكد",money(x.totals.cents.confirmedOut)],["مراجعات التدقيق",String(x.auditCount)]].map(([n,t])=>{const m=el("div","","metric");m.append(el("small",n),el("strong",t));return m;}));
$("accounts").replaceChildren(...x.accounts.map(a=>makeLine(a.name+(a.archived?" · مؤرشف":""),money(a.balanceMinor))));
$("obligations").replaceChildren(...x.obligations.map(o=>makeLine(o.name+" · "+family[o.family]+" · "+(o.direction==="out"?"دفع":"قبض"),money(o.remainingMinor))));
$("movements").replaceChildren(...x.movements.map(m=>makeLine((m.note||m.id)+" · "+m.date+(m.voided?" · معكوسة":""),money(m.kind==="transfer"?m.amountMinor:m.direction==="in"?m.amountMinor:-m.amountMinor))));
}
function submit(e){e.preventDefault();const type=v("action"),id=session.nextId(type),date=v("date"),note=v("note");let f;try{switch(type){case "account":f={id,name:v("name"),openingMinor:labMoney(v("opening")),openingDate:date};break;
case "record":case "edit":f={id:type==="edit"?v("target"):id,direction:v("direction"),amountMinor:labMoney(v("amount")),date,category:v("direction")==="in"?null:v("category"),note,accountId:v("accountId")||null};break;
case "transfer":f={id,from:v("from"),to:v("to"),amountMinor:labMoney(v("amount")),date,note};break;
case "obligation":f={id,family:v("family"),direction:v("direction"),amountMinor:labMoney(v("amount")),due:date,name:v("name")};break;
case "settle":f={id,obligationId:v("target"),amountMinor:labMoney(v("amount")),date,accountId:v("accountId")||null,note};break;
case "void":case "archive":f={id:v("target")};break;}
const r=session.send(type,f);$("status").textContent=r.status==="APPLIED_SHADOW"?"تم تنفيذ العملية التجريبية · مراجعة "+r.revision:errors[r.code]||"تعذر التنفيذ، راجع البيانات.";
if(r.status==="APPLIED_SHADOW"){render();fields();}}catch{$("status").textContent="راجع المبلغ والبيانات المدخلة."}}
$("action").addEventListener("change",fields);$("command").addEventListener("submit",submit);fields();render();
