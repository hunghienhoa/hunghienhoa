import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {createApp} from '../server/server.mjs';
const {chromium}=createRequire(path.join(process.env.APPDATA,'npm/node_modules/@playwright/cli/package.json'))('playwright');
let app,directory,base=process.env.SITE_URL?.replace(/\/$/,'');
if(!base){
 directory=fs.mkdtempSync(path.join(os.tmpdir(),'hung-adsense-browser-'));
 app=createApp({port:0,dataDir:directory});await app.listen();
 const publicPosts=(await (await fetch('https://blog.hunghienhoa.com/api/posts')).json()).posts;
 app.db.prepare('DELETE FROM posts').run();
 for(const p of publicPosts){const cover=p.coverUrl?Buffer.from(await (await fetch(new URL(p.coverUrl,'https://blog.hunghienhoa.com'))).arrayBuffer()):null;
  app.db.prepare('INSERT INTO posts(id,slug,title,excerpt,content,category,tags,status,is_sample,cover,created_at,published_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(p.id,p.slug,p.title,p.excerpt,p.content,p.category,JSON.stringify(p.tags),'published',0,cover,p.publishedAt,p.publishedAt);
 }
 base=`http://127.0.0.1:${app.server.address().port}`;
}
const local=base.includes('127.0.0.1');
const blog=local?base+'/blog':base.replace('://hunghienhoa.com','://blog.hunghienhoa.com');
const photo=local?base+'/photobooth':base.replace('://hunghienhoa.com','://photobooth.hunghienhoa.com');
const posts=(await (await fetch((local?base:blog)+'/api/posts')).json()).posts;
const first=posts[0];assert.ok(first);
fs.mkdirSync('outputs/adsense-readiness',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],ads=[];
try{
 for(const javaScriptEnabled of [false,true])for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900},javaScriptEnabled,locale:'vi-VN'});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/adsbygoogle|googlesyndication/.test(r.url()))ads.push(r.url());});
  for(const [name,url] of [['main',base+'/'],['blog',blog+'/'],['article',blog+'/?bai='+first.slug],['photobooth',photo+'/'],['shoot',photo+'/shoot']]){
   const response=await page.goto(url,{waitUntil:'networkidle'});assert.equal(response.status(),200,url);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${name} overflow at ${width}, JS ${javaScriptEnabled}`);
   if(name==='blog'){assert.ok(await page.locator('a[href*="?bai="]').count()>=posts.length);assert.ok(await page.getByRole('link',{name:'Về portfolio của Hùng'}).isVisible());}
   if(name==='article'){assert.ok(await page.locator('#article').isVisible());assert.ok((await page.locator('#article-body').innerText()).length>100);assert.ok((await page.title()).includes(first.title));assert.equal(await page.locator('meta[name="description"]').getAttribute('content'),first.excerpt);}
   if(name==='shoot'){assert.ok(await page.locator('h1#studio-title').isVisible());assert.equal(await page.locator('video').evaluate(e=>!!e.srcObject),false);}
   if(width===390)await page.screenshot({path:`outputs/adsense-readiness/${name}-js-${javaScriptEnabled}.png`});
  }
  const invalid=await page.goto(blog+'/?bai=__not-published');assert.equal(invalid.status(),404);assert.ok(await page.getByRole('heading',{name:'404 — Không tìm thấy trang'}).isVisible());
  await page.goto(blog+'/',{waitUntil:'networkidle'});
  if(javaScriptEnabled){await page.locator('#search').fill(first.title.slice(0,18));await page.locator('.post-card').first().click();await page.waitForURL('**/?bai=*');assert.ok(await page.locator('#article').isVisible());await page.locator('#back-list').click();await page.waitForURL('**/#bai-viet');assert.ok(await page.locator('#bai-viet').isVisible());}
  await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(ads,[]);
 console.log('PASS:20 PC/mobile JS-on/off page layouts, server-rendered article/listing, native article/back navigation,4true404s, no overflow/JSerrors/adrequests or auto-camera.');
}finally{
 await browser.close();if(app){await app.close();assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep+'hung-adsense-browser-'));fs.rmSync(directory,{recursive:true,force:true});}
}
