// Optional real-browser regression suite. Uses an installed Playwright or @playwright/cli.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../server/server.mjs';
const require=createRequire(import.meta.url);
let playwright;
try {playwright=require('playwright');}
catch {
 const cli=path.join(process.env.APPDATA||'', 'npm/node_modules/@playwright/cli/package.json');
 if(!fs.existsSync(cli))throw new Error('Cần cài Playwright hoặc @playwright/cli để chạy bộ kiểm tra trình duyệt tùy chọn.');
 playwright=createRequire(cli)('playwright');
}
fs.mkdirSync('tmp',{recursive:true});
const parent=process.platform==='win32'?path.join(process.env.LOCALAPPDATA,'HungHienHoa','audit-data'):os.tmpdir();
fs.mkdirSync(parent,{recursive:true});
const dataDir=fs.mkdtempSync(path.join(parent,'browser-'));
const app=createApp({port:0,dataDir});await app.listen();
const origin='http://127.0.0.1:'+app.server.address().port;
const browser=await playwright.chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844}});
const page=await context.newPage();page.setDefaultTimeout(10000);
const errors=[],csp=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'&&/Content Security Policy/.test(m.text()))csp.push(m.text());});
const run=async filename=>(0,eval)('('+fs.readFileSync('tools/'+filename,'utf8')+')')(page);
const report={};
try {
 await page.goto(origin);
 console.log('Checking 63 page/viewport combinations…');
 report.layouts=await run('browser-layout-audit.js');
 assert.deepEqual(report.layouts.failures,[]);assert.deepEqual(report.layouts.errors,[]);
 // Create only a temporary local test account. Never use the production account or data.
 console.log('Checking local admin, post and contribution flows…');
 report.flows=await run('browser-flows-audit.js');
 console.log('Checking mobile/desktop panels…');
 report.panels=await run('browser-panels-audit.js');
 assert.ok(report.panels.every(x=>x.scroll<=x.viewport+2&&!x.overflow.length));
 await page.setViewportSize({width:390,height:844});
 console.log('Checking synthetic camera and JPEG export…');
 report.camera=await run('browser-camera-audit.js');
 const bytes=fs.readFileSync('tmp/audit-strip.jpg');assert.equal(bytes[0],255);assert.equal(bytes[1],216);
 assert.deepEqual(errors,[]);assert.deepEqual(csp,[]);
 report.result='PASS';
 console.log(JSON.stringify({result:report.result,layouts:report.layouts.checks,panels:report.panels.length,flows:report.flows,camera:report.camera},null,2));
} finally {
 report.javascriptErrors=errors;report.cspErrors=csp;
 fs.writeFileSync('tmp/browser-audit-results.json',JSON.stringify(report,null,2));
 await context.close();await browser.close();await app.close();
}
