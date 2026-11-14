import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createApp} from '../server/server.mjs';
const {chromium}=createRequire(path.join(process.env.APPDATA,'npm/node_modules/@playwright/cli/package.json'))('playwright');
const live=process.env.SITE_URL,folder=live?null:fs.mkdtempSync(path.join(os.tmpdir(),'hung-snaptik-ui-'));
const url='https://www.tiktok.com/@hungvlog1992/video/7697962664923778325';
const mock={code:0,data:{id:'7697962664923778325',title:'Một chút hay <script>window.bad=true</script>',author:{nickname:'Hùng'},duration:61,play:'https://v16.tiktokcdn-us.com/test.mp4',music:'https://v16.tiktokcdn-us.com/test.mp3',images:['https://p19.tiktokcdn-us.com/test.webp']}};
const mp4=Buffer.concat([Buffer.from('000000206674797069736f6d','hex'),Buffer.alloc(50)]);
let app;if(!live){app=createApp({port:0,dataDir:folder,videoFetch:async input=>String(input).includes('/api/')?Response.json(mock):new Response(String(input).endsWith('.webp')?fs.readFileSync('server/fixtures/frame.webp'):mp4,{headers:{'Content-Type':String(input).endsWith('.webp')?'image/webp':'video/mp4'}})});await app.listen();}
const base=live||'http://127.0.0.1:'+app.server.address().port+'/snaptik';
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];fs.mkdirSync('outputs/snaptik',{recursive:true});
try{
 for(const width of [320,390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:1000},acceptDownloads:true});page.on('pageerror',e=>errors.push(e.message));const r=await page.goto(base+'/',{waitUntil:'networkidle'});assert.equal(r.status(),200);
  assert.ok(await page.locator('h1').isVisible());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal(await page.locator('.social-link').count(),7);
  await page.evaluate(()=>document.fonts.ready);assert.ok(await page.evaluate(()=>document.fonts.check('700 16px "Be Vietnam Pro"')));
  if([390,1440].includes(width))await page.screenshot({path:`outputs/snaptik/hero-${width}.png`});
  await page.locator('#video-url').fill('https://evil.test/private');await page.locator('#resolve').click();assert.ok(await page.locator('#status[data-error=true]').isVisible());
  await page.locator('#video-url').fill(url);await page.locator('#resolve').click();await page.locator('#tai-video').waitFor({state:'visible',timeout:35000});
  assert.ok((await page.locator('#formats a').count())>=1);assert.equal(await page.evaluate(()=>window.bad),undefined);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(width===390){await page.screenshot({path:'outputs/snaptik/mobile-result.png',fullPage:true});if(!live){const event=page.waitForEvent('download');await page.locator('#image-downloads button').first().click();const download=await event,where=await download.path();assert.match(download.suggestedFilename(),/\.jpg$/);assert.equal(fs.readFileSync(where).subarray(0,2).toString('hex'),'ffd8');}}
  if(width===1440)await page.screenshot({path:'outputs/snaptik/desktop-result.png',fullPage:true});
  await page.locator('#clear').click();assert.equal(await page.locator('#tai-video').isVisible(),false);assert.equal(await page.locator('#video-url').inputValue(),'');
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.ribbon>div').evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.close();
 }
 assert.deepEqual(errors,[]);console.log('PASS: SnapTik at 320/390/768/1440, invalid URLs, real/mocked resolve, safe text, result/reset, seven social links, reduced motion, no overflow or JS errors; local image export is genuine JPEG.');
}finally{await browser.close();if(app){await app.close();assert.ok(folder.startsWith(path.join(os.tmpdir(),'hung-snaptik-ui-')));fs.rmSync(folder,{recursive:true,force:true});}}
