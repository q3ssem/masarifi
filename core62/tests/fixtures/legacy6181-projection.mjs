  function parseYMD(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    if (!m) return null; var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3] ? d : null;
  }

  var pad = function (n) { return String(n).padStart(2, '0'); };
  var ymd = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  function fin618Cents(a){if(typeof a!=='number'||!Number.isFinite(a))return null;var c=Math.round(Math.abs(a)*100);return Number.isSafeInteger(c)?(a<0?-c:c):null;}
  function fin618Analyze(rows){var sums={confirmedIn:0,confirmedOut:0,assumedIn:0,assumedOut:0,plannedIn:0,plannedOut:0},issues=[],seen=new Set(),valid=0,counts={confirmed:0,assumed:0,planned:0};
    rows.forEach(function(e,i){var c=e&&fin618Cents(e.a),d=e&&parseYMD(e.d),k=e&&(e.status+(e.a>0?'In':'Out'));if(!e||c===null||!c||!d||ymd(d)!==e.d||!Object.prototype.hasOwnProperty.call(sums,k)||typeof e.id!=='string'||!e.id){issues.push({index:i,id:e&&e.id||'',code:'invalid'});return;}
      var identity=JSON.stringify([e.id,e.d,e.status,e.kind]);if(seen.has(identity)){issues.push({index:i,id:e.id,code:'duplicate'});/* Do not infer which duplicate is correct. Preserve both in totals until reviewed. */}seen.add(identity);
      var n=sums[k]+Math.abs(c);if(!Number.isSafeInteger(n)){issues.push({index:i,id:e.id,code:'overflow'});return;}sums[k]=n;valid++;counts[e.status]++;
    });var totals={};Object.keys(sums).forEach(function(k){totals[k]=sums[k]/100;});return {cents:sums,totals:totals,issues:issues,valid:valid,count:rows.length,counts:counts,complete:issues.length===0};}

// Projection fixture harness: only the inputs of the real ledgerMonth are stubbed.
function projectFixture(f){const state={expenses:f.future,debts:f.debts};const fixedKey=(y,m)=>y+"-"+String(m+1).padStart(2,"0");const midnight=()=>new Date(2026,11,15);const r2=a=>Math.round(a*100)/100;const catOf=()=>({name:"category"}),srcOf=()=>({name:"source"});const moneyOutMonth=()=>f.out,moneyInMonth=()=>f.in,plannedCommitmentsMonth=()=>f.plan;
  function ledgerMonth(y,m){var key=fixedKey(y,m),today=ymd(midnight()),out=[];
    function add(e,a,status,name){out.push({id:e.id,d:e.date,n:name||e.note||catOf(e.cat).name,a:r2(a),status:status,ts:e.ts||0,category:a<0?(e.cat||'other'):null,source:a>0?(e.src||null):null,kind:e.inst?'installment':e.debt?'debt':e.jm?'association':e.fid?'fixed':e.bnin?'bnpl':a>0?'income':'expense'});}
    moneyOutMonth(y,m).forEach(function(e){add(e,-e.amount,e.assumed?'assumed':'confirmed');});
    state.expenses.filter(function(e){return e.date.slice(0,7)===key&&e.date>today;}).forEach(function(e){add(e,-e.amount,'planned');});
    moneyInMonth(y,m).forEach(function(e){add(e,e.amount,e.rid||e.date>today?'planned':e.assumed?'assumed':'confirmed',e.note||srcOf(e.src).name);});
    plannedCommitmentsMonth(y,m).forEach(function(e){add(e,-e.amount,'planned');});
    state.debts.filter(function(d){return d.dir==='owed';}).forEach(function(d){(d.pays||[]).forEach(function(p,k){if(p&&parseYMD(p.d)&&p.d.slice(0,7)===key&&p.d<=today&&p.a>0)add({id:'recv:'+d.id+':'+k,date:p.d,ts:p.ts,debt:d.id},+p.a,'confirmed',d.who);});});
    return out.sort(function(a,b){return b.d.localeCompare(a.d)||b.ts-a.ts||a.id.localeCompare(b.id);});
  }

return ledgerMonth(2026,11);}

export {fin618Analyze,projectFixture};
