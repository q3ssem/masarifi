var V = 'masarifi-v86';
var CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-180.png'];
var ROOT = new URL('./', self.registration.scope);
var URLS = CORE.map(function(p){return new URL(p,ROOT).href;});
var INDEX = new URL('index.html',ROOT).href;
self.addEventListener('install', function(e){e.waitUntil(caches.open(V).then(function(c){return c.addAll(URLS);}).then(function(){return self.skipWaiting();}));});
self.addEventListener('activate', function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==V&&k.indexOf('masarifi-')===0;}).map(function(k){return caches.delete(k);}));}).then(function(){return self.clients.claim();}));});
self.addEventListener('fetch',function(e){
  var r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||r.headers.has('Authorization')||u.origin!==ROOT.origin||URLS.indexOf(u.href)<0)return;
  if(r.mode==='navigate'){
    if(u.href!==ROOT.href&&u.href!==INDEX)return;
    e.respondWith((async function(){var c=await caches.open(V);try{var res=await fetch(r);if(res.ok&&!res.redirected&&/text\/html/i.test(res.headers.get('Content-Type')||'')){try{await c.put(INDEX,res.clone());}catch(_){}return res;}if(res.status>=500){return (await c.match(INDEX))||res;}return res;}catch(err){return (await c.match(INDEX))||Response.error();}})());return;
  }
  e.respondWith((async function(){var c=await caches.open(V),hit=await c.match(r);if(hit)return hit;try{var res=await fetch(r);if(res.ok&&!res.redirected){try{await c.put(r,res.clone());}catch(_){}}return res;}catch(err){return Response.error();}})());
});
