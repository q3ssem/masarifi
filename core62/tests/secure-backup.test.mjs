import {webcrypto} from "node:crypto";
import assert from "node:assert/strict";
import {encryptBackup,decryptBackup} from "../src/secure-backup.mjs";
const password="synthetic-only-strong-passphrase",plain='{"arabic":"مصاريف","amountMinor":12345}';
const a=await encryptBackup(webcrypto,plain,password),b=await encryptBackup(webcrypto,plain,password);
assert.equal(await decryptBackup(webcrypto,a,password),plain);
assert.notEqual(a.salt,b.salt);assert.notEqual(a.iv,b.iv);
await assert.rejects(decryptBackup(webcrypto,a,"wrong-password-12345"));
await assert.rejects(decryptBackup(webcrypto,{...a,ciphertext:(a.ciphertext[0]==="0"?"1":"0")+a.ciphertext.slice(1)},password));
await assert.rejects(decryptBackup(webcrypto,{...a,iterations:1},password));
await assert.rejects(encryptBackup(webcrypto,plain,"short"));
console.log("7 crypto assertions passed");

// Exercise more than one hex chunk and preserve v1 interoperability with Node's hex decoder.
const large="مصاريف".repeat(20000),largeEnvelope=await encryptBackup(webcrypto,large,password);
assert.equal(await decryptBackup(webcrypto,largeEnvelope,password),large);
assert.equal(Buffer.from(largeEnvelope.ciphertext,"hex").length,Buffer.byteLength(large)+16);
const keyMaterial=await webcrypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveKey"]);
const externalKey=await webcrypto.subtle.deriveKey({name:"PBKDF2",salt:Buffer.from(largeEnvelope.salt,"hex"),iterations:600000,hash:"SHA-256"},keyMaterial,{name:"AES-GCM",length:256},false,["decrypt"]);
const aad=new TextEncoder().encode("Masarifi62|backup|v1|PBKDF2-SHA256|600000|AES-256-GCM");
const decrypted=await webcrypto.subtle.decrypt({name:"AES-GCM",iv:Buffer.from(largeEnvelope.iv,"hex"),additionalData:aad,tagLength:128},externalKey,Buffer.from(largeEnvelope.ciphertext,"hex"));
assert.equal(new TextDecoder().decode(decrypted),large);
await assert.rejects(decryptBackup(webcrypto,{...largeEnvelope,ciphertext:largeEnvelope.ciphertext.slice(0,-1)},password));
console.log("Large encrypted backup and v1 format compatibility verified.");
