const status=document.getElementById("offlineStatus");
 if("serviceWorker" in navigator&&window.isSecureContext){
  const ready=()=>{status.textContent="ملفات التطبيق جاهزة للعمل دون اتصال. افتح الخزنة المشفرة لاستعادة بياناتك."};
  const controlled=()=>{if(navigator.serviceWorker.controller)ready();};
  navigator.serviceWorker.addEventListener("controllerchange",controlled);
  navigator.serviceWorker.register("./offline-worker.mjs",{scope:"./",updateViaCache:"none"}).then(async()=>{if(navigator.serviceWorker.controller)ready();else status.textContent="جارٍ تجهيز ملفات العمل دون اتصال." ;await navigator.serviceWorker.ready;controlled();}).catch(()=>{status.textContent="تعذر تجهيز العمل دون اتصال.";});
 }else status.textContent="العمل دون اتصال يحتاج اتصال HTTPS أو بيئة محلية آمنة.";
 