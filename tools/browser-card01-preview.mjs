import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const {chromium}=createRequire(path.join(process.env.APPDATA,'npm/node_modules/@playwright/cli/package.json'))('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const url='http://127.0.0.1:4180/preview-card-01.html';
const seek=async time=>page.locator('#time').evaluate((e,value)=>{e.value=String(value);e.dispatchEvent(new Event('input',{bubbles:true}));},time);
fs.mkdirSync('tmp',{recursive:true});fs.mkdirSync('outputs',{recursive:true});
try{
 for(const width of [320,390,768,1280]){
  await page.setViewportSize({width,height:900});await page.goto(url);await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('.stage .prop').count(),5);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await seek(0);assert.equal(await page.locator('.name-label').evaluate(e=>getComputedStyle(e).opacity),'0');
  await seek(1600);
  const state=await page.locator('.stage').evaluate(e=>({times:e.getAnimations({subtree:true}).map(a=>a.currentTime),opacity:getComputedStyle(e.querySelector('.name-label')).opacity}));
  assert.equal(state.opacity,'1');assert.ok(state.times.every(t=>Math.abs(t-1600)<1));
  assert.equal(await page.locator('#time').inputValue(),'1600');assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'false');
  if(width===390||width===1280)await page.screenshot({path:`outputs/card01-preview-${width}.png`,fullPage:true});
 }
 await page.locator('#restart').click();await page.waitForTimeout(100);assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'true');
 assert.ok(await page.locator('.stage').evaluate(e=>e.getAnimations({subtree:true}).every(a=>a.playState==='running')));
 await page.locator('#play').click();assert.ok(await page.locator('.stage').evaluate(e=>e.getAnimations({subtree:true}).every(a=>a.playState==='paused')));
 await page.locator('.comparison summary').click();await page.locator('.comparison img').evaluate(e=>e.decode());
 assert.equal(await page.locator('.comparison img').evaluate(e=>e.naturalWidth),1400);
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();
 assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'false');
 assert.ok(await page.locator('.stage').evaluate(e=>e.getAnimations({subtree:true}).every(a=>a.playState==='paused')));
 assert.deepEqual(errors,[]);
 console.log('PASS:4viewportlayouts;five4.96sanimations;seek/pause/restart;sourcecomparison;reducedmotion;noJSerrors.');
}finally{await browser.close();}
