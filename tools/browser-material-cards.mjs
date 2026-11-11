import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const {chromium}=createRequire(path.join(process.env.APPDATA,'npm/node_modules/@playwright/cli/package.json'))('playwright');
const base=process.env.SITE_URL||'http://127.0.0.1:4180';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage();
const errors=[],sources=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>{if(r.url().includes('/reference-cards/card-'))sources.push(r.url());});
fs.mkdirSync('outputs/material-cards',{recursive:true});
const freeze=async phase=>page.locator('#work .material-scene').evaluateAll((scenes,p)=>{
 document.querySelectorAll('.reveal').forEach(e=>e.classList.add('visible'));
 scenes.forEach(e=>e.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=Number(e.dataset.duration)*p;}));
},phase);
try{
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:1000});await page.goto(base+'/#work');await page.evaluate(()=>document.fonts.ready);
  await page.locator('#work').scrollIntoViewIfNeeded();await freeze(.45);
  assert.equal(await page.locator('#work .material-scene').count(),6);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`No overflow at ${width}`);
  const geometry=await page.locator('#work .material-scene').evaluateAll(nodes=>nodes.map(e=>({w:e.clientWidth,h:e.clientHeight,broken:[...e.querySelectorAll('img')].filter(i=>!i.complete||!i.naturalWidth).length})));
  for(const g of geometry){assert.ok(g.w>200);assert.ok(Math.abs(g.w/g.h-1400/826)<.04);assert.equal(g.broken,0);}
  if(width===390||width===1440)await page.locator('#work').screenshot({path:`outputs/material-cards/layout-${width}.png`});
  for(let i=0;i<6;i++){
   await page.locator(`[data-project="${i}"]`).click();
   assert.ok(await page.locator('#project-dialog').evaluate(e=>e.open));
   const g=await page.locator('#dialog-art .material-scene').boundingBox();assert.ok(g.width>150&&g.height>90);
   assert.ok(await page.locator('#project-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
   await page.keyboard.press('Escape');
  }
 }
 await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/#work');await page.evaluate(()=>document.fonts.ready);
 const fixed=['.carton','.silver-mail','.tape-cassette','.record-cover','.paper-pouch','.illustrated-pouch'];
 const bodyGeometry=async()=>Promise.all(fixed.map(s=>page.locator('#work '+s).evaluate(e=>{
  const r=e.getBoundingClientRect(),p=e.closest('.material-scene').getBoundingClientRect();
  return [r.x-p.x,r.y-p.y,r.width,r.height];
 })));
 await freeze(.3);
 const first=await bodyGeometry();
 await freeze(.7);
 const second=await bodyGeometry();
 for(let i=0;i<6;i++)for(let k=0;k<4;k++)assert.ok(Math.abs(first[i][k]-second[i][k])<.1,'Package bodies stay fixed while their own props move');
 await page.locator('[data-project="0"]').hover();
 assert.equal(await page.locator('#work .carton').evaluate(e=>getComputedStyle(e).translate),'none');
 const poses=async()=>page.locator('#work .prop').evaluateAll(nodes=>nodes.map(e=>getComputedStyle(e).transform));
 await freeze(.15);const a=await poses();await freeze(.7);const b=await poses();
 assert.ok(a.filter((p,i)=>p!==b[i]).length>=20,'The scenes have animated props, not static replacement pictures');
 for(const phase of [0,.15,.3,.5,.7,.9]){
  await freeze(phase);
  for(let i=0;i<6;i++)await page.locator('#work .material-scene').nth(i).screenshot({path:`outputs/material-cards/card-${i+1}-phase-${phase}.png`});
 }
 await page.locator('[data-project="0"]').click();await page.locator('.next-project').click();
 assert.ok(await page.locator('#dialog-art .scene-02').count());await page.keyboard.press('Escape');
 await page.locator('[data-filter="illustration"]').click();assert.equal(await page.locator('#work .project:not([hidden])').count(),1);
 await page.locator('[data-filter="all"]').click();assert.equal(await page.locator('#work .project:not([hidden])').count(),6);
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await freeze(.5);
 const reduced=await page.locator('#work .material-scene').evaluateAll(nodes=>nodes.map(e=>({animations:e.getAnimations({subtree:true}).length,props:[...e.querySelectorAll('.prop')].map(p=>({opacity:getComputedStyle(p).opacity,clip:getComputedStyle(p).clipPath}))})));
 for(const r of reduced){assert.equal(r.animations,0);for(const p of r.props){assert.equal(p.opacity,'1');assert.equal(p.clip,'none');}}
 assert.deepEqual(errors,[]);assert.deepEqual(sources,[]);
 console.log('PASS: 4 widths; all 24 card dialogs; next/filter/Escape; 36 motion phase screenshots; static reduced-motion props; no missing images, source GIF requests or JS errors.');
}finally{await browser.close();}
