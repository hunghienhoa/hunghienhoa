import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {tiktokURL,fileSize} from '../dist/snaptik/core.mjs';
import {resolveVideo,snaptikRoute,mediaURL,publicVideo,tiktokItem} from '../server/snaptik.mjs';
import {createApp} from '../server/server.mjs';
import worker from '../worker/index.mjs';
import {pageContext,publicRedirect,markdownPage} from '../server/agent-content.mjs';
import {defaultSite} from '../server/validation.mjs';
const url='https://www.tiktok.com/@hungvlog1992/video/7697962664923778325',base='https://hunghienhoa.com';
const payload={code:0,data:{id:'7697962664923778325',title:'<script>unsafe()</script>',author:{nickname:'Hùng'},cover:'https://p19.tiktokcdn-us.com/cover.jpg',duration:61,play:'https://v16.tiktokcdn-us.com/video.mp4',hdplay:'https://v16.tiktokcdn-us.com/hd.mp4',music:'https://v16.tiktokcdn-us.com/audio.mp3',images:['https://p19.tiktokcdn-us.com/one.jpg'],size:1000}};
const mp4=Buffer.concat([Buffer.from('000000206674797069736f6d','hex'),Buffer.alloc(30)]),jpeg=Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9','hex');
const request=(body={url},extra={})=>new Request(base+'/api/snaptik/resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),...extra});
const file=(kind='video',extra={})=>new Request(base+'/api/snaptik/file?'+new URLSearchParams({url,kind,...extra}));
// Trang TikTok được gọi trước; các fetcher kiểm thử TikWM trả 404 cho trang để đi đường dự phòng.
const tikwmOnly=make=>async(input,options)=>String(input).includes('tikwm.com')?make(input,options):new Response('',{status:404});
const provider=async(input,options)=>{if(String(input)==='https://www.tikwm.com/api/'){assert.equal(options.method,'POST');assert.equal(options.redirect,'manual');assert.equal(options.body.get('url'),url);return Response.json(payload);}assert.ok(mediaURL(String(input)));return new Response(String(input).endsWith('.jpg')?jpeg:mp4,{headers:{'Content-Type':'video/mp4'}});};
test('TikTok links are normalized and other protocols, profiles, credentials and domains rejected',()=>{
 assert.equal(tiktokURL('Chia sẻ: '+url+'?a=1#x'),url);assert.equal(tiktokURL('https://vt.tiktok.com/Z123/'),'https://vt.tiktok.com/Z123/');
 for(const value of ['','https://evil.test/video/123',url+' '+url,'https://www.tiktok.com/@user','http://vt.tiktok.com/abc','https://www.tiktok.com@127.0.0.1/video/123',url.replace('www.tiktok.com','www.tiktok.com.evil.test'),'javascript:alert(1)','x'.repeat(2049)])assert.throws(()=>tiktokURL(value));
 for(const value of ['http://v16.tiktokcdn-us.com/a','https://127.0.0.1/a','https://[::1]/a','https://tiktokcdn-us.com.evil.test/a','https://user@v16.tiktokcdn-us.com/a','https://v16.tiktokcdn-us.com:8080/a'])assert.equal(mediaURL(value),null);
 assert.equal(fileSize(1048576),'1 MB');
});
test('only available formats and bounded metadata are returned; upstream failures stay errors',async()=>{
 const data=await resolveVideo(url,provider),publicData=publicVideo(data);assert.equal(data.formats.length,3);assert.equal(publicData.imageCount,1);assert.ok(!JSON.stringify(publicData.formats).includes('https:'));
 for(const [response,status]of [[new Response('{}',{status:429}),429],[new Response('broken'),502],[Response.json({code:-1}),404],[new Response('x'.repeat(262145)),502]])await assert.rejects(()=>resolveVideo(url,tikwmOnly(async()=>response)),{status});
 await assert.rejects(()=>resolveVideo(url,async()=>{throw Error('timeout')}),{status:504});
 await assert.rejects(()=>snaptikRoute(request({url,source:'https://evil.test'}),{fetcher:provider}),{status:400});
 await assert.rejects(()=>snaptikRoute(request({}, {body:'bad'}),{fetcher:provider}),{status:400});
 await assert.rejects(()=>snaptikRoute(request({url},{headers:{'Content-Type':'application/json',Origin:'https://evil.test'}}),{fetcher:provider}),{status:403});
});
test('downloads stream real signatures; redirects cannot reach private or unknown hosts',async()=>{
 let r=await snaptikRoute(file(),{fetcher:provider});assert.equal(r.headers.get('content-type'),'video/mp4');assert.match(r.headers.get('content-disposition'),/\.mp4"/);assert.deepEqual(Buffer.from(await r.arrayBuffer()),mp4);assert.equal(r.headers.get('cache-control'),'no-store');
 r=await snaptikRoute(file('image',{index:'0'}),{fetcher:provider});assert.equal(r.headers.get('content-type'),'image/jpeg');assert.deepEqual(Buffer.from(await r.arrayBuffer()),jpeg);
 await assert.rejects(()=>snaptikRoute(file('image',{index:'99'}),{fetcher:provider}),{status:404});
 const bad=async(i,o)=>String(i).includes('/api/')?provider(i,o):new Response('html error',{headers:{'Content-Type':'text/html'}});
 await assert.rejects(()=>snaptikRoute(file(),{fetcher:bad}),{status:502});
 const huge=async(i,o)=>String(i).includes('/api/')?provider(i,o):new Response(mp4,{headers:{'Content-Length':String(201*1048576)}});
 await assert.rejects(()=>snaptikRoute(file(),{fetcher:huge}),{status:413});
 const calls=[];const redirect=async(i,o)=>{calls.push(String(i));return String(i).includes('/api/')?provider(i,o):new Response(null,{status:302,headers:{Location:'http://169.254.169.254/latest/meta-data'}});};
 await assert.rejects(()=>snaptikRoute(file(),{fetcher:redirect}),{status:502});assert.equal(calls.length,3,'trang TikTok, TikWM rồi file; chuyển hướng lạ bị chặn');
 const malformed=async(i,o)=>String(i).includes('/api/')?provider(i,o):new Response(null,{status:302,headers:{Location:'https://['}});
 await assert.rejects(()=>snaptikRoute(file(),{fetcher:malformed}),{status:502});
 r=await snaptikRoute(new Request(file().url,{headers:{Accept:'text/html'}}),{fetcher:bad});assert.equal(r.status,502);assert.match(r.headers.get('content-type'),/text\/html/);assert.ok((await r.text()).includes('Trở về Snap'));
});
test('short network chunks still yield a valid file',async()=>{
 const chunked=async(i,o)=>String(i).includes('/api/')?provider(i,o):new Response(new ReadableStream({start(c){for(const byte of mp4)c.enqueue(Uint8Array.of(byte));c.close();}}));
 const r=await snaptikRoute(file(),{fetcher:chunked});assert.deepEqual(Buffer.from(await r.arrayBuffer()),mp4);
});
test('the source rate limit is retried with backoff and stays a retryable 429 if still busy',async t=>{
 t.mock.method(globalThis,'setTimeout',fn=>{fn();return 0;});
 let calls=0;const once=tikwmOnly(async()=>Response.json(++calls<3?{code:-1,msg:'Free Api Limit: 1 request/second.'}:payload));
 assert.equal((await resolveVideo(url,once,null)).id,payload.data.id);assert.equal(calls,3);
 calls=0;await assert.rejects(()=>resolveVideo(url,tikwmOnly(async()=>{calls++;return Response.json({code:-1,msg:'Free Api Limit: 1 request/second.'});}),null),{status:429,retryAfter:5});assert.equal(calls,3);
});
function fakeStore(){const map=new Map();return {map,match:async request=>map.has(request.url)?new Response(map.get(request.url)):undefined,put:async(request,response)=>{map.set(request.url,await response.text());}};}
test('shared edge cache serves other isolates, concurrent identical requests share one call, a busy source is not hammered',async t=>{
 t.mock.method(globalThis,'setTimeout',fn=>{fn();return 0;});
 const store=fakeStore();let calls=0;const fetcher=tikwmOnly(async()=>{calls++;await new Promise(r=>queueMicrotask(r));return Response.json(payload)});
 const [a,b]=await Promise.all([resolveVideo(url,fetcher,store),resolveVideo(url,fetcher,store)]);
 assert.deepEqual([a.id,b.id,calls],[payload.data.id,payload.data.id,1],'yêu cầu trùng chỉ gọi nguồn một lần');
 const other=async()=>{throw Error('không được gọi: đã có trong bộ nhớ đệm dùng chung')};
 assert.equal((await resolveVideo(url,other,store)).id,payload.data.id);
 const busyStore=fakeStore();let hits=0;const busy=tikwmOnly(async()=>{hits++;return new Response('{}',{status:429});});
 await assert.rejects(()=>resolveVideo(url,busy,busyStore),{status:429});const first=hits;
 await assert.rejects(()=>resolveVideo(url+'?x=1',busy,busyStore),{status:429});
 assert.equal(hits,first,'nguồn vừa báo bận thì trả lời ngay, không gọi dồn');
});
test('a temporary failure tells the browser when to retry',async t=>{
 t.mock.method(globalThis,'setTimeout',fn=>{fn();return 0;});
 const request=()=>new Request('https://hunghienhoa.com/api/snap/resolve',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://hunghienhoa.com'},body:JSON.stringify({url})});
 const r=await snaptikRoute(request(),{fetcher:async()=>new Response('{}',{status:429}),store:null});
 assert.deepEqual([r.status,r.headers.get('retry-after'),(await r.json()).retryAfter],[429,'5',5]);
});
test('metadata is reused briefly for download clicks, then refreshed',async t=>{
 let calls=0;const fetcher=tikwmOnly(async()=>{calls++;return Response.json(payload)});
 await resolveVideo(url,fetcher);await resolveVideo(url,fetcher);assert.equal(calls,1);
 const later=Date.now()+61000;t.mock.method(Date,'now',()=>later);
 await resolveVideo(url,fetcher);assert.equal(calls,2);
});
test('Node and Worker share routes, no-store responses and rate protection',async()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'hung-snaptik-')),app=createApp({port:0,dataDir:folder,videoFetch:provider});await app.listen();
 try{const local='http://127.0.0.1:'+app.server.address().port;let r=await fetch(local+'/api/snaptik/resolve',{method:'POST',headers:{Origin:local,'Content-Type':'application/json'},body:JSON.stringify({url})});assert.equal(r.status,200);assert.equal((await r.json()).id,payload.data.id);r=await fetch(local+'/snaptik/');assert.equal(r.status,200);assert.ok((await r.text()).includes('id="download-form"'));}
 finally{await app.close();assert.ok(folder.startsWith(path.join(os.tmpdir(),'hung-snaptik-')));fs.rmSync(folder,{recursive:true,force:true});}
 const original=globalThis.fetch;globalThis.fetch=provider;
 try{const keys=[],env={SNAPTIK_LIMIT:{limit:async({key})=>{keys.push(key);return {success:true}}}};let r=await worker.fetch(request(),env);assert.equal(r.status,200);assert.match(keys[0],/^[a-f0-9]{64}$/);assert.equal(r.headers.get('cache-control'),'no-store');r=await worker.fetch(request(),{SNAPTIK_LIMIT:{limit:async()=>({success:false})}});assert.equal(r.status,429);}
 finally{globalThis.fetch=original;}
 assert.equal(publicRedirect('http://hunghienhoa.com/snaptik/').href,base+'/snaptik/');assert.equal(publicRedirect('https://snap.hunghienhoa.com/').href,base+'/snaptik/');assert.equal(pageContext(new URL(base+'/snaptik/')).page,'snaptik');assert.ok(markdownPage(defaultSite,{page:'snaptik',origin:base+'/snaptik'}).includes('TikWM'));
});

