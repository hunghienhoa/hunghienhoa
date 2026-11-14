import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createApp} from '../server/server.mjs';
import worker from '../worker/index.mjs';
import {defaultSite} from '../server/validation.mjs';
import {representation,pageContext,decorateHtml,markdownPage,structuredData,ORIGINS} from '../server/agent-content.mjs';

for(const [accept,expected] of [
  [null,'text/html'],['*/*','text/html'],['text/markdown','text/markdown'],['TEXT/MARKDOWN; charset="UTF-8"','text/markdown'],
  ['text/html','text/html'],['text/html;q=0.7,text/markdown;q=0.9','text/markdown'],
  ['text/markdown;q=0.1,text/html;q=0.8','text/html'],['text/markdown;q=0,text/*;q=1','text/html'],
  ['text/html;q=0,text/markdown;q=0,*/*;q=1',null],['application/json',null],['text/markdown;q=2',null],
  ['text/markdown;variant=unsupported',null],['text/markdown;charset=utf-8;q=0,text/markdown;q=1',null]
])assert.equal(representation(accept),expected,accept);
assert.equal(pageContext(new URL('https://admin.hunghienhoa.com/')),null);
const ctx=pageContext(new URL(ORIGINS.main+'/'));
const fields=JSON.parse(fs.readFileSync('dist/content-fields.json','utf8'));
const hero=fields.find(f=>f.page==='main'&&f.default==='Một hộp').key;
const privateKey=fields.find(f=>f.page==='admin').key;
const site={...defaultSite,displayName:'Hùng Hiền Hòa </script><script>alert(1)</script>',pageTexts:{[hero]:'Hộp đã sửa trong admin',[privateKey]:'PRIVATE-ADMIN-MARKER'}};
const html=decorateHtml(fs.readFileSync('dist/index.html','utf8'),site,ctx,new URL(ORIGINS.main));
const json=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
const graph=JSON.parse(json)['@graph'];
assert.equal(graph.find(item=>item['@type']==='Person').name,site.displayName);
const website=graph.find(item=>item['@type']==='WebSite');
assert.equal(website.name,site.displayName);assert.equal(website.url,ORIGINS.main+'/');
assert.equal(website.publisher['@id'],graph.find(item=>item['@type']==='Person')['@id']);
assert.equal(graph.find(item=>item['@type']==='ProfilePage').isPartOf['@id'],website['@id']);
assert.deepEqual(website.hasPart.map(ref=>graph.find(item=>item['@id']===ref['@id']).url),[ORIGINS.photobooth+'/',ORIGINS.blog+'/',ORIGINS.snaptik+'/']);
for(const [page,origin]of Object.entries(ORIGINS)){
 const context={page,path:'/',origin},template=fs.readFileSync(page==='main'?'dist/index.html':`dist/${page}/index.html`,'utf8');
 const rendered=decorateHtml(template,defaultSite,context,new URL(origin+'/'));
 assert.equal((rendered.match(/rel="canonical"/g)||[]).length,1,page);
 assert.equal((rendered.match(/property="og:site_name"/g)||[]).length,1,page);
 assert.ok(!rendered.includes('name="keywords"'));assert.ok(rendered.includes('name="robots" content="max-image-preview:large"'));
 const nodes=JSON.parse(rendered.match(/type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'].filter(item=>item['@type']==='WebSite');
 assert.equal(nodes.length,1);assert.equal(nodes[0].url,origin+'/');assert.ok(nodes[0].name&&nodes[0].inLanguage==='vi');
}
assert.ok(!json.includes('</script>')&&!json.includes('PRIVATE-ADMIN-MARKER'));
assert.ok(graph.find(item=>item['@type']==='Person').sameAs.every(value=>value.startsWith('https://')));
assert.ok(html.includes('rel="canonical"')&&html.includes('type="text/markdown"'));
assert.ok(markdownPage(site,ctx).includes('Hộp đã sửa trong admin'));
assert.ok(!markdownPage(site,ctx).includes('PRIVATE-ADMIN-MARKER'));

async function verify(request,base,blogPrefix='/blog') {
  const get=(route,accept='*/*',method='GET')=>request(new URL(route,base).href,{headers:{Accept:accept},method});
  let r=await get('/','text/markdown'),body=await r.text();
  assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/^text\/markdown/);assert.match(r.headers.get('vary'),/accept/i);assert.ok(body.startsWith('# ')&&body.length>100);
  assert.ok(body.includes('Hộp đã sửa trong admin'));assert.ok(!body.includes('<script')&&!body.includes('PRIVATE-ADMIN-MARKER'));
  r=await get('/','text/html');body=await r.text();
  assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/^text\/html/);assert.match(r.headers.get('vary'),/accept/i);assert.ok(body.includes('<!doctype html>')&&body.includes('application/ld+json'));
  assert.equal(JSON.parse(body.match(/type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)[1])['@context'],'https://schema.org');
  for(const accept of ['text/markdown;q=0.8,text/html;q=0.1','text/html;q=0,text/markdown;q=1'])assert.match((await get('/',accept)).headers.get('content-type'),/^text\/markdown/);
  assert.match((await get('/','text/markdown;q=0,text/html;q=1')).headers.get('content-type'),/^text\/html/);
  assert.equal((await get('/','application/json')).status,406);
  for(const method of ['GET','HEAD']) {
    r=await get('/__ora-404-probe-7k3ld154','text/markdown',method);body=await r.text();
    assert.equal(r.status,404);assert.match(r.headers.get('content-type'),/^text\/markdown/);assert.match(r.headers.get('vary'),/accept/i);
    assert.ok(method==='HEAD'?body==='':body.length>=20&&body.includes('/llms.txt'));
  }
  assert.equal((await get('/__ora-404-probe-7k3ld154','text/html')).status,404);
  r=await get('/','text/markdown','HEAD');assert.equal(r.status,200);assert.equal(await r.text(),'');assert.match(r.headers.get('content-type'),/^text\/markdown/);
  for(const route of ['/index.md','/agent-instructions.md']) {r=await get(route);assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/^text\/markdown/);assert.ok((await r.text()).length>100);}
  r=await get('/llms.txt');body=await r.text();assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/^text\/plain/);
  assert.match(body,/^# .+\n\n> /);assert.ok(body.includes('When to use this'));assert.ok(!body.includes('admin.hunghienhoa.com'));
  for(const section of body.split(/^## /m).slice(1))assert.match(section,/- \[[^\]]+\]\(https:\/\/[^)]+\): /);
  r=await get('/robots.txt');body=await r.text();assert.equal(r.status,200);assert.ok(body.includes('User-agent: *')&&body.includes('Disallow: /api/')&&body.includes('Sitemap: '));
  r=await get('/sitemap.xml');body=await r.text();assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/^application\/xml/);
  const parsed=spawnSync('python',['-c',"import sys,xml.etree.ElementTree as E; r=E.fromstring(sys.stdin.read()); assert r.tag=='{http://www.sitemaps.org/schemas/sitemap/0.9}urlset'; assert len(r)>0; assert all(x.find('{http://www.sitemaps.org/schemas/sitemap/0.9}loc').text.startswith('https://hunghienhoa.com/') for x in r)"],{input:body,encoding:'utf8'});
  assert.equal(parsed.status,0,parsed.stderr);
  if(blogPrefix) {
    for(const route of [blogPrefix+'/', '/photobooth/']){r=await get(route,'text/markdown');assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/^text\/markdown/);}
    r=await get(blogPrefix+'/?bai=published','text/markdown');assert.equal(r.status,200);assert.ok((await r.text()).includes('PUBLIC-ARTICLE'));
    for(const slug of ['draft','not-found','invalid%26slug'])assert.equal((await get(blogPrefix+'/?bai='+slug,'text/markdown')).status,404);
    r=await get(blogPrefix+'/sitemap.xml');body=await r.text();assert.ok(body.includes('bai=published')&&!body.includes('bai=draft'));
  }
}

