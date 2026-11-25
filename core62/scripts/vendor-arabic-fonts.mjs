#!/usr/bin/env node
// Pinned upstream Git objects from google/fonts, each independently verified.
// Build-time only. Never downloaded by the app from a third-party host.
import {execFileSync} from "node:child_process";
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {createHash} from "node:crypto";
const entries=[
  [
    "Tajawal-Regular.ttf",
    "d23d25b8b68db86d5b727d181c2008fd874216eb",
    60364
  ],
  [
    "Tajawal-Bold.ttf",
    "71e1488e90215abcc8aedc541d94a2bcbec574f3",
    59988
  ],
  [
    "Cairo-Variable.ttf",
    "25641b1c828857698457bcd9f5a102616b4e8033",
    599548
  ],
  [
    "IBMPlexSansArabic-Regular.ttf",
    "e779068718b9801b809605b2bf3067121cce524c",
    235924
  ],
  [
    "IBMPlexSansArabic-Bold.ttf",
    "211ff62d8d1778bff69a1b3a906b2ad1686564bc",
    246992
  ],
  [
    "Tajawal-OFL.txt",
    "76c01b50a1da8b3ae44a6f05c2e0d6ccb1cac5b9",
    4464
  ],
  [
    "Cairo-OFL.txt",
    "f6e87d489b3f459dde4e0f457fdd63e1f39bfe67",
    4473
  ],
  [
    "IBMPlexSansArabic-OFL.txt",
    "c35c4c618fab33da8695177b3a6cefe0810b7b28",
    4456
  ]
];
mkdirSync("core62/app",{recursive:true});
for(const [name,sha,size] of entries){
 const data=JSON.parse(execFileSync("curl",["--fail","--silent","--show-error","--retry","2","--max-time","60","-H","Accept: application/vnd.github+json","https://api.github.com/repos/google/fonts/git/blobs/"+sha],{maxBuffer:4*1024*1024}));
 if(data.encoding!=="base64"||data.sha!==sha)throw Error("wrong upstream object "+name);
 const bytes=Buffer.from(data.content,"base64"),actual=createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex");
 if(bytes.length!==size||actual!==sha)throw Error("font integrity "+name);
 if(name.endsWith(".txt")&&!bytes.toString("utf8").includes("SIL OPEN FONT LICENSE"))throw Error("license "+name);
 writeFileSync("core62/app/"+name,bytes);console.log(name+" "+size+" "+actual);
}
