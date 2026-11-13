import assert from 'node:assert/strict';
import {POLICY_PATHS,publicRedirect} from '../server/agent-content.mjs';

let checks=0;
async function get(url,options={}){
 const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(25000),...options});
 return {r,body:await r.text()};
}
const main='https://hunghienhoa.com',blog='https://blog.hunghienhoa.com',photo='https://photobooth.hunghienhoa.com';
const ad='google.com, pub-1643127618182542, DIRECT, f08c47fec0942fa0';
let {r,body}=await get(main+'/ads.txt');
assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/^text\/plain/);assert.equal(body.trim(),ad);checks++;
for(const url of [blog+'/ads.txt',photo+'/ads.txt','http://hunghienhoa.com/','http://blog.hunghienhoa.com/?bai=published','http://photobooth.hunghienhoa.com/shoot','https://www.hunghienhoa.com/blog/?bai=published',main+'/photobooth/shoot/?frame=one',main+'/chinh-sach-rieng-tu.html']){
 const {r}=await get(url);assert.equal(r.status,308,url);assert.equal(r.headers.get('location'),publicRedirect(url).href,url);checks++;
}
const {body:postJSON}=await get(blog+'/api/posts'),posts=JSON.parse(postJSON).posts;
assert.ok(posts.length>0);
for(const post of posts){
 const url=blog+'/?bai='+post.slug,{r,body}=await get(url,{headers:{Accept:'text/html'}});
 assert.equal(r.status,200,url);assert.ok(body.includes('id="article-body"><')&&body.includes('data-rendered-slug="'+post.slug+'"'),url);
 const graph=JSON.parse(body.match(/type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
 assert.equal(graph.find(x=>x['@type']==='Article').headline,post.title);
 assert.ok(body.includes('rel="canonical" href="'+url+'"'));
 assert.ok(!body.includes('adsbygoogle.js'));
 if(['5','6','7','8'].includes(post.id))assert.ok(post.content.includes('Hùng Hiền Hòa tự tạo và chia sẻ'));
 checks++;
}
for(const method of ['GET','HEAD'])for(const accept of ['text/html','text/markdown'])for(const slug of ['__adsense-missing','']){
 const {r,body}=await get(blog+'/?bai='+slug,{method,headers:{Accept:accept}});
 assert.equal(r.status,404);assert.ok(!body.includes('google-adsense-account'));
 assert.match(r.headers.get('content-type'),new RegExp(accept));
 assert.ok(method==='HEAD'?body==='':body.length>20);checks++;
}
for(const path of POLICY_PATHS){const {r,body}=await get(main+path);assert.equal(r.status,200);assert.ok(body.includes('rel="canonical" href="'+main+path+'"'));checks++;}
for(const base of [main,blog,photo]){
 const {r,body}=await get(base+'/robots.txt');assert.equal(r.status,200);assert.ok(body.includes('Allow: /api/posts/')&&body.includes('Disallow: /api/'));checks++;
}
({r,body}=await get(photo+'/shoot'));assert.equal(r.status,200);assert.ok(body.includes('rel="canonical" href="'+photo+'/shoot"')&&body.includes('id="studio-title"'));checks++;
({r,body}=await get('https://admin.hunghienhoa.com/'));assert.equal(r.status,200);assert.ok(!body.includes('google-adsense-account')&&!body.includes('adsbygoogle.js'));checks++;
console.log(`PASS: ${checks} AdSense technical endpoint checks, ${posts.length} complete published articles; ads remain disabled.`);
