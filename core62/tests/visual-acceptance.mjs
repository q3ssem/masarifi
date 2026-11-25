async function choose(p,id,value){const select=p.locator("#"+id);if(await select.isVisible()){await select.selectOption(value);return;}if(id==="action"){await p.locator("#openOperations").click();await p.locator("#operationDialog [data-operation="+JSON.stringify(value)+"]").click();}else await p.locator("#"+id+"Choices [data-choice="+JSON.stringify(value)+"]").click();}
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile,mkdir,writeFile,mkdtemp,rm} from "node:fs/promises";
import {execFileSync} from "node:child_process";
import {tmpdir} from "node:os";
import {resolve,join,extname} from "node:path";
import {chromium,webkit} from "playwright";
const engine=process.env.BROWSER_ENGINE==="webkit"?"webkit":"chromium",out=resolve("dist/visual-"+engine),root=await mkdtemp(join(tmpdir(),"masarifi-visual-")),dist=join(root,"app-package");
await mkdir(out,{recursive:true});
let browser,server;
try{
 execFileSync(process.execPath,["core62/scripts/build-clean-release.mjs",dist],{stdio:"inherit"});
 const manifest=JSON.parse(await readFile(join(dist,"build-manifest.json"),"utf8"));
 const allowed=new Map(await Promise.all(manifest.assets.map(async a=>["/"+a.path,await readFile(join(dist,a.path))])));
 const mime={".html":"text/html;charset=utf-8",".mjs":"text/javascript;charset=utf-8",".css":"text/css;charset=utf-8",".png":"image/png",".webmanifest":"application/manifest+json"};
 server=createServer((req,res)=>{const body=allowed.get(req.url);if(req.method!=="GET"||!body){res.writeHead(404);res.end();return;}res.writeHead(200,{"content-type":mime[extname(req.url)]});res.end(body);});
 await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await (engine==="webkit"?webkit:chromium).launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});const page=await context.newPage(),errors=[],metrics=[];
 page.on("pageerror",e=>errors.push(String(e)));await page.goto("http://127.0.0.1:"+server.address().port+"/app/index.html");
 const sections=["الرئيسية","الحسابات والحركات","الالتزامات والجدولة","الميزانيات والأهداف","الاستثمارات والثروة","البحث","التقارير والبيانات"];
 async function nav(label){if(await page.locator("html").getAttribute("data-layout")==="classic"&&[sections[1],sections[3],sections[4],sections[5]].includes(label)){if(await page.locator("#moreNav").isHidden())await page.locator("#moreToggle").click();await page.locator("#moreNav").getByRole("button",{name:label,exact:true}).click();}else await page.locator("#nav").getByRole("button",{name:label,exact:true}).click();}
 async function submit(action,fields){await choose(page,"action",action);for(const [id,value] of Object.entries(fields)){const el=page.locator("#"+id);if(await el.evaluate(e=>e.tagName)==="SELECT")await choose(page,id,value);else await el.fill(value);}await page.locator("#form button[type=submit]").click();await page.locator("#message").getByText(/تم التنفيذ/).waitFor();}
 await nav(sections[1]);await submit("account",{name:"محفظة اختبار",initial:"2500"});await submit("record",{direction:"out",amt:"123.45",note:"مصروف تجريبي",category:"food"});await submit("record",{direction:"in",amt:"2500",note:"دخل تجريبي"});
 for(const layout of ["classic","unified"])for(const mode of ["light","dark"]){
  if(await page.locator("#settingsPanel").isHidden())await page.locator("#openSettings").click();
  await page.locator("#layout").selectOption(layout);await page.locator("#mode").selectOption(mode);await page.locator("#openSettings").click();
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
 for(const layout of ["classic","unified"])for(const style of ["glass","android"])for(const mode of ["light","dark"]){
 if(await page.locator("#settingsPanel").isHidden())await page.locator("#openSettings").click();
 await page.locator("#layout").selectOption(layout);await page.locator("#style").selectOption(style);await page.locator("#mode").selectOption(mode);await page.locator("#motion").selectOption("off");await page.locator("#openSettings").click();
 for(const [width,height] of [[320,568],[390,844]]){await page.setViewportSize({width,height});for(const [i,label] of sections.entries()){await nav(label);await page.evaluate(()=>window.scrollTo(0,0));const file=style+"-"+layout+"-"+mode+"-"+width+"x"+height+"-"+(i+1)+".png";await page.screenshot({path:join(out,file),fullPage:true,animations:"disabled"});const checks=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,shortControls:[...document.querySelectorAll("button,input,select,textarea")].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().height<43.5).map(e=>e.id||e.tagName),unlabelled:[...document.querySelectorAll("button,input,select,textarea")].filter(e=>e.getClientRects().length&&!(e.getAttribute("aria-label")||Array.from(e.labels??[]).map(l=>l.textContent).join(" ")||(e.tagName==="BUTTON"?e.textContent:""))?.trim()).length}));metrics.push({file,layout,style,mode,width,height,section:label,...checks});}}
 }
 for(const style of ["original","glass","android"])for(const mode of ["light","dark"]){
 if(await page.locator("#settingsPanel").isHidden())await page.locator("#openSettings").click();await page.locator("#layout").selectOption("classic");await page.locator("#style").selectOption(style);await page.locator("#mode").selectOption(mode);await page.locator("#motion").selectOption("off");await page.locator("#openSettings").click();await page.setViewportSize({width:390,height:844});await nav(sections[0]);await page.locator("#quickExpense").click();for(const kind of ["entry","operations"]){if(kind==="operations"){await page.locator("#closeEditor").click();await nav(sections[1]);await page.locator("#openOperations").click();}const file=style+"-"+mode+"-"+kind+"-sheet.png";await page.screenshot({path:join(out,file),animations:"disabled"});const checks=await page.evaluate(kind=>{const d=document.getElementById(kind==="entry"?"entryDialog":"operationDialog"),r=d.getBoundingClientRect();return {overflow:r.left<0||r.right>innerWidth||d.scrollWidth>d.clientWidth+1,shortControls:[...d.querySelectorAll("button,input,select")].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().height<43.5).map(e=>e.id||e.tagName),unlabelled:[...d.querySelectorAll("button,input,select")].filter(e=>e.getClientRects().length&&!(e.getAttribute("aria-label")||Array.from(e.labels??[]).map(l=>l.textContent).join(" ")||(e.tagName==="BUTTON"?e.textContent:""))?.trim()).length};},kind);metrics.push({file,layout:"classic",style,mode,width:390,height:844,section:kind,...checks});}await page.locator("#closeOperations").click();
 }
 await writeFile(join(out,"metrics.json"),JSON.stringify({engine,version:manifest.version,scope:"synthetic data; default theme, not physical device or manual visual approval",screens:metrics.length,errors,metrics},null,2));
 assert.equal(metrics.length,236);assert.deepEqual(errors,[]);assert.ok(metrics.every(x=>!x.overflow&&!x.unlabelled&&!x.shortControls.length),"visual geometry or accessible name regression");
 console.log("Visual witnesses: "+metrics.length+" PNG screenshots, no measured horizontal overflow, unnamed controls or controls below 44 CSS px height.");
 await context.close();
}finally{if(browser)await browser.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await rm(root,{recursive:true,force:true});}
