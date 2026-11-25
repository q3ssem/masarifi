import {createServer} from "node:http";
import {readFile,mkdir,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {chromium,webkit} from "playwright";
import assert from "node:assert/strict";
const engine=process.env.BROWSER_ENGINE==="webkit"?"webkit":"chromium";
const allowed=new Set(["/tests/audit-03-stress.mjs","/src/search.mjs","/src/money.mjs","/src/secure-backup.mjs","/src/autosave.mjs"]);
const server=createServer(async(req,res)=>{try{if(req.method!=="GET")throw Error("method");if(req.url==="/"){res.writeHead(200,{"content-type":"text/html;charset=utf-8"});res.end("<!doctype html><title>Isolated stress witness</title>");return;}if(!allowed.has(req.url))throw Error("path");const content=await readFile(resolve("core62"+req.url));res.writeHead(200,{"content-type":"text/javascript;charset=utf-8"});res.end(content);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,"127.0.0.1",r));let browser;
try{browser=await (engine==="webkit"?webkit:chromium).launch({headless:true});const page=await browser.newPage();const errors=[];page.on("pageerror",e=>errors.push(String(e)));await page.goto("http://127.0.0.1:"+server.address().port+"/");assert.equal(await page.evaluate(()=>isSecureContext),true);const result=await page.evaluate(async()=>{const {runAudit03}=await import("/tests/audit-03-stress.mjs");return runAudit03();});assert.deepEqual(errors,[]);const evidence={engine,scope:"isolated production modules; synthetic rows and mocked save; not physical device or full app",...result};await mkdir("dist/audit-03",{recursive:true});await writeFile("dist/audit-03/"+engine+".json",JSON.stringify(evidence,null,2)+"\n");console.log(JSON.stringify(evidence,null,2));}finally{if(browser)await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