test('TikTok is read straight from the public page like yt-dlp; session cookies stay server-side and are reused for the file',async()=>{
 const id='7697962664923778325',page='https://www.tiktok.com/@hung/video/'+id;
 const item={id,desc:'Xin chào',author:{nickname:'Hùng'},music:{playUrl:'https://sf16-ies-music.tiktokcdn.com/a.mp3'},imagePost:null,video:{duration:12,cover:'https://p16-sign.tiktokcdn-us.com/c.jpg',playAddr:'https://v16-webapp-prime.tiktok.com/video/low.mp4',bitrateInfo:[{Bitrate:500,PlayAddr:{UrlList:['https://v16-webapp-prime.tiktok.com/video/low.mp4']}},{Bitrate:2000,PlayAddr:{UrlList:['https://v19-webapp-prime.tiktok.com/video/hd.mp4'],DataSize:900}}]}};
 const html='<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">'+JSON.stringify({__DEFAULT_SCOPE__:{'webapp.video-detail':{statusCode:0,itemInfo:{itemStruct:item}}}})+'</script>';
 assert.equal(tiktokItem(html).id,id);assert.equal(tiktokItem('<p>captcha</p>'),null);
 assert.deepEqual(tiktokItem('<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">{"__DEFAULT_SCOPE__":{"webapp.video-detail":{"statusCode":10204}}}</script>'),{unavailable:true});
 const seen=[];const fetcher=async(input,options={})=>{seen.push([String(input),options.headers?.Cookie||'']);
  if(String(input)==='https://vm.tiktok.com/ZAB/')return new Response(null,{status:301,headers:{Location:page,'Set-Cookie':'tt_chain_token=abc; Path=/'}});
  if(String(input)==='https://vm.tiktok.com/EVIL/')return new Response(null,{status:302,headers:{Location:'https://evil.test/'}});
  if(String(input)===page)return new Response(html,{headers:{'Content-Type':'text/html','Set-Cookie':'ttwid=1%7Cxyz; Path=/; HttpOnly'}});
  if(String(input).includes('tikwm.com'))return Response.json(payload);
  assert.ok(mediaURL(String(input)));return new Response(mp4,{headers:{'Content-Type':'video/mp4'}});};
 const data=await resolveVideo('https://vm.tiktok.com/ZAB/',fetcher,null);
 assert.deepEqual(data.formats.map(f=>f.kind),['video','hd','audio']);assert.equal(data.author,'Hùng');
 assert.ok(!JSON.stringify(publicVideo(data)).includes('ttwid'),'cookie không gửi ra trình duyệt');
 const r=await snaptikRoute(new Request(base+'/api/snaptik/file?'+new URLSearchParams({url:'https://vm.tiktok.com/ZAB/',kind:'hd'})),{fetcher,store:null});
 assert.equal(r.status,200);assert.deepEqual(seen.at(-1),['https://v19-webapp-prime.tiktok.com/video/hd.mp4','tt_chain_token=abc; ttwid=1%7Cxyz']);
 // Chuyển hướng ra ngoài TikTok thì bỏ, dùng TikWM dự phòng.
 const fallback=await resolveVideo('https://vm.tiktok.com/EVIL/',fetcher,null);assert.equal(fallback.id,payload.data.id);assert.equal(fallback.headers,undefined);
});