const directory=fs.mkdtempSync(path.join(os.tmpdir(),'hung-agents-test-'));
const app=createApp({port:0,dataDir:directory});await app.listen();
const rows=app.db.prepare('SELECT * FROM posts ORDER BY id').all();
app.db.prepare("UPDATE posts SET slug='published',title='PUBLIC-ARTICLE' WHERE id=?").run(rows[0].id);
app.db.prepare("UPDATE posts SET slug='draft',title='PRIVATE-DRAFT',status='draft' WHERE id=?").run(rows[1].id);
app.db.prepare('UPDATE settings SET value=? WHERE key=?').run(JSON.stringify(site),'site');
try {
  await verify((url,options)=>fetch(url,options),`http://127.0.0.1:${app.server.address().port}`);
  const admin=await fetch(`http://127.0.0.1:${app.server.address().port}/api/admin/site`,{headers:{Accept:'text/markdown'}});assert.equal(admin.status,401);assert.match(admin.headers.get('content-type'),/application\/json/);
} finally {await app.close();assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep+'hung-agents-test-'));fs.rmSync(directory,{recursive:true,force:true});}

const originalFetch=globalThis.fetch;
const env={SUPABASE_URL:'https://database.example.test',SUPABASE_PUBLISHABLE_KEY:'public-test',ASSETS:{fetch:async request=>{
  let file=new URL(request.url).pathname;if(file.endsWith('/'))file+='index.html';
  if(!fs.existsSync('dist'+file))return new Response('Not found',{status:404,headers:{'Content-Type':'text/html'}});
  return new Response(request.method==='HEAD'?null:fs.readFileSync('dist'+file),{headers:{'Content-Type':'text/html'}});
}}};
globalThis.fetch=async input=>{
  const url=new URL(input);
  if(url.pathname.endsWith('/site_settings'))return Response.json([{data:site}]);
  assert.equal(url.searchParams.get('status'),'eq.published');
  return Response.json(url.searchParams.get('slug')&&url.searchParams.get('slug')!=='eq.published'?[]:[{slug:'published',title:'PUBLIC-ARTICLE',excerpt:'Bài công khai',content:'Nội dung công khai',is_sample:false}]);
};
try {
  await verify((url,options)=>worker.fetch(new Request(url,options),env),'https://hunghienhoa.com',null);
  for(const host of ['blog','photobooth']) {
    for(const route of ['/','/index.md','/llms.txt','/agent-instructions.md','/robots.txt','/sitemap.xml']) {
      const r=await worker.fetch(new Request(`https://${host}.hunghienhoa.com${route}`,{headers:{Accept:'text/markdown'}}),env);
      assert.equal(r.status,200,host+route);assert.ok((await r.text()).length>20);
    }
  }
  for(const slug of ['draft','not-found'])assert.equal((await worker.fetch(new Request('https://blog.hunghienhoa.com/?bai='+slug,{headers:{Accept:'text/markdown'}}),env)).status,404);
  let r=await worker.fetch(new Request('https://admin.hunghienhoa.com/robots.txt'),env);assert.equal(await r.text(),'User-agent: *\nDisallow: /\n');
  r=await worker.fetch(new Request('https://admin.hunghienhoa.com/llms.txt'),env);assert.equal(r.status,404);
}finally{globalThis.fetch=originalFetch;}
console.log('PASS: local + Worker Markdown/HTML negotiation, q-values/406/HEAD, meaningful404, llms format, XML sitemap, JSON-LD escaping, current admin content and draft/admin isolation.');
