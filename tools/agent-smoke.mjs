import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const hosts=['hunghienhoa.com','blog.hunghienhoa.com','photobooth.hunghienhoa.com','snaptik.hunghienhoa.com'];
let passed=0;
const links=new Set();
async function get(url,accept='*/*',method='GET') {
  const response=await fetch(url,{headers:{Accept:accept,'User-Agent':'Hung-agent-readiness-verifier'},method,signal:AbortSignal.timeout(25000)});
  return {response,body:await response.text()};
}
for(const host of hosts) {
  const base='https://'+host;
  for(const [accept,mime] of [['text/markdown','text/markdown'],['text/html','text/html'],['text/html;q=0.2,text/markdown;q=0.9','text/markdown'],['text/markdown;q=0,text/html;q=1','text/html']]) {
    const {response,body}=await get(base+'/',accept);
    assert.equal(response.status,200);assert.ok(response.headers.get('content-type').startsWith(mime));assert.match(response.headers.get('vary'),/accept/i);assert.ok(body.length>20);
    if(mime==='text/markdown')assert.ok(body.startsWith('# ')&&!body.includes('<script'));
    else {
      const data=JSON.parse(body.match(/type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)[1]);
      assert.equal(data['@context'],'https://schema.org');assert.ok(data['@graph'].some(item=>item['@type']==='Person'&&item.name&&item.url));
      assert.ok(body.includes('rel="canonical"')&&body.includes('rel="alternate"'));
    }
    passed++;
  }
  for(const method of ['GET','HEAD']) {
    const {response,body}=await get(base+'/__ora-404-probe-7k3ld154','text/markdown',method);
    assert.equal(response.status,404);assert.match(response.headers.get('content-type'),/^text\/markdown/);assert.match(response.headers.get('vary'),/accept/i);assert.ok(method==='HEAD'?body==='':body.length>=20&&body.includes('/llms.txt'));passed++;
  }
  assert.equal((await get(base+'/','application/json')).response.status,406);passed++;
  const head=await get(base+'/','text/markdown','HEAD');assert.equal(head.response.status,200);assert.match(head.response.headers.get('content-type'),/^text\/markdown/);assert.equal(head.body,'');passed++;
  for(const [route,mime] of [['/index.md','text/markdown'],['/llms.txt','text/plain'],['/agent-instructions.md','text/markdown'],['/robots.txt','text/plain'],['/sitemap.xml','application/xml']]) {
    const {response,body}=await get(base+route);
    assert.equal(response.status,200,base+route);assert.ok(response.headers.get('content-type').startsWith(mime));assert.ok(body.length>20);
    if(route==='/llms.txt') {
      assert.match(body,/^# .+\n\n> /);assert.ok(body.includes('When to use this'));
      for(const [,url]of body.matchAll(/\]\((https:\/\/[^)]+)\)/g))links.add(url);
      assert.ok(!body.includes('admin.hunghienhoa.com'));
    }
    if(route==='/sitemap.xml') {
      const parse=spawnSync('python',['-c',"import sys,json,xml.etree.ElementTree as E; r=E.fromstring(sys.stdin.read()); assert r.tag=='{http://www.sitemaps.org/schemas/sitemap/0.9}urlset'; print(json.dumps([n.text for n in r.findall('{http://www.sitemaps.org/schemas/sitemap/0.9}url/{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]))"],{input:body,encoding:'utf8'});
      assert.equal(parse.status,0,parse.stderr);const urls=JSON.parse(parse.stdout);assert.ok(urls.length>0&&urls.length<=50000);
      for(const url of urls){assert.equal(new URL(url).hostname,host);assert.ok(!url.includes('/api/')&&!url.includes('admin.'));links.add(url);}
    }
    if(route==='/robots.txt')assert.ok(body.includes('Disallow: /api/')&&body.includes('Sitemap: '+base+'/sitemap.xml'));
    passed++;
  }
}
for(const url of links) {
  const {response,body}=await get(url,'text/markdown');assert.equal(response.status,200,url);assert.ok(body.length>20,url);passed++;
}
const adminRobots=await get('https://admin.hunghienhoa.com/robots.txt');assert.equal(adminRobots.response.status,200);assert.equal(adminRobots.body,'User-agent: *\nDisallow: /\n');passed++;
for(const route of ['/llms.txt','/sitemap.xml','/agent-instructions.md','/index.md']){assert.equal((await get('https://admin.hunghienhoa.com'+route)).response.status,404);passed++;}
for(const route of ['site','posts','submissions','analytics']){const {response}=await get('https://admin.hunghienhoa.com/api/admin/'+route,'text/markdown');assert.equal(response.status,401);assert.match(response.headers.get('content-type'),/application\/json/);passed++;}
console.log(`PASS: ${passed} kiểm tra trực tiếp — Markdown/HTML/q/406/HEAD/404, JSON-LD, mọi endpoint máy đọc, liên kết llms/sitemap và phân quyền admin.`);
