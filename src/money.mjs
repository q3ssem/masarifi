// Masarifi 62 — exact monetary contract (SAR halalah).
const MAX=BigInt(Number.MAX_SAFE_INTEGER);
export function safeMinor(n){if(typeof n!=="bigint"||n>MAX||n< -MAX)throw new RangeError("minor-overflow");return Number(n);}
export function minorFromDecimal(value){if(typeof value!=="string"||!/^-?(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value)||value.length>22)throw new TypeError("decimal-format");const neg=value.startsWith("-"),[whole,frac=""]=value.replace(/^-/,"").split(".");return safeMinor((neg?-1n:1n)*(BigInt(whole)*100n+BigInt(frac.padEnd(2,"0"))));}
export function isDate(d){if(typeof d!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(d))return false;const [y,m,day]=d.split("-").map(Number);if(y<1||m<1||m>12)return false;const leap=y%4===0&&(y%100!==0||y%400===0);return day>=1&&day<=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][m-1];}
