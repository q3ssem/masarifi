import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile,mkdir,mkdtemp,rm,writeFile} from "node:fs/promises";
import {join,resolve,extname} from "node:path";
import {tmpdir} from "node:os";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {webkit} from "playwright";
const root=await mkdtemp(join(tmpdir(),"masarifi-identity-")),dist=join(root,"candidate"),out=resolve("dist/identity-comparison");
await mkdir(out,{recursive:true});
let browser,server;
try{
 const legacy=execFileSync("git",["show","b6b03894d2ebf166d0e255b8587859a3bd12aedf:index.html"],{maxBuffer:4*1024*1024});
 assert.equal(createHash("sha1").update("blob "+legacy.length+"\0").update(legacy).digest("hex"),"9afcb093cf9de98c25a3f32fc4beba67ee81ebf2");
 execFileSync(process.execPath,["core62/scripts/build-clean-release.mjs",dist],{stdio:"inherit"});
 const manifest=JSON.parse(await readFile(join(dist,"build-manifest.json"),"utf8")),files=new Map(await Promise.all(manifest.assets.map(async a=>["/"+a.path,await readFile(join(dist,a.path))])));
 files.set("/legacy/index.html",legacy);
 const mime={".html":"text/html;charset=utf-8",".mjs":"text/javascript;charset=utf-8",".css":"text/css;charset=utf-8",".ttf":"font/ttf",".png":"image/png",".webmanifest":"application/manifest+json",".txt":"text/plain"};
 server=createServer((req,res)=>{const b=files.get(req.url);if(!b){res.writeHead(404);res.end();return;}res.writeHead(200,{"content-type":mime[extname(req.url)]});res.end(b);});
 await new Promise(r=>server.listen(0,"127.0.0.1",r));const origin="http://127.0.0.1:"+server.address().port;
 browser=await webkit.launch({headless:true});
 const date=new Date().toISOString().slice(0,10),contextOptions={viewport:{width:390,height:844},deviceScaleFactor:1,serviceWorkers:"block",reducedMotion:"reduce"};
 const old=await browser.newContext(contextOptions),modern=await browser.newContext(contextOptions);
 // Isolate both sessions. Legacy source is immutable; substitute its Google font request with the exact local Tajawal font files solely for comparable rendering.
 await old.route("**/*",async route=>{const u=route.request().url();if(u.startsWith("https://fonts.googleapis.com/"))return route.fulfill({contentType:"text/css",headers:{"Access-Control-Allow-Origin":"*"},body:'@font-face{font-family:Tajawal;src:url("'+origin+'/app/Tajawal-Regular.ttf");font-weight:400}@font-face{font-family:Tajawal;src:url("'+origin+'/app/Tajawal-Bold.ttf");font-weight:700}'});if(!u.startsWith(origin+"/"))return route.abort();return route.continue();});
 await old.addInitScript(date=>{localStorage.setItem("masarifi.has","1");localStorage.setItem("masarifi.theme",JSON.stringify({design:"clean",font:"Tajawal",pal:"reef6181",motion:"off",icons:"flat",dark:"off",glass:"off"}));localStorage.setItem("masarifi.v2",JSON.stringify({expenses:[{id:"e_witness",amount:125,cat:"food",note:"مصروف تجريبي",date,ts:1}],incomes:[{id:"n_witness",amount:5000,src:"salary",note:"دخل تجريبي",date,ts:1}],insts:[],debts:[],goals:[],fixeds:[],budget:0,cats:null,cbud:{},rates:{},prefs:{},audit59:[]}));},date);
 const a=await old.newPage(),b=await modern.newPage();await a.goto(origin+"/legacy/index.html");await a.locator("#view .hero").waitFor({timeout:30000});await a.evaluate(()=>document.fonts.ready);
 await b.goto(origin+"/app/index.html");await b.evaluate(()=>document.fonts.ready);
 for(const [id,amt,note,choice,group] of [["quickIncome","5000","دخل تجريبي","salary","incomeSource"],["quickExpense","125","مصروف تجريبي","food","category"]]){await b.locator("#"+id).click();await b.locator("#amt").fill(amt);await b.locator("#"+group+"Choices [data-choice="+JSON.stringify(choice)+"]").click();await b.locator("#date").fill(date);await b.locator("#note").fill(note);await b.locator("#submitOperation").click();await b.locator("#entryNotice").getByText(/تم التنفيذ/).waitFor();}
 async function shot(p,name){await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:join(out,name+".png"),animations:"disabled"});}
 await a.evaluate(()=>window.scrollTo(0,0));await b.evaluate(()=>window.scrollTo(0,0));await shot(a,"01-legacy-home");await shot(b,"01-candidate-home");
 for(const [name,legacyAction,newAction] of [["income","income","quickIncome"],["expense","addexp","quickExpense"]]){await a.locator('#view [data-act="'+legacyAction+'"]').click();await a.locator("#sheet").waitFor();await b.locator("#"+newAction).click();await shot(a,"02-legacy-"+name);await shot(b,"02-candidate-"+name);await b.locator("#closeEditor").click();await a.keyboard.press("Escape");if(await a.locator("#scrim").isVisible()){await a.locator("#sheet button[aria-label]").first().click();}await a.locator("#scrim").waitFor({state:"hidden"});}
 await a.locator('#tabs [data-tab="more"]').click();await b.locator("#moreToggle").click();await shot(a,"03-legacy-more");await shot(b,"03-candidate-more");
 await b.locator("#closeMore").click();await a.keyboard.press("Escape");if(await a.locator("#scrim").isVisible())await a.locator("#sheet button[aria-label]").first().click();await a.locator("#scrim").waitFor({state:"hidden"});await a.locator("#openSettings").click();await a.locator("#sheet").waitFor();await b.locator("#openSettings").click();await shot(a,"04-legacy-settings");await shot(b,"04-candidate-settings");
 await writeFile(join(out,"comparison.json"),JSON.stringify({legacy:"b6b03894d2ebf166d0e255b8587859a3bd12aedf",candidate:manifest.version,engine:"WebKit",viewport:[390,844],fixture:"5000 income, 125 expense, synthetic; local Tajawal substituted for legacy remote font request",images:10,approval:"PENDING_OWNER_REVIEW"},null,2));
 await old.close();await modern.close();
}finally{if(browser)await browser.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await rm(root,{recursive:true,force:true});}
