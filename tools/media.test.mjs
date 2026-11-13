import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../server/server.mjs';
import {articleBlocks} from '../dist/blog/core.mjs';
import {defaultSite,siteSettings,mediaAsset} from '../server/validation.mjs';
const bytes=fs.readFileSync('server/fixtures/frame.webp'),imageDataUrl='data:image/webp;base64,'+bytes.toString('base64');
test('only uploaded local images become article blocks and validated site settings',()=>{
 const url='/api/media/12345678-1234-1234-1234-123456789abc.webp';
 assert.deepEqual(articleBlocks('Trước\n\n![Chú thích]('+url+')\n\nSau').map(b=>b.type),['p','image','p']);
 for(const src of ['javascript:alert(1)','https://evil.test/a.png','data:image/svg+xml,hello'])assert.ok(!articleBlocks('![x]('+src+')').some(b=>b.type==='image'));
 assert.equal(siteSettings({...defaultSite,pageImages:{about:url}}).pageImages.about,url);
 assert.throws(()=>siteSettings({...defaultSite,pageImages:{about:'https://evil.test/a.png'}}),{status:400});
 assert.throws(()=>mediaAsset({scope:'private',imageDataUrl}),{status:400});
 assert.throws(()=>mediaAsset({scope:'site',imageDataUrl:'data:image/webp;base64,AAAA'}),{status:400});
});
test('media remains private until referenced by a published post or saved site image',async()=>{
 const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'hung-media-test-')),app=createApp({port:0,dataDir});await app.listen();
 const base='http://127.0.0.1:'+app.server.address().port;let cookie='',csrf='';
 const call=(url,body,method=body?'POST':'GET',anonymous=false)=>fetch(base+url,{method,headers:{Origin:base,'Content-Type':'application/json',...(anonymous?{}:{Cookie:cookie,'X-CSRF-Token':csrf})},...(body?{body:JSON.stringify(body)}:{})});
 try {
  let response=await call('/api/admin/setup',{password:'Media-Test-Local-2026!'});assert.equal(response.status,201);cookie=response.headers.get('set-cookie').split(';')[0];csrf=(await response.json()).csrfToken;
  assert.equal((await call('/api/admin/media',{scope:'post',imageDataUrl},'POST',true)).status,401);
  response=await call('/api/admin/media',{scope:'post',imageDataUrl});assert.equal(response.status,201);const asset=await response.json();
  assert.equal((await call(asset.url,null,'GET',true)).status,404);assert.equal((await call(asset.previewUrl)).status,200);
  const post={title:'Ảnh kiểm thử',slug:'anh-kiem-thu',excerpt:'Kiểm tra riêng tư',category:'Thử',tags:[],status:'draft',content:'![Ảnh]('+asset.url+')'};
  response=await call('/api/admin/posts',post);assert.equal(response.status,201);const id=(await response.json()).post.id;
  assert.equal((await call(asset.url,null,'GET',true)).status,404);
  assert.equal((await call('/api/admin/posts/'+id,{...post,status:'published'},'PUT')).status,200);
  response=await call(asset.url,null,'GET',true);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);
  await call('/api/admin/posts/'+id,post,'PUT');assert.equal((await call(asset.url,null,'GET',true)).status,404);
  response=await call('/api/admin/media',{scope:'site',imageDataUrl});const siteAsset=await response.json();assert.equal((await call(siteAsset.url,null,'GET',true)).status,404);
  await call('/api/admin/site',{...defaultSite,pageImages:{about:siteAsset.url}},'PUT');assert.equal((await call(siteAsset.url,null,'GET',true)).status,200);
  await call('/api/admin/site',defaultSite,'PUT');assert.equal((await call(siteAsset.url,null,'GET',true)).status,404);
 }finally{await app.close();fs.rmSync(dataDir,{recursive:true,force:true});}
});
