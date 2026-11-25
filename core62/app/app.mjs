import {inputMinor} from "../src/workspace.mjs";
import {createJournalSession} from "../src/journal.mjs";
import {setupDataCenter} from "./data-center.mjs";
import {THEMES} from "../src/ui-model.mjs";
const $=id=>document.getElementById(id);let w=createJournalSession(),dataCenter=null;
const localDate=d=>String(d.getFullYear()).padStart(4,"0")+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");const now=new Date();$("asOf").value=localDate(now);$("month").value=localDate(now).slice(0,7);$("through").value=localDate(new Date(now.getFullYear(),now.getMonth()+1,0));
const node=(tag,text="",cls="")=>{const x=document.createElement(tag);x.textContent=text;if(cls)x.className=cls;return x;};
const amount=n=>{if(!Number.isSafeInteger(n))return "غير متاح";const b=BigInt(n),a=b<0n?-b:b;return (b<0n?"−":"")+new Intl.NumberFormat("ar-SA").format(a/100n)+"٫"+new Intl.NumberFormat("ar-SA",{minimumIntegerDigits:2,useGrouping:false}).format(a%100n)+" ر.س";};
const types={debt:"دين",installment:"قسط",association:"جمعية",fixed:"ثابت",bnpl:"شراء آجل",income:"دخل متكرر",subscription:"اشتراك",buy:"شراء",sell:"بيع",dividend:"توزيعات",value:"تقييم"};
const sections={overview:["الرئيسية",[]],cash:["الحسابات والحركات",["account","record","edit","transfer","void","archive"]],schedule:["الالتزامات والجدولة",["obligation","settle","rule","materialize"]],plan:["الميزانيات والأهداف",["budget","goal","contribution"]],wealth:["الاستثمارات والثروة",["holding","investment","asset"]],search:["البحث",[]],reports:["التقارير والبيانات",[]]};
const actions={account:"حساب جديد",record:"تسجيل حركة",edit:"تعديل حركة",transfer:"تحويل داخلي",void:"عكس حركة",archive:"أرشفة حساب",obligation:"التزام يدوي",settle:"سداد أو قبض",rule:"جدولة متكررة",materialize:"تثبيت استحقاق",budget:"ميزانية فئة",goal:"هدف ادخاري",contribution:"ادخار أو سحب",holding:"استثمار جديد",investment:"حركة استثمار",asset:"أصل أو ممتلكات"};
let section="overview",query="",last=null;
const selectOpts=(x,opts)=>{x.replaceChildren(...opts.map(([v,t])=>{const o=node("option",t);o.value=v;return o;}));};
selectOpts($("theme"),THEMES.map(t=>[t[0],t[1]]));for(const id of ["theme","mode"])$(id).addEventListener("change",()=>document.documentElement.dataset[id]=$(id).value);
for(const [id,[label]] of Object.entries(sections)){const b=node("button",label);b.type="button";b.dataset.section=id;b.addEventListener("click",()=>navigate(id));$("nav").append(b);}
function line(parent,label,value){const x=node("div","","line");x.append(node("span",label),node("strong",String(value)));parent.append(x);}
function title(parent,label){parent.append(node("h2",label));}
function cards(parent,entries){const grid=node("div","","cards");for(const [label,value] of entries){const x=node("div","","metric");x.append(node("small",label),node("strong",String(value)));grid.append(x);}parent.append(grid);}
function options(){return {month:$("month").value,asOf:$("asOf").value,through:$("through").value,openingMinor:inputMinor($("opening").value),query};}
function render(){const p=$("view");p.replaceChildren();try{last=w.view(options());const x=last;title(p,sections[section][0]);if(section==="overview"){const q=x.projection.quality?.cents;cards(p,[["الدخل المؤكد",amount(q?.confirmedIn)],["المصروف المؤكد",amount(q?.confirmedOut)],["المخطط للدفع",amount(q?.plannedOut)],["الرصيد المتوقع",amount(x.forecast.closingMinor)],["صافي الثروة المدخل",amount(x.wealth.netMinor)],["مراجعات العمليات",x.auditCount]]);p.append(node("p",x.forecast.status==="SIMULATION_ONLY"?(x.forecast.firstDeficit?"أول عجز متوقع: "+x.forecast.firstDeficit:"لا عجز يومي متوقع ضمن السيناريو المدخل"):"التوقع متوقف: تحقق من الجدولة والبيانات","muted"));p.append(node("p","المجاميع المؤكدة تشمل كل الحركات في الجلسة. التوقع يبدأ من الرصيد الذي أدخلته.","muted"));}
if(section==="cash"){title(p,"الأرصدة");for(const a of x.accounts)line(p,a.name+(a.archived?" · مؤرشف":""),amount(a.balanceMinor));title(p,"الحركات");for(const m of [...x.movements].reverse().slice(0,100))line(p,(m.note||m.id)+" · "+m.date+(m.voided?" · معكوسة":""),amount(m.kind==="transfer"?m.amountMinor:m.direction==="out"?-m.amountMinor:m.amountMinor));}
if(section==="schedule"){title(p,"الالتزامات المثبتة");for(const o of x.obligations)line(p,o.name+" · "+(types[o.family]||o.family)+" · "+o.due,amount(o.remainingMinor));title(p,"الاستحقاقات المتولدة");for(const o of x.occurrences)line(p,o.name+" · "+o.due,amount(o.amountMinor));p.append(node("p","عدد الاستحقاقات المتولدة: "+x.occurrenceCount+"؛ العرض محدود بـ200.","muted"));}
if(section==="plan"){title(p,"ميزانيات الشهر");for(const b of x.budget.items??[])line(p,b.category+" · متبقي مع المخطط",amount(b.remainingIncludingPlansMinor));title(p,"الأهداف");for(const g of x.goals)line(p,g.name+" · المتبقي",amount(g.remainingMinor));}
if(section==="wealth"){p.append(node("p","تقييمات يدوية، وتدفقات الاستثمار غير مرتبطة بالمحافظ تلقائيًا. لا تعتبر الثروة مكتملة قبل مطابقة الحسابات.","muted"));cards(p,[["قيمة الاستثمار",amount(x.portfolio.marketMinor)],["الربح الإجمالي",amount(x.portfolio.totalProfitMinor)],["صافي الثروة المدخل",amount(x.wealth.netMinor)]]);for(const h of x.portfolio.items)line(p,h.name,amount(h.marketMinor));for(const a of w.snapshot().assets)line(p,a.name,amount(a.valueMinor));}
if(section==="reports"){const r=dataCenter.report();if(r.status!=="REPORT_ONLY")p.append(node("p","التقرير متوقف بسبب جودة البيانات.","negative"));else{cards(p,[["دخل الشهر المؤكد",amount(r.cents.confirmedIn)],["مصروف الشهر المؤكد",amount(r.cents.confirmedOut)],["صافي الشهر",amount(r.confirmedNetMinor)],["مدفوعات متوقعة",amount(r.cents.plannedOut)]]);for(const c of r.categories)line(p,c.category+" · مؤكد / مخطط",amount(c.confirmedMinor)+" / "+amount(c.plannedMinor));}}
if(section==="search"){const f=node("form"),inp=node("input"),btn=node("button","بحث");inp.value=query;inp.placeholder="اسم أو مبلغ أو تاريخ";inp.setAttribute("aria-label","البحث في الحركات");btn.type="submit";f.append(inp,btn);f.addEventListener("submit",e=>{e.preventDefault();query=inp.value;render();});p.append(f,node("p","النتائج: "+x.search.total,"muted"));for(const r of x.search.results)line(p,(r.note||r.id)+" · "+r.date,amount(r.amountMinor));}
}catch(e){last=null;p.append(node("p","تعذر عرض البيانات. راجع الفترة والمبالغ.","negative"));}}
function navigate(id){section=id;$("message").textContent="";for(const b of $("nav").children){if(b.dataset.section===id)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");}const list=sections[id][1];$("dataPanel").hidden=id!=="reports";$("editor").hidden=!list.length;selectOpts($("action"),list.map(x=>[x,actions[x]]));render();fields();}
const val=id=>$(id)?.value??"";
function field(id,label,{type="text",value="",opts=null}={}){const l=node("label",label),x=node(opts?"select":"input");x.id=id;if(opts)selectOpts(x,opts);else{x.type=type;x.value=value;if(["amt","basis","initial"].includes(id))x.inputMode="decimal";}l.append(x);$("fields").append(l);}
function fields(){const action=val("action"),s=w.snapshot(),accounts=s.domain.accounts.filter(a=>!a.archived).map(a=>[a.id,a.name]),moves=s.domain.movements.filter(m=>!m.voided);$("fields").replaceChildren();
const date=()=>field("date","التاريخ",{type:"date",value:val("asOf")}),amt=()=>field("amt","المبلغ بالريال",{value:"100"}),name=()=>field("name","الاسم",{value:"تجريبي"}),note=()=>field("note","الوصف"),dir=()=>field("direction","الاتجاه",{opts:[["out","دفع"],["in","قبض"]]}),acct=()=>field("accountId","الحساب",{opts:[["","غير مرتبط"],...accounts]}),category=()=>field("category","الفئة",{value:"عام"});
if(action==="account"){name();field("initial","رصيد افتتاحي بالريال",{value:"1000"});date();}
if(action==="record"||action==="edit"){if(action==="edit")field("target","الحركة",{opts:moves.filter(m=>m.kind==="record").map(m=>[m.id,m.note||m.id])});dir();amt();date();category();note();acct();}
if(action==="transfer"){field("from","من حساب",{opts:accounts});field("to","إلى حساب",{opts:accounts});amt();date();note();}
if(action==="void")field("target","الحركة",{opts:moves.map(m=>[m.id,m.note||m.id])});if(action==="archive")field("target","الحساب",{opts:accounts});
if(action==="obligation"||action==="rule"){field("family","النوع",{opts:Object.entries(types).filter(([k])=>["debt","installment","association","fixed","bnpl",...(action==="rule"?["income","subscription"]:[])].includes(k))});dir();name();amt();date();if(action==="rule"){field("day","اليوم (1–31)",{type:"number",value:"25"});field("interval","كل كم شهر",{type:"number",value:"1"});field("count","عدد الدفعات؛ فارغ = مفتوح",{type:"number",value:"12"});}}
if(action==="settle"){field("target","الالتزام",{opts:(last?.obligations??[]).filter(o=>o.remainingMinor>0).map(o=>[o.id,o.name+" · "+amount(o.remainingMinor)])});amt();date();acct();note();}
if(action==="materialize")field("target","الاستحقاق",{opts:(last?.occurrences??[]).map(o=>[o.id,o.name+" · "+o.due])});
if(action==="budget"){category();amt();}
if(action==="goal"){name();amt();date();}
if(action==="contribution"){field("target","الهدف",{opts:s.goals.map(g=>[g.id,g.name])});amt();date();}
if(action==="holding"){name();category();}
if(action==="investment"){field("target","الاستثمار",{opts:s.holdings.map(h=>[h.id,h.name])});field("trade","العملية",{opts:Object.entries(types).filter(([k])=>["buy","sell","dividend","value"].includes(k))});amt();field("basis","تكلفة الجزء المباع (للبيع فقط)",{value:"0"});date();}
if(action==="asset"){name();amt();date();}
if(action==="edit"){const target=$("target");const load=()=>{const m=moves.find(m=>m.id===target.value);if(!m)return;const b=BigInt(m.amountMinor);$("amt").value=String(b/100n)+"."+String(b%100n).padStart(2,"0");$("direction").value=m.direction;$("date").value=m.date;$("category").value=m.category??"";$("note").value=m.note;$("accountId").value=m.accountId??"";};target.addEventListener("change",load);load();}
}
function submit(e){e.preventDefault();const action=val("action"),id=w.nextId(action),date=val("date"),direction=val("direction"),a=()=>inputMinor(val("amt"));let type=action,f;
try{switch(action){
case "account":f={id,name:val("name"),openingMinor:inputMinor(val("initial")),openingDate:date};break;
case "record":case "edit":f={id:action==="edit"?val("target"):id,direction,amountMinor:a(),date,category:direction==="in"?null:val("category"),note:val("note"),accountId:val("accountId")||null};break;
case "transfer":f={id,from:val("from"),to:val("to"),amountMinor:a(),date,note:val("note")};break;
case "void":case "archive":f={id:val("target")};break;
case "obligation":f={id,family:val("family"),direction,amountMinor:a(),due:date,name:val("name")};break;
case "settle":f={id,obligationId:val("target"),amountMinor:a(),date,accountId:val("accountId")||null,note:val("note")};break;
case "rule":f={id,kind:val("family"),direction,amountMinor:a(),start:date,day:Number(val("day")),everyMonths:Number(val("interval")),count:val("count")===""?null:Number(val("count")),end:null,name:val("name")};break;
case "materialize":{const o=last?.occurrences.find(o=>o.id===val("target"));if(!o)throw Error("occurrence");f={scheduleId:o.scheduleId,due:o.due};break;}
case "budget":f={month:val("month"),category:val("category"),limitMinor:a()};break;
case "goal":f={id,name:val("name"),targetMinor:a(),due:date};break;
case "contribution":f={id,goalId:val("target"),date,amountMinor:a()};break;
case "holding":f={id,name:val("name"),category:val("category")};break;
case "investment":f={id,holdingId:val("target"),date,type:val("trade"),amountMinor:a()};if(f.type==="sell")f.basisRemovedMinor=inputMinor(val("basis"));break;
case "asset":f={id,name:val("name"),valueMinor:a(),valuedOn:date};break;
default:throw Error("action");}
if(["void","archive"].includes(action)&&!window.confirm("تأكيد "+actions[action]+"؟"))return;
if(["account","record","edit","transfer","void","archive","obligation","settle"].includes(action)){type="domain";f={...f,type:action};}
const r=w.apply(type,f);$("message").textContent=r.status==="APPLIED_SHADOW"?"تم التنفيذ في الجلسة التجريبية · مراجعة "+r.revision:r.status==="ALREADY_MATERIALIZED"?"الاستحقاق مثبت مسبقًا":"تعذر التنفيذ؛ راجع القيم والارتباطات.";
render();if(r.status==="APPLIED_SHADOW"){fields();dataCenter.changed();}}catch{$("message").textContent="راجع القيم المدخلة."}}
$("action").addEventListener("change",fields);$("form").addEventListener("submit",submit);$("refresh").addEventListener("click",()=>{render();fields();});dataCenter=setupDataCenter({getSession:()=>w,replaceSession:s=>{w=s;},refresh:()=>{render();fields();},getPeriod:options,getRows:()=>{const x=w.view(options()).projection;if(x.status!=="PREVIEW_ONLY")throw Error("projection-blocked");const notes=new Map(w.snapshot().domain.movements.map(m=>[m.id,m.note]));return x.rows.map(r=>({...r,note:notes.get(r.id)??""}));}});navigate("overview");dataCenter.changed();
