import {runAudit03} from "./audit-03-stress.mjs";
import {mkdir,writeFile} from "node:fs/promises";
const result={runtime:process.version,scope:"isolated production modules; synthetic search rows and mocked save; no device or IndexedDB claim",...await runAudit03()};
await mkdir("dist/audit-03",{recursive:true});await writeFile("dist/audit-03/node.json",JSON.stringify(result,null,2)+"\n");console.log(JSON.stringify(result,null,2));
