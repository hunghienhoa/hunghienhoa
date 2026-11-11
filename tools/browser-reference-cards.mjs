// Optional real-browser check for the original animation cards.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const {chromium}=createRequire(path.join(process.env.APPDATA,'npm/node_modules/@playwright/cli/package.json'))('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const origin=process.env.REFERENCE_ORIGIN||'http://127.0.0.1:4180';
const page=await browser.newPage({reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
fs.mkdirSync('tmp',{recursive:true});
let dialogs=0,moving=0;
try{
 for(const width of [320,390,1440]){
  await page.setViewportSize({width,height:900});await page.goto(origin);
  for(let i=0;i<6;i++){
   const button=page.locator('.project-open').nth(i);
   await button.click();
   const image=page.locator('#dialog-art img');await image.evaluate(e=>e.decode());
   const state=await image.evaluate(e=>({src:e.currentSrc,w:e.naturalWidth,h:e.naturalHeight,loading:e.loading}));
   assert.ok(state.src.endsWith('-still.webp'));assert.equal(state.loading,'eager');
   assert.equal(state.w,1400);assert.ok(state.h>0);
   assert.equal(await page.locator('#dialog-art .scene-props').count(),0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
   await page.locator('.dialog-close').click();dialogs++;
  }
  if(width===1440){
   await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';document.querySelectorAll('.reveal').forEach(e=>e.classList.add('visible'));});
   await page.locator('.project-grid').screenshot({path:'tmp/original-reference-cards.png',animations:'disabled'});
  }
 }
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.setViewportSize({width:1200,height:1000});await page.goto(origin);
 for(let i=0;i<6;i++){
  await page.locator('.project-open').nth(i).click();
  const image=page.locator('#dialog-art img');await image.evaluate(e=>e.decode());
  assert.ok(!(await image.evaluate(e=>e.currentSrc)).endsWith('-still.webp'));
  const first=createHash('sha256').update(await image.screenshot({timeout:60000})).digest('hex');
  let changed=false;
  // The source animation includes held frames; sample up to a full 3.6s cycle.
  for(let sample=0;sample<4&&!changed;sample++){
   await page.waitForTimeout(900);
   changed=createHash('sha256').update(await image.screenshot({timeout:60000})).digest('hex')!==first;
  }
  assert.ok(changed,`Card ${i+1} actually animates`);
  await page.locator('.dialog-close').click();moving++;
 }
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'PASS',dialogs,moving,reducedMotionPosters:true,errors}));
}finally{await browser.close();}
