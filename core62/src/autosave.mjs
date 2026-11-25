// Session-scoped, serialized autosave. No credentials are persisted.
export function createAutosave({capture,save,onStatus=()=>{}}){
 let secret=null,running=null,pending=false,epoch=0;
 const active=()=>secret!==null;
 function stop(){secret=null;pending=false;epoch++;onStatus("OFF");}
 function enable(password){if(typeof password!=="string"||password.length<12||running)throw Error("autosave-contract");secret=password;epoch++;onStatus("ON");}
 function request(){if(!active())return Promise.resolve({status:"OFF"});pending=true;if(running)return running;const token=epoch;
 running=Promise.resolve().then(async()=>{let result={status:"OFF"};while(pending&&active()&&token===epoch){pending=false;const snapshot=capture();onStatus("SAVING");try{result=await save(snapshot,secret);}catch{result={status:"ERROR"};}if(result.status!=="SAVED"){stop();onStatus(result.status);break;}if(token===epoch&&active())onStatus("SAVED");}return result;}).finally(()=>{running=null;});return running;}
 return Object.freeze({enable,stop,request,active,busy:()=>running!==null});
}
