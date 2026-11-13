import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../server/server.mjs';
import worker from '../worker/index.mjs';
import {defaultSite} from '../server/validation.mjs';
import {articleHtml,publicHtml,pageContext,publicRedirect,POLICY_PATHS} from '../server/agent-content.mjs';

const ad='google.com, pub-1643127618182542, DIRECT, f08c47fec0942fa0\n';
assert.equal(fs.readFileSync('dist/ads.txt','utf8').replaceAll('\r\n','\n'),ad);
for(const [source,target] of [
 ['http://www.hunghienhoa.com/blog/?bai=published','https://blog.hunghienhoa.com/?bai=published'],
 ['http://hunghienhoa.com/photobooth/shoot/?frame=one','https://photobooth.hunghienhoa.com/shoot?frame=one'],
 ['http://blog.hunghienhoa.com/?bai=published','https://blog.hunghienhoa.com/?bai=published'],
 ['https://photobooth.hunghienhoa.com/shoot.html','https://photobooth.hunghienhoa.com/shoot'],
 ['https://blog.hunghienhoa.com/ads.txt','https://hunghienhoa.com/ads.txt'],
 ['https://photobooth.hunghienhoa.com/ads.txt','https://hunghienhoa.com/ads.txt'],
 ['https://hunghienhoa.com/chinh-sach-rieng-tu.html','https://hunghienhoa.com/chinh-sach-rieng-tu']
])assert.equal(publicRedirect(source)?.href,target);
for(const url of ['http://127.0.0.1:4180/blog/','https://blog.hunghienhoa.com/','http://untrusted.test/'])assert.equal(publicRedirect(url),null);

const content='## Tiêu đề riêng\n\n**Đậm** và *nghiêng*, `x < y`, [Nguồn](https://example.test/?a=1&b=2).\n\n1. Đầu\n2. Sau\n\n- Khác\n\n> Trích dẫn\n\n```html\n<script>alert("x")</script>\n  giữ thụt dòng $&\n```\n\n<script>unsafe()</script>\n[javascript](javascript:alert(1))';
const rendered=articleHtml(content);
assert.ok(rendered.includes('<h2>Tiêu đề riêng</h2>')&&rendered.includes('<strong>Đậm</strong>')&&rendered.includes('<em>nghiêng</em>'));
assert.ok(rendered.includes('<ol><li>Đầu</li><li>Sau</li></ol><ul>')&&rendered.includes('<blockquote>Trích dẫn</blockquote>'));
assert.ok(rendered.includes('  giữ thụt dòng $&')&&rendered.includes('&lt;script&gt;'));
assert.ok(!rendered.includes('<script>')&&!rendered.includes('href="javascript:'));
assert.ok(rendered.includes('rel="noopener noreferrer"')&&rendered.includes('a=1&amp;b=2'));

const post={id:'1',slug:'published',title:'PUBLIC-ARTICLE $& </title><script>bad()</script>',excerpt:'Mô tả riêng $& "quoted"',content,category:'Thiết kế',publishedAt:Date.UTC(2026,10,13),tags:['<script>bad</script>'],coverUrl:'/api/posts/1/cover.webp',status:'published'};
const template=fs.readFileSync('dist/blog/index.html','utf8');
const data={post:async slug=>slug==='published'?post:null,listing:async()=>[post,{...post,slug:'draft',title:'PRIVATE-DRAFT',status:'draft'}]};
const url=new URL('https://blog.hunghienhoa.com/?bai=published');
const page=await publicHtml(template,defaultSite,pageContext(url),url,data);
assert.equal(page.status,200);
assert.ok(page.body.includes('id="article-body"><h2>Tiêu đề riêng</h2>'));
assert.ok(page.body.includes('id="reader-meta"><div class="post-meta">'));
assert.ok(page.body.includes('data-rendered-slug="published" id="article"'));
assert.ok(!page.body.match(/<article[^>]*id="article"[^>]*hidden/));
assert.ok(page.body.includes('<meta name="description" content="Mô tả riêng $&amp; &quot;quoted&quot;">'));
assert.ok(!page.body.includes('<script>bad()'));
const graph=JSON.parse(page.body.match(/type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
const schema=graph.find(x=>x['@type']==='Article');
assert.equal(schema.headline,post.title);assert.equal(schema.datePublished,'2026-11-13T00:00:00.000Z');
assert.equal(schema.image[0],'https://blog.hunghienhoa.com/api/posts/1/cover.webp');
const listing=await publicHtml(template,defaultSite,pageContext(new URL('https://blog.hunghienhoa.com/')),new URL('https://blog.hunghienhoa.com/'),data);
assert.ok(listing.body.includes('href="?bai=published"')&&!listing.body.includes('PRIVATE-DRAFT'));

async function verify(request,base,blog='/blog'){
 const get=(route,method='GET')=>request(base+route,{method,headers:{Accept:'text/html'}});
 let r=await get('/ads.txt');assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/^text\/plain/);assert.equal((await r.text()).replaceAll('\r\n','\n'),ad);
 if(blog){
  r=await get(blog+'/?bai=published');const html=await r.text();assert.equal(r.status,200);assert.ok(html.includes('PUBLIC-ARTICLE')&&html.includes('Tiêu đề riêng')&&html.includes('"@type":"Article"'));assert.ok(!html.includes('PRIVATE-DRAFT'));
  r=await get(blog+'/');assert.equal(r.status,200);assert.ok((await r.text()).includes('href="?bai=published"'));
  for(const slug of ['draft','not-found','invalid%26slug',''])for(const method of ['GET','HEAD']){r=await get(blog+'/?bai='+slug,method);assert.equal(r.status,404);assert.match(r.headers.get('x-robots-tag'),/noindex/);const body=await r.text();assert.ok(method==='HEAD'?body==='':body.includes('Không tìm thấy trang')&&!body.includes('google-adsense-account'));}
 }
 if(blog)for(const slug of ['draft','not-found','invalid%26slug','']){const r=await request(base+blog+'/?bai='+slug,{headers:{Accept:'text/markdown'}});assert.equal(r.status,404);}
 r=await get('/robots.txt');const robots=await r.text();assert.ok(robots.includes('Allow: /api/posts/')&&robots.includes('Allow: /api/site$')&&robots.includes('Disallow: /api/'));
 for(const p of POLICY_PATHS){r=await get(p);assert.equal(r.status,200);assert.ok((await r.text()).includes(`rel="canonical" href="https://hunghienhoa.com${p}"`));}
}

const directory=fs.mkdtempSync(path.join(os.tmpdir(),'hung-adsense-test-'));
const app=createApp({port:0,dataDir:directory});await app.listen();
const rows=app.db.prepare('SELECT id FROM posts ORDER BY id').all();
app.db.prepare("UPDATE posts SET slug='published',title=?,content=?,excerpt=? WHERE id=?").run(post.title,content,post.excerpt,rows[0].id);
app.db.prepare("UPDATE posts SET slug='draft',title='PRIVATE-DRAFT',status='draft' WHERE id=?").run(rows[1].id);
try{await verify((url,o)=>fetch(url,o),`http://127.0.0.1:${app.server.address().port}`);}
finally{await app.close();assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep+'hung-adsense-test-'));fs.rmSync(directory,{recursive:true,force:true});}

