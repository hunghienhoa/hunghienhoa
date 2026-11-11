// Optional visual regression: use the existing isolated browser-audit setup, without personal data.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {createApp} from '../server/server.mjs';
const require=createRequire(import.meta.url);
let playwright;
try{playwright=require('playwright');}catch{playwright=createRequire(path.join(process.env.APPDATA,'npm/node_modules/@playwright/cli/package.json'))('playwright');}
const parent=process.platform==='win32'?path.join(process.env.LOCALAPPDATA,'HungHienHoa','audit-data'):os.tmpdir();
fs.mkdirSync(parent,{recursive:true});fs.mkdirSync('tmp',{recursive:true});
const app=createApp({port:0,dataDir:fs.mkdtempSync(path.join(parent,'stickers-'))});
await app.listen();
const origin=process.env.STICKER_AUDIT_ORIGIN||'http://127.0.0.1:'+app.server.address().port;
const browser=await playwright.chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage();
const errors=[],failures=[],report=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(/sticker-atlas|decorative-stickers/.test(r.url())&&r.status()!==200)failures.push([r.url(),r.status()]);});
const pages=process.env.STICKER_AUDIT_ORIGIN?['https://hunghienhoa.com/','https://blog.hunghienhoa.com/','https://photobooth.hunghienhoa.com/']:['/','/blog/','/photobooth/'];
try{
 for(let i=0;i<pages.length;i++)for(const width of [320,390,768,1440,1920]){
  await page.setViewportSize({width,height:900});
  await page.goto(new URL(pages[i],origin).href);await page.evaluate(()=>document.fonts.ready);
  await page.locator('.art-sticker').last().evaluate(e=>e.scrollIntoView({block:'center'}));
  const state=await page.evaluate(()=>{
   const stickers=[...document.querySelectorAll('.art-sticker')].filter(e=>e.getClientRects().length);
   return {width:innerWidth,scroll:document.documentElement.scrollWidth,count:stickers.length,
    bad:stickers.filter(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e),p=getComputedStyle(e,'::before');return r.width<15||r.height<15||parseFloat(p.width)<parseFloat(s.width)*.9||parseFloat(p.height)<parseFloat(s.height)*.9||s.pointerEvents!=='none'||e.getAttribute('aria-hidden')!=='true';}).map(e=>e.className),
    motions:[...new Set(stickers.map(e=>getComputedStyle(e,'::before').animationName))]};
  });
  assert.ok(state.scroll<=width+2,JSON.stringify(state));assert.deepEqual(state.bad,[]);assert.ok(state.motions.length>=3,JSON.stringify(state));report.push({page:i,...state});
  if(width===390||width===1440){
   const targets=i===0?['.hero','.project-grid']:i===1?['.about']:['.frame-showcase'];
   await page.evaluate(()=>document.querySelectorAll('.reveal').forEach(e=>e.classList.add('visible')));
   for(const target of targets){await page.locator(target).evaluate(e=>e.scrollIntoView({block:'center'}));await page.locator(target).screenshot({path:`tmp/stickers-${i}-${width}-${target.slice(1)}.png`,animations:'disabled'});}
  }
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const url of pages){await page.goto(new URL(url,origin).href);assert.equal(await page.locator('.art-sticker').evaluateAll(els=>els.every(e=>getComputedStyle(e,'::before').animationName==='none')),true);}
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 console.log(JSON.stringify({result:'PASS',layouts:report.length,report,errors,failures},null,2));
 fs.writeFileSync('tmp/sticker-browser-results.json',JSON.stringify({report,errors,failures},null,2));
}finally{await browser.close();await app.close();}
