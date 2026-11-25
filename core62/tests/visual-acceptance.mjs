async function choose(p,id,value){if(["layout","style","theme","mode","font","motion"].includes(id)){if(await p.locator("#settingsPanel").isHidden())await p.locator("#openSettings").click();const page=["font","motion"].includes(id)?"settingsTypePage":"settingsAppearancePage";if(await p.locator("#"+page).isHidden()){if(await p.locator("#settingsBack").isVisible())await p.locator("#settingsBack").click();await p.locator(page==="settingsTypePage"?"#settingsType":"#settingsAppearance").click();}}const select=p.locator("#"+id);if(await select.isVisible()){await select.selectOption(value);return;}if(id==="action"){await p.locator("#openOperations").click();await p.locator("#operationDialog [data-operation="+JSON.stringify(value)+"]").click();}else await p.locator("#"+id+"Choices [data-choice="+JSON.stringify(value)+"]").click();}
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile,mkdir,writeFile,mkdtemp,rm} from "node:fs/promises";
import {execFileSync} from "node:child_process";
import {tmpdir} from "node:os";
import {resolve,join,extname} from "node:path";
import {chromium,webkit,devices} from "playwright";
const engine=process.env.BROWSER_ENGINE==="webkit"?"webkit":"chromium",out=resolve("dist/visual-"+engine),root=await mkdtemp(join(tmpdir(),"masarifi-visual-")),dist=join(root,"app-package");
await mkdir(out,{recursive:true});
let browser,server;
try{
 execFileSync(process.execPath,["core62/scripts/build-clean-release.mjs",dist],{stdio:"inherit"});
 const manifest=JSON.parse(await readFile(join(dist,"build-manifest.json"),"utf8"));
 const allowed=new Map(await Promise.all(manifest.assets.map(async a=>["/"+a.path,await readFile(join(dist,a.path))])));
 const mime={".html":"text/html;charset=utf-8",".mjs":"text/javascript;charset=utf-8",".ttf":"font/ttf",".txt":"text/plain",".css":"text/css;charset=utf-8",".png":"image/png",".webmanifest":"application/manifest+json"};
 server=createServer((req,res)=>{const body=allowed.get(req.url);if(req.method!=="GET"||!body){res.writeHead(404);res.end();return;}res.writeHead(200,{"content-type":mime[extname(req.url)]});res.end(body);});
 await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await (engine==="webkit"?webkit:chromium).launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});const page=await context.newPage(),errors=[],metrics=[];
 page.on("pageerror",e=>errors.push(String(e)));await page.goto("http://127.0.0.1:"+server.address().port+"/app/index.html");
 const sections=["الرئيسية","الحسابات والحركات","الالتزامات والجدولة","الميزانيات والأهداف","الاستثمارات والثروة","البحث","التقارير والبيانات"];
 async function nav(label){if(await page.locator("#settingsPanel").isVisible())await page.locator("#closeSettings").click();if(await page.locator("html").getAttribute("data-layout")==="classic"&&[sections[1],sections[3],sections[4],sections[5]].includes(label)){if(await page.locator("#moreNav").isHidden())await page.locator("#moreToggle").click();await page.locator("#moreNav").getByRole("button",{name:label,exact:true}).click();}else await page.locator("#nav").getByRole("button",{name:label,exact:true}).click();}
 async function submit(action,fields){await choose(page,"action",action);for(const [id,value] of Object.entries(fields)){const el=page.locator("#"+id);if(await el.evaluate(e=>e.tagName)==="SELECT")await choose(page,id,value);else await el.fill(value);}await page.locator("#form button[type=submit]").click();await page.locator("#message").getByText(/تم التنفيذ/).waitFor();}
 await nav(sections[1]);await submit("account",{name:"محفظة اختبار",initial:"2500"});await submit("record",{direction:"out",amt:"123.45",note:"مصروف تجريبي",category:"food"});await submit("record",{direction:"in",amt:"2500",note:"دخل تجريبي"});await nav(sections[4]);await submit("holding",{name:"استثمار تجريبي",category:"صندوق"});const holdingId=await (async()=>{await choose(page,"action","investment");return page.locator("#target option").first().getAttribute("value");})();await submit("investment",{target:holdingId,trade:"buy",amt:"400"});await submit("investment",{target:holdingId,trade:"value",amt:"450"});await submit("asset",{name:"أصل تجريبي",amt:"1200"});
 for(const layout of ["classic","unified"])for(const mode of ["light","dark"]){
  if(await page.locator("#settingsPanel").isHidden())await page.locator("#openSettings").click();
  await choose(page,"layout",layout);await choose(page,"mode",mode);await page.locator("#closeSettings").click();
  for(const [width,height] of [[320,568],[390,844],[768,1024],[844,390]]){
   await page.setViewportSize({width,height});
   for(const [i,label] of sections.entries()){
    await nav(label);await page.evaluate(()=>window.scrollTo(0,0));await page.evaluate(()=>document.fonts.ready);
    const file=layout+"-"+mode+"-"+width+"x"+height+"-"+(i+1)+".png";
    await page.screenshot({path:join(out,file),fullPage:true,animations:"disabled"});
    const checks=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,docWidth:document.documentElement.scrollWidth,viewport:innerWidth,shortControls:[...document.querySelectorAll("button,input,select,textarea")].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().height<43.5).map(e=>e.id||e.tagName),unlabelled:[...document.querySelectorAll("button,input,select,textarea")].filter(e=>e.getClientRects().length&&!(e.getAttribute("aria-label")||Array.from(e.labels??[]).map(l=>l.textContent).join(" ")||(e.tagName==="BUTTON"?e.textContent:""))?.trim()).length}));
    metrics.push({file,layout,mode,width,height,section:label,...checks});
   }
  }
 }
 for(const layout of ["classic","unified"])for(const style of ["glass","android","paper","mono"])for(const mode of ["light","dark"]){
 if(await page.locator("#settingsPanel").isHidden())await page.locator("#openSettings").click();
 await choose(page,"layout",layout);await choose(page,"style",style);await choose(page,"mode",mode);await choose(page,"motion","off");await page.locator("#closeSettings").click();
 for(const [width,height] of [[320,568],[390,844]]){await page.setViewportSize({width,height});for(const [i,label] of sections.entries()){await nav(label);await page.evaluate(()=>window.scrollTo(0,0));const file=style+"-"+layout+"-"+mode+"-"+width+"x"+height+"-"+(i+1)+".png";await page.screenshot({path:join(out,file),fullPage:true,animations:"disabled"});const checks=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,shortControls:[...document.querySelectorAll("button,input,select,textarea")].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().height<43.5).map(e=>e.id||e.tagName),unlabelled:[...document.querySelectorAll("button,input,select,textarea")].filter(e=>e.getClientRects().length&&!(e.getAttribute("aria-label")||Array.from(e.labels??[]).map(l=>l.textContent).join(" ")||(e.tagName==="BUTTON"?e.textContent:""))?.trim()).length}));metrics.push({file,layout,style,mode,width,height,section:label,...checks});}}
 }
 for(const style of ["original","glass","android","paper","mono"])for(const mode of ["light","dark"]){
 if(await page.locator("#settingsPanel").isHidden())await page.locator("#openSettings").click();await choose(page,"layout","classic");await choose(page,"style",style);await choose(page,"mode",mode);await choose(page,"motion","off");await page.locator("#closeSettings").click();await page.setViewportSize({width:390,height:844});await nav(sections[0]);await page.locator("#quickExpense").click();for(const kind of ["entry","operations"]){if(kind==="operations"){await page.locator("#closeEditor").click();await nav(sections[1]);await page.locator("#openOperations").click();}const file=style+"-"+mode+"-"+kind+"-sheet.png";await page.screenshot({path:join(out,file),animations:"disabled"});const checks=await page.evaluate(kind=>{const d=document.getElementById(kind==="entry"?"entryDialog":"operationDialog"),r=d.getBoundingClientRect();return {overflow:r.left<0||r.right>innerWidth||d.scrollWidth>d.clientWidth+1,shortControls:[...d.querySelectorAll("button,input,select")].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().height<43.5).map(e=>e.id||e.tagName),unlabelled:[...d.querySelectorAll("button,input,select")].filter(e=>e.getClientRects().length&&!(e.getAttribute("aria-label")||Array.from(e.labels??[]).map(l=>l.textContent).join(" ")||(e.tagName==="BUTTON"?e.textContent:""))?.trim()).length};},kind);metrics.push({file,layout:"classic",style,mode,width:390,height:844,section:kind,...checks});}await page.locator("#closeOperations").click();
 }
 for(const style of ["original","glass","android","paper","mono"])for(const mode of ["light","dark"]){if(await page.locator("#settingsPanel").isHidden())await page.locator("#openSettings").click();await choose(page,"layout","classic");await choose(page,"style",style);await choose(page,"mode",mode);await page.setViewportSize({width:390,height:844});await page.locator("#settingsPanel").scrollIntoViewIfNeeded();await page.locator("#settingsPanel").screenshot({path:join(out,style+"-"+mode+"-settings.png"),animations:"disabled"});await page.locator("#closeSettings").click();await page.locator("#moreToggle").click();await page.locator("#moreNav").screenshot({path:join(out,style+"-"+mode+"-more.png"),animations:"disabled"});await page.locator("#closeMore").click();}
 for(const theme of ["sand62","jade62","sapphire62","berry62","copper62","graphite62"])for(const mode of ["light","dark"]){if(await page.locator("#settingsPanel").isHidden())await page.locator("#openSettings").click();await choose(page,"style","original");await choose(page,"theme",theme);await choose(page,"mode",mode);await page.locator("#closeSettings").click();await nav(sections[0]);await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:join(out,theme+"-"+mode+"-home.png"),fullPage:true,animations:"disabled"});}
 for(const mode of ["light","dark"]){if(await page.locator("#settingsPanel").isHidden())await page.locator("#openSettings").click();await choose(page,"layout","classic");await choose(page,"style","original");await choose(page,"theme","reef6181");await choose(page,"mode",mode);await page.locator("#closeSettings").click();for(const [width,height] of [[320,568],[844,390]]){await page.setViewportSize({width,height});await nav(sections[0]);await page.locator("#quickIncome").click();const file="final-income-"+mode+"-"+width+"x"+height+".png";await page.screenshot({path:join(out,file),animations:"disabled"});const checks=await page.evaluate(()=>{const d=document.getElementById("entryDialog"),r=d.getBoundingClientRect();return {overflow:r.left<0||r.right>innerWidth||d.scrollWidth>d.clientWidth+1,shortControls:[...d.querySelectorAll("button,input,select")].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().height<43.5).map(e=>e.id||e.tagName),unlabelled:[...d.querySelectorAll("button,input,select")].filter(e=>e.getClientRects().length&&!(e.getAttribute("aria-label")||Array.from(e.labels??[]).map(l=>l.textContent).join(" ")||(e.tagName==="BUTTON"?e.textContent:""))?.trim()).length};});metrics.push({file,layout:"classic",style:"original",mode,width,height,section:"income sheet",...checks});await page.locator("#closeEditor").click();}}
 for(const font of ["tajawal","cairo","plex","system"])for(const width of [320,390,430]){await page.setViewportSize({width,height:844});if(await page.locator("#settingsPanel").isHidden())await page.locator("#openSettings").click();await choose(page,"font",font);await page.locator("#closeSettings").click();await nav(sections[0]);await page.locator("#quickIncome").click();await page.evaluate(()=>document.fonts.ready);const file="font-"+font+"-"+width+"-income.png";await page.screenshot({path:join(out,file),animations:"disabled"});const checks=await page.evaluate(()=>{const d=document.getElementById("entryDialog"),r=d.getBoundingClientRect(),rect=e=>e.getBoundingClientRect(),overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>.5&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>.5,tiles=[...d.querySelectorAll("#incomeSourceChoices button")].map(rect);return {overflow:r.left<0||r.right>innerWidth||d.scrollWidth>d.clientWidth+1||overlap(rect(d.querySelector("#date")),rect(d.querySelector("#accountId")))||tiles.some((a,i)=>tiles.slice(i+1).some(b=>overlap(a,b))),shortControls:[...d.querySelectorAll("button,input,select")].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().height<43.5).map(e=>e.id||e.tagName),unlabelled:[...d.querySelectorAll("button,input,select")].filter(e=>e.getClientRects().length&&!(e.getAttribute("aria-label")||Array.from(e.labels??[]).map(l=>l.textContent).join(" ")||(e.tagName==="BUTTON"?e.textContent:""))?.trim()).length};});metrics.push({file,layout:"classic",font,width,height:844,section:"font and income spacing",...checks});await page.locator("#closeEditor").click();}
 // Physical iPhone report: check positive spacing, field containment and hit targets, not merely non-overlap.
 const fieldMetrics=[];
 for(const style of ["original","glass","android","paper","mono"])for(const mode of ["light","dark"]){
  await page.setViewportSize({width:390,height:844});if(await page.locator("#settingsPanel").isHidden())await page.locator("#openSettings").click();
  await choose(page,"layout","classic");await choose(page,"style",style);await choose(page,"mode",mode);await choose(page,"motion","off");await page.locator("#closeSettings").click();
  for(const width of [375,430])for(const direction of ["Income","Expense"]){
   await page.setViewportSize({width,height:844});await nav(sections[0]);await page.locator("#quick"+direction).click();await page.evaluate(()=>document.fonts.ready);
   const d=page.locator("#entryDialog");await d.locator("#accountId").scrollIntoViewIfNeeded();
   const geometry=await d.evaluate(root=>{
    const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
    const f=root.querySelector("#fields"),date=root.querySelector("#date"),account=root.querySelector("#accountId"),fr=rect(f),a=rect(date),b=rect(account),al=rect(date.closest("label")),bl=rect(account.closest("label"));
    const inside=(x,y)=>x.left>=y.left-.5&&x.right<=y.right+.5&&x.top>=y.top-.5&&x.bottom<=y.bottom+.5;
    return {date:a,account:b,dateLabel:al,accountLabel:bl,gap:b.top-a.bottom,fieldWidth:fr.width,inside:inside(a,al)&&inside(b,bl)&&inside(al,fr)&&inside(bl,fr),sameWidth:Math.abs(a.width-b.width)<=1,fullWidth:Math.abs(a.width-fr.width)<=1&&Math.abs(b.width-fr.width)<=1,overflow:root.scrollWidth>root.clientWidth+1||document.documentElement.scrollWidth>innerWidth};
   });
   assert.ok(geometry.inside&&geometry.sameWidth&&geometry.fullWidth&&geometry.gap>=8&&geometry.date.height>=44&&geometry.account.height>=44&&!geometry.overflow,JSON.stringify({style,mode,width,direction,geometry}));
   const file="mobile-field-"+style+"-"+mode+"-"+width+"-"+direction.toLowerCase()+".png";await page.screenshot({path:join(out,file),animations:"disabled"});fieldMetrics.push({file,style,mode,width,direction,...geometry});
   await page.locator("#closeEditor").click();
  }
 }
 assert.equal(fieldMetrics.length,40);
 await writeFile(join(out,"mobile-field-metrics.json"),JSON.stringify({engine,scope:"mobile viewport geometry; not physical iOS native paint validation",cases:fieldMetrics.length,fieldMetrics},null,2));
 // RC3.23: real hit-test actionability after scrolling short and tall sheets.
 const sheetMetrics=[];
 for(const style of ["original","glass","android","paper","mono"]){
  await page.setViewportSize({width:390,height:844});if(await page.locator("#settingsPanel").isHidden())await page.locator("#openSettings").click();
  await choose(page,"layout","classic");await choose(page,"style",style);await choose(page,"mode","light");await choose(page,"motion","off");await page.locator("#closeSettings").click();
  for(const [width,height] of [[320,568],[390,844],[844,390],[390,480]])for(const direction of ["Income","Expense"]){
   await page.setViewportSize({width,height});await nav(sections[0]);await page.locator("#quick"+direction).click();await page.evaluate(()=>document.fonts.ready);
   const d=page.locator("#entryDialog"),submit=d.locator("#submitOperation"),close=d.locator("#closeEditor");
   const geometry=await d.evaluate(root=>{
    const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
    const r=rect(root),buttons=[...root.querySelectorAll(".choice-chip")].filter(e=>e.getClientRects().length),boxes=buttons.map(rect);
    const overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>.5&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>.5;
    return {sheet:r,overflow:root.scrollWidth>root.clientWidth+1||r.left<-.5||r.right>innerWidth+.5||r.top<-.5||r.bottom>innerHeight+.5,short:boxes.filter(b=>b.height<43.5).length,overlap:boxes.some((a,i)=>boxes.slice(i+1).some(b=>overlap(a,b))),close:rect(root.querySelector("#closeEditor")),submit:rect(root.querySelector("#submitOperation"))};
   });
   assert.ok(!geometry.overflow&&!geometry.short&&!geometry.overlap&&geometry.close.width>=44&&geometry.close.height>=44&&geometry.submit.height>=44,JSON.stringify({style,width,height,direction,geometry}));
   await submit.scrollIntoViewIfNeeded();await submit.click({trial:true});
   const file="sheet-polish-"+style+"-"+width+"x"+height+"-"+direction.toLowerCase()+".png";await page.screenshot({path:join(out,file),animations:"disabled"});
   await close.scrollIntoViewIfNeeded();await close.click({trial:true});await close.click();assert.equal(await d.evaluate(e=>e.open),false);
   sheetMetrics.push({file,style,width,height,direction,...geometry,submitActionable:true,closeActionable:true});
  }
 }
 assert.equal(sheetMetrics.length,40);
 await writeFile(join(out,"sheet-polish-metrics.json"),JSON.stringify({engine,scope:"viewport and real Playwright actionability, not physical iOS keyboard or touch verification",cases:sheetMetrics.length,sheetMetrics},null,2));
 // RC3.24: populate the actual financial UI with long names and amounts, not fabricated DOM cards.
 const cardMetrics=[];
 await page.setViewportSize({width:390,height:844});
 await nav(sections[1]);await submit("record",{direction:"out",amt:"12345678.91",note:"مصروف تجريبي طويل لاختبار المساحة والتفاف الوصف بدون قص",category:"food"});
 await submit("record",{direction:"in",amt:"98765432.10",note:"دخل تجريبي طويل لاختبار اتساع الأرقام مع العنوان"});
 for(const style of ["original","glass","android","paper","mono"]){
  await page.setViewportSize({width:390,height:844});if(await page.locator("#settingsPanel").isHidden())await page.locator("#openSettings").click();
  await choose(page,"layout","classic");await choose(page,"style",style);await choose(page,"mode","light");await choose(page,"motion","off");await page.locator("#closeSettings").click();
  for(const width of [320,390,430])for(const [i,section] of [[0,sections[0]],[6,sections[6]]]){
   await page.setViewportSize({width,height:844});await nav(section);await page.evaluate(()=>{window.scrollTo(0,0);return document.fonts.ready;});
   const geometry=await page.evaluate(()=>{
    const rect=e=>e.getBoundingClientRect(),visible=e=>e.getClientRects().length>0,inside=(a,b)=>a.left>=b.left-1&&a.right<=b.right+1;
    const groups=[...document.querySelectorAll("#view :is(.home-row,.finance-card-head,.search-result,.hero-sum,.financial-rows>.line,.wealth-history .line,.metric)")].filter(visible);
    const violations=[];
    for(const g of groups){const p=rect(g),items=[...g.children].filter(visible);for(const e of items){if(!inside(rect(e),p)||e.scrollWidth>e.clientWidth+2)violations.push({group:g.className,child:e.className||e.tagName,text:e.textContent.slice(0,60)});}}
    const sums=[...document.querySelectorAll("#view .amount-digits")].filter(visible);for(const e of sums){if(!inside(rect(e),rect(e.parentElement))||e.scrollWidth>e.clientWidth+2)violations.push({group:"amount",text:e.textContent});}
    return {groups:groups.length,amounts:sums.length,overflow:document.documentElement.scrollWidth>innerWidth,violations};
   });
   assert.ok(geometry.groups>0&&!geometry.overflow&&!geometry.violations.length,JSON.stringify({style,width,section,geometry}));
   const file="card-polish-"+style+"-"+width+"-"+i+".png";await page.screenshot({path:join(out,file),fullPage:true,animations:"disabled"});cardMetrics.push({file,style,width,section,...geometry});
  }
 }
 assert.equal(cardMetrics.length,30);
 await writeFile(join(out,"card-polish-metrics.json"),JSON.stringify({engine,scope:"actual synthetic financial entries and live card geometry; physical-device appearance pending",cases:cardMetrics.length,cardMetrics},null,2));
 // RC3.25: exercise all palette/mode/finish combinations on actual entry controls.
 const typography=await context.newPage();const contrastMetrics=[];
 try{
  await typography.setViewportSize({width:390,height:844});await typography.emulateMedia({reducedMotion:"reduce"});
  await typography.goto("http://127.0.0.1:"+server.address().port+"/app/index.html");
  await typography.locator("#quickIncome").click();
  await typography.locator("#incomeSourceChoices [data-choice=salary]").click();
  const themes=await typography.locator("#theme option").evaluateAll(xs=>xs.map(x=>x.value));assert.equal(themes.length,12);
  for(const style of ["original","glass","android","paper","mono"])for(const theme of themes)for(const mode of ["light","dark"]){
   // Deliberately apply presentation attributes directly in this isolated page to test computed CSS, not settings persistence.
   const result=await typography.evaluate(({style,theme,mode})=>{
    Object.assign(document.documentElement.dataset,{layout:"classic",style,theme,mode,font:"tajawal"});
    const canvas=document.createElement("canvas");canvas.width=canvas.height=1;const ctx=canvas.getContext("2d",{willReadFrequently:true});
    function rgb(c){ctx.clearRect(0,0,1,1);ctx.fillStyle="#000";ctx.fillStyle=c;ctx.fillRect(0,0,1,1);return Array.from(ctx.getImageData(0,0,1,1).data);}
    const lum=a=>a.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
    const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
    function contrast(e){const s=getComputedStyle(e),fg=rgb(s.color),colors=s.backgroundImage==="none"?[s.backgroundColor]:(s.backgroundImage.match(/rgba?\([^)]*\)/g)??[]),bg=colors.map(rgb);return {sampled:bg.length,opaque:fg[3]===255&&bg.every(c=>c[3]===255),minimum:bg.length?Math.min(...bg.map(c=>ratio(fg,c))):0};}
    const selected=document.querySelector("#incomeSourceChoices [aria-pressed=true]"),ordinary=document.querySelector("#incomeSourceChoices [aria-pressed=false]"),submit=document.getElementById("submitOperation"),mark=getComputedStyle(selected,"::after");
    return {selected:contrast(selected),ordinary:contrast(ordinary),submit:contrast(submit),checkVisible:mark.display!=="none"&&mark.content.includes("✓"),inputFont:parseFloat(getComputedStyle(document.getElementById("note")).fontSize)};
   },{style,theme,mode});
   assert.ok(result.checkVisible&&result.inputFont>=16,JSON.stringify({style,theme,mode,result}));
   for(const key of ["selected","ordinary","submit"])assert.ok(result[key].sampled>0&&result[key].opaque&&result[key].minimum>=4.5,JSON.stringify({style,theme,mode,key,result}));
   contrastMetrics.push({style,theme,mode,...result});
  }
  for(const [font,family] of [["tajawal","Masarifi Tajawal"],["cairo","Masarifi Cairo"],["plex","Masarifi Plex"],["system","system-ui"]]){
   const result=await typography.evaluate(async({font,family})=>{document.documentElement.dataset.font=font;await document.fonts.ready;return {family:getComputedStyle(document.getElementById("note")).fontFamily,loaded:font==="system"||((await document.fonts.load('400 16px "'+family+'"',"مصاريف")).length>0)};},{font,family});
   assert.ok(result.family.includes(family)&&result.loaded,JSON.stringify(result));
  }
  assert.equal(contrastMetrics.length,120);await writeFile(join(out,"typography-contrast-metrics.json"),JSON.stringify({engine,scope:"computed CSS solid colors and action gradient endpoints only; not full WCAG certification or physical iPhone",cases:contrastMetrics.length,contrastMetrics},null,2));
 }finally{await typography.close();}
 // RC3.26: repeat real navigation and modal actions with every motion preference.
 const motionPage=await context.newPage();const motionMetrics=[];
 try{
  await motionPage.setViewportSize({width:390,height:844});
  await motionPage.goto("http://127.0.0.1:"+server.address().port+"/app/index.html");
  await motionPage.emulateMedia({reducedMotion:"no-preference"});
  for(const reduced of ["no-preference","reduce"])for(const motion of ["ios","quick","spring","off"]){
   await motionPage.emulateMedia({reducedMotion:reduced});
   await choose(motionPage,"motion",motion);await motionPage.locator("#closeSettings").click();
   for(let cycle=0;cycle<5;cycle++){
    const start=Date.now();
    await motionPage.locator('#nav [data-section="reports"]').click();
    const viewEffects=await motionPage.locator("#view").evaluate(e=>e.getAnimations().map(a=>({duration:Number(a.effect?.getTiming().duration),frames:a.effect?.getKeyframes()})));
    if(reduced==="reduce"||motion==="off")assert.equal(viewEffects.length,0);
    else for(const a of viewEffects){assert.ok(a.duration<=220);assert.ok(a.frames.every(f=>!f.transform));}
    await motionPage.locator('#nav [data-section="overview"]').click();
    await motionPage.locator("#quickIncome").click();const d=motionPage.locator("#entryDialog");
    assert.equal(await d.evaluate(e=>e.open),true);
    const sheetEffects=await d.evaluate(e=>e.getAnimations().map(a=>({duration:Number(a.effect?.getTiming().duration),frames:a.effect?.getKeyframes()})));
    if(reduced==="reduce"||motion==="off")assert.equal(sheetEffects.length,0);
    else for(const a of sheetEffects){assert.ok(a.duration<=220);assert.ok(a.frames.every(f=>!f.transform));}
    await d.locator("#closeEditor").click();assert.equal(await d.evaluate(e=>e.open),false);
    await motionPage.locator("#quickExpense").click();assert.equal(await d.evaluate(e=>e.open),true);
    await d.locator("#closeEditor").click();assert.equal(await d.evaluate(e=>e.open),false);
    assert.equal(await motionPage.locator("#view").evaluate(e=>e.getAnimations().length),0);
    motionMetrics.push({motion,reduced,cycle:cycle+1,elapsedMs:Date.now()-start,viewEffects:viewEffects.length,sheetEffects:sheetEffects.length});
   }
  }
  assert.equal(motionMetrics.length,40);
  await writeFile(join(out,"motion-polish-metrics.json"),JSON.stringify({engine,scope:"real Playwright clicks and animation contracts; elapsed time includes automation overhead, not device FPS or touch latency",cases:motionMetrics.length,motionMetrics},null,2));
 }finally{await motionPage.close();}
 // Final mobile witness: iPhone viewport, DPR, touch and mobile context, not real iOS hardware.
 const mobileMetrics=[];
 const mobile=await browser.newContext({...devices["iPhone 13"],defaultBrowserType:undefined});
 try{
  const phone=await mobile.newPage();
  phone.on("pageerror",e=>errors.push(String(e)));
  await phone.goto("http://127.0.0.1:"+server.address().port+"/app/index.html");
  assert.equal(await phone.evaluate(()=>navigator.maxTouchPoints>0),true);
  for(const mode of ["light","dark"]){
   await choose(phone,"mode",mode);await phone.locator("#closeSettings").tap();
   for(const direction of ["Income","Expense"]){
    await phone.locator("#quick"+direction).tap();
    const d=phone.locator("#entryDialog");assert.equal(await d.evaluate(e=>e.open),true);
    await d.locator("#amt").fill(direction==="Income"?"123.45":"12.34");
    if(direction==="Expense")await d.locator("#categoryChoices [data-choice=food]").tap();
    await d.locator("#date").fill("2026-11-25");
    const note="اختبار لمس نهائي "+mode+" "+direction;
    await d.locator("#note").fill(note);
    const geometry=await d.evaluate(root=>{const a=root.querySelector("#date").getBoundingClientRect(),b=root.querySelector("#accountId").getBoundingClientRect();return {gap:b.top-a.bottom,sameWidth:Math.abs(a.width-b.width)<=1,overflow:root.scrollWidth>root.clientWidth+1,touch:navigator.maxTouchPoints,viewport:innerWidth,dpr:devicePixelRatio};});
    assert.ok(geometry.gap>=8&&geometry.sameWidth&&!geometry.overflow,JSON.stringify(geometry));
    await d.locator("#accountId").scrollIntoViewIfNeeded();
    const file="iphone13-touch-"+mode+"-"+direction.toLowerCase()+".png";await phone.screenshot({path:join(out,file),animations:"disabled"});
    await d.locator("#submitOperation").tap();assert.equal(await d.evaluate(e=>e.open),false);
    await phone.locator("#entryNotice").getByText(/تم التنفيذ/).waitFor();
    await phone.locator("#view").getByText(note,{exact:true}).waitFor();
    mobileMetrics.push({file,mode,direction,...geometry,saved:true});
   }
  }
  assert.equal(mobileMetrics.length,4);
  await writeFile(join(out,"iphone-touch-metrics.json"),JSON.stringify({engine,scope:"Playwright iPhone 13 mobile emulation; native iOS date picker paint and actual device not verified",cases:mobileMetrics.length,mobileMetrics},null,2));
 }finally{await mobile.close();}
 // Final focused witness: long amounts stay within their cards at narrow width, without altering engine data.
 const narrow=await context.newPage();
 try{
  await narrow.setViewportSize({width:320,height:568});
  await narrow.emulateMedia({reducedMotion:"reduce"});
  await narrow.goto("http://127.0.0.1:"+server.address().port+"/app/index.html");
  await narrow.evaluate(()=>document.fonts.ready);
  const result=await narrow.evaluate(()=>{
   const root=document.createElement("section");root.className="finance-card";
   const header=document.createElement("div");header.className="finance-card-head";
   const icon=document.createElement("span");icon.className="choice-icon";
   const title=document.createElement("div");title.className="finance-card-title";title.textContent="التزام تجريبي طويل لاختبار التفاف النص";
   const value=document.createElement("span");value.className="finance-value amount-label";const digits=document.createElement("span");digits.className="amount-digits";digits.textContent="123,456,789.99";value.append(digits);
   header.append(icon,title,value);root.append(header);document.getElementById("view").append(root);
   const r=root.getBoundingClientRect(),v=value.getBoundingClientRect(),d=digits.getBoundingClientRect();const result={inside:v.left>=r.left-.5&&v.right<=r.right+.5&&d.left>=r.left-.5&&d.right<=r.right+.5,overflow:document.documentElement.scrollWidth>innerWidth};root.remove();return result;
  });
  assert.equal(result.inside,true,"long amount exceeds narrow card");assert.equal(result.overflow,false,"long amount creates horizontal overflow");
  await narrow.locator("#quickExpense").click();assert.equal(await narrow.locator("#entryDialog").evaluate(e=>e.getAnimations().length),0,"reduced motion must disable sheet animation");await narrow.locator("#closeEditor").click();
 }finally{await narrow.close();}
 await writeFile(join(out,"metrics.json"),JSON.stringify({engine,version:manifest.version,scope:"synthetic data; five finishes, default palette geometry plus six new palette images; not physical device or manual visual approval",screens:metrics.length,errors,metrics},null,2));
 assert.equal(metrics.length,372);assert.deepEqual(errors,[]);assert.ok(metrics.every(x=>!x.overflow&&!x.unlabelled&&!x.shortControls.length),"visual geometry or accessible name regression");
 console.log("Visual witnesses: "+metrics.length+" PNG screenshots, no measured horizontal overflow, unnamed controls or controls below 44 CSS px height.");
 await context.close();
}finally{if(browser)await browser.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await rm(root,{recursive:true,force:true});}