const originalFetch=globalThis.fetch;
const env={SUPABASE_URL:'https://db.example.test',SUPABASE_PUBLISHABLE_KEY:'public-test',ASSETS:{fetch:async req=>{
 let file=new URL(req.url).pathname;if(file.endsWith('/'))file+='index.html';
 if(file==='/photobooth/shoot'||POLICY_PATHS.includes(file))file+='.html';
 if(!fs.existsSync('dist'+file))return new Response('404',{status:404});
 return new Response(req.method==='HEAD'?null:fs.readFileSync('dist'+file),{headers:{'Content-Type':file.endsWith('.txt')?'text/plain':'text/html'}});
}}};
globalThis.fetch=async input=>{const u=new URL(input);if(u.pathname.endsWith('/site_settings'))return Response.json([{data:defaultSite}]);assert.equal(u.searchParams.get('status'),'eq.published');return Response.json(u.searchParams.has('slug')&&u.searchParams.get('slug')!=='eq.published'?[]:[{...post,published_at:'2026-11-13T00:00:00Z',has_cover:true}]);};
try{
 await verify((url,o)=>worker.fetch(new Request(url,o),env),'https://hunghienhoa.com',null);
 for(const method of ['GET','HEAD']){
  let r=await worker.fetch(new Request('https://blog.hunghienhoa.com/?bai=published',{method}),env);assert.equal(r.status,200);const body=await r.text();assert.ok(method==='HEAD'?body==='':body.includes('Tiêu đề riêng')&&body.includes('"@type":"Article"'));
  r=await worker.fetch(new Request('https://blog.hunghienhoa.com/?bai=not-found',{method}),env);assert.equal(r.status,404);assert.match(r.headers.get('x-robots-tag'),/noindex/);if(method==='HEAD')assert.equal(await r.text(),'');
 }
 const root=await worker.fetch(new Request('https://hunghienhoa.com/'),env);assert.ok((await root.text()).includes('href="https://blog.hunghienhoa.com/"'));
 const shoot=await worker.fetch(new Request('https://photobooth.hunghienhoa.com/shoot'),env);assert.ok((await shoot.text()).includes('rel="canonical" href="https://photobooth.hunghienhoa.com/shoot"'));
 for(const source of ['http://hunghienhoa.com/','http://blog.hunghienhoa.com/?bai=published','http://www.hunghienhoa.com/photobooth/shoot/','https://blog.hunghienhoa.com/ads.txt']){const r=await worker.fetch(new Request(source),env);assert.equal(r.status,308);assert.equal(r.headers.get('location'),publicRedirect(source).href);}
}finally{globalThis.fetch=originalFetch;}
console.log('PASS: publisher ads.txt, one-hop subdomains/HTTPS, published-only SSR article/listing, escaped rich text/code/schema, metadata, HEAD/404, policies and narrow public robots rules.');
