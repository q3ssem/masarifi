import {readFile} from "node:fs/promises";
import {createRuntime} from "./runtime.mjs";
const {MASARIFI_DIST,MASARIFI_DATABASE,MASARIFI_ACCOUNTS_FILE}=process.env;
if(!MASARIFI_DIST||!MASARIFI_DATABASE||!MASARIFI_ACCOUNTS_FILE)throw Error("Required: MASARIFI_DIST, MASARIFI_DATABASE, MASARIFI_ACCOUNTS_FILE");
const server=await createRuntime({dist:MASARIFI_DIST,database:MASARIFI_DATABASE,accounts:JSON.parse(await readFile(MASARIFI_ACCOUNTS_FILE,"utf8"))});
const port=Number(process.env.PORT??8080);if(!Number.isInteger(port)||port<1||port>65535)throw Error("port");
server.listen(port,"127.0.0.1",()=>console.log("Masarifi reference runtime listening on loopback; HTTPS reverse proxy required."));
for(const signal of ["SIGINT","SIGTERM"])process.on(signal,()=>server.close(()=>process.exit(0)));
