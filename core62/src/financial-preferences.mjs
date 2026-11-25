// Known no-op defaults in the actual 61.8.1 exported preference schema.
// Equality is exact and key-order independent; active features and unknown fields remain blocked.
const defaults=Object.freeze({pb:[],sx:[],wl:[],kk:{},nw:{a:[],h:{}},em:{},rc:{a:0,d:"",ts:0,h:[]},sf:[],ro:"",cr:{},hw:0,hs:{order:["list","inc","cats"],hide:[]},ao:[],mc:{},ru:{on:false,st:5,g:"",ts:0,t:0},ef:{m:0,g:""},rm:{a:{}},ut:[],q617:[]});
function equal(a,b){if(a===b)return true;if(!a||!b||typeof a!=="object"||typeof b!=="object"||Array.isArray(a)!==Array.isArray(b))return false;const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(k=>Object.hasOwn(b,k)&&equal(a[k],b[k]));}
export function isDefaultPreference(key,value){return Object.hasOwn(defaults,key)&&equal(value,defaults[key]);}
export function validFinancialPreferences(p){return !!p&&Object.keys(p).length===2&&Number.isInteger(p.payday)&&p.payday>=0&&p.payday<=28&&Number.isInteger(p.savingsTargetBps)&&p.savingsTargetBps>=0&&p.savingsTargetBps<=9000;}
