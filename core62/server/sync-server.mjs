import {createServer} from "node:http";
import {syncHeadTransition} from "../src/journal-sync.mjs";
// Reference adapter: injected authentication and atomic account store required.
// In-memory implementation is for integration testing only, not production.
export function createMemoryVaults(){const m=new Map();return {read:uid=>m.get(uid)??{revision:0,envelope:null,lastOp:null},cas:(uid,request)=>{const out=syncHeadTransition(m.get(uid),request);if(out.next)m.set(uid,out.next);const {next,...reply}=out;return reply;}};}
export function createSyncServer({authenticate,store}){if(typeof authenticate!=="function"||!store)throw Error("server-contract");return createServer(async(req,res)=>{
 const send=(code,data)=>{res.writeHead(code,{"content-type":"application/json","cache-control":"no-store","x-content-type-options":"nosniff"});res.end(JSON.stringify(data));};
 try{if(req.url!=="/v1/vault"||!["GET","PUT"].includes(req.method))return send(404,{status:"NOT_FOUND"});const uid=await authenticate(req.headers.authorization);if(typeof uid!=="string"||!uid||uid.length>200)return send(401,{status:"UNAUTHORIZED"});
 if(req.method==="GET"){const h=await store.read(uid);return send(200,{revision:h.revision,envelope:h.envelope});}
 if(!/^application\/json(?:;|$)/i.test(req.headers["content-type"]??""))return send(415,{status:"BLOCKED"});let size=0;const parts=[];for await(const part of req){size+=part.length;if(size>35*1024*1024){req.destroy();return;}parts.push(part);}let data;try{data=JSON.parse(Buffer.concat(parts).toString("utf8"));}catch{return send(400,{status:"BLOCKED"});}
 const out=await store.cas(uid,data);return send(out.status==="ACK"?200:out.status==="CONFLICT"?409:400,out);
 }catch{if(!res.headersSent)send(500,{status:"ERROR"});else res.end();}
 });}
