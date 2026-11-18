import assert from 'node:assert/strict';
import test from 'node:test';
import worker, { assetRequest, readJson } from './index.mjs';
import fs from 'node:fs';
import {DEFAULT_DESIGN} from '../dist/photobooth/design.mjs';

test('gửi email sau khi lưu bản chờ; lỗi email không làm mất đóng góp', async t => {
  const messages=[];
  let saved=0, failInsert=false, failEmail=false, blocked=false;
  t.mock.method(globalThis,'fetch',async()=>{
    if(failInsert) return Response.json({message:'save failed'},{status:503});
    saved++; return new Response(null,{status:201});
  });
  t.mock.method(console,'error',()=>{});
  const env={VISITS:{idFromName:()=>'',get:()=>({fetch:async()=>Response.json({remaining:blocked?null:2},{status:blocked?429:200})})},SUPABASE_URL:'https://database.example.test',SUPABASE_PUBLISHABLE_KEY:'test',FRAME_EMAIL:{send:async message=>{assert.ok(saved>0); if(failEmail) throw new Error('provider failed'); messages.push(message);}}};
  const body={name:'Khung thử',authorName:'Tác giả thử',authorContact:'private@example.invalid',authorLink:'',consent:true,design:DEFAULT_DESIGN,imageDataUrl:'data:image/webp;base64,'+fs.readFileSync('server/fixtures/frame.webp').toString('base64')};
  const submit=()=>worker.fetch(new Request('https://photobooth.hunghienhoa.com/api/frame-submissions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),env);
  assert.equal((await submit()).status,201);
  blocked=true;assert.equal((await submit()).status,429);assert.equal(saved,1);blocked=false;
  assert.equal(messages.length,1);
  assert.equal(messages[0].to,'hunghienhoa2110@gmail.com');
  assert.match(messages[0].text,/https:\/\/admin.hunghienhoa.com/);
  assert.ok(!JSON.stringify(messages[0]).includes('private@example.invalid'));
  assert.ok(!JSON.stringify(messages[0]).includes('imageDataUrl'));
  failEmail=true; assert.equal((await submit()).status,201);
  failInsert=true; assert.equal((await submit()).status,503);
  assert.equal(messages.length,1);
});

test('miền phụ được ánh xạ vào đúng thư mục giao diện', () => {
  assert.equal(new URL(assetRequest(new Request('https://admin.hunghienhoa.com/')).url).pathname, '/admin/');
  assert.equal(new URL(assetRequest(new Request('https://blog.hunghienhoa.com/style.css')).url).pathname, '/blog/style.css');
  assert.equal(new URL(assetRequest(new Request('https://photobooth.hunghienhoa.com/assets/star.svg')).url).pathname, '/photobooth/assets/star.svg');
  assert.equal(new URL(assetRequest(new Request('https://photobooth.hunghienhoa.com/shoot')).url).pathname, '/photobooth/shoot');
  assert.equal(assetRequest(new Request('https://photobooth.hunghienhoa.com/shoot/')).headers.get('location'), 'https://photobooth.hunghienhoa.com/shoot');
  assert.equal(assetRequest(new Request('https://hunghienhoa.com/blog/?bai=vui')).headers.get('location'), 'https://blog.hunghienhoa.com/?bai=vui');
  assert.equal(assetRequest(new Request('https://hunghienhoa.com/photobooth')).headers.get('location'), 'https://photobooth.hunghienhoa.com/');
  assert.equal(new URL(assetRequest(new Request('http://127.0.0.1:4180/blog/')).url).pathname, '/blog/');
  assert.equal(new URL(assetRequest(new Request('https://snap.hunghienhoa.com/')).url).pathname, '/snaptik/');
  assert.equal(new URL(assetRequest(new Request('https://snap.hunghienhoa.com/app.js?v=1')).url).pathname, '/snaptik/app.js');
  assert.equal(new URL(assetRequest(new Request('https://snap.hunghienhoa.com/fonts/BeVietnamPro-Bold.woff2')).url).pathname, '/fonts/BeVietnamPro-Bold.woff2');
  assert.equal(new URL(assetRequest(new Request('https://snap.hunghienhoa.com/assets/star.svg')).url).pathname, '/assets/star.svg');
  assert.equal(assetRequest(new Request('https://www.hunghienhoa.com/hello')).headers.get('location'), 'https://hunghienhoa.com/hello');
});

test('trình đọc JSON chặn sai định dạng và payload quá lớn', async () => {
  assert.deepEqual(await readJson(new Request('https://example.test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"ok":true}' })), { ok: true });
  await assert.rejects(() => readJson(new Request('https://example.test', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}' })), { status: 415 });
  await assert.rejects(() => readJson(new Request('https://example.test', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': '1600001' }, body: '{}' })), { status: 413 });
});

test('ảnh quản trị yêu cầu token đúng quyền và không được cache', async t => {
  const env = { SUPABASE_URL: 'https://database.example.test', SUPABASE_PUBLISHABLE_KEY: 'public-test-key', ADMIN_EMAIL: 'owner@example.test' };
  let email = env.ADMIN_EMAIL;
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url: String(url), options });
    if (new URL(url).pathname === '/auth/v1/user') return Response.json({ email });
    assert.equal(options.headers.Authorization, 'Bearer example-test-token');
    return Response.json([{ image_base64: fs.readFileSync('server/fixtures/frame.webp').toString('base64'), cover_base64: fs.readFileSync('server/fixtures/frame.webp').toString('base64') }]);
  });
  const url = 'https://admin.hunghienhoa.com/api/admin/submissions/test/image.webp';
  assert.equal((await worker.fetch(new Request(url), env)).status, 401);
  assert.equal(calls.length, 0);
  email = 'other@example.test';
  const request = path => new Request(path, { headers: { Authorization: 'Bearer example-test-token' } });
  assert.equal((await worker.fetch(request(url), env)).status, 403);
  email = env.ADMIN_EMAIL;
  for (const path of [url, 'https://admin.hunghienhoa.com/api/admin/posts/test/cover.webp']) {
    const response = await worker.fetch(request(path), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('content-type'), 'image/webp');
  }
});

test('từ chối bản chờ đã hết hạn không báo xóa thành công', async t => {
  let exists = false;
  const env = {SUPABASE_URL: 'https://database.example.test', SUPABASE_PUBLISHABLE_KEY: 'test', ADMIN_EMAIL: 'owner@example.test'};
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const parsed = new URL(url);
    if (parsed.pathname === '/auth/v1/user') return Response.json({email: env.ADMIN_EMAIL});
    assert.equal(parsed.pathname, '/rest/v1/frame_submissions');
    assert.equal(options.method, 'DELETE');
    assert.equal(options.headers.Prefer, 'return=representation');
    assert.equal(parsed.searchParams.get('select'), 'id');
    assert.ok(parsed.searchParams.get('expires_at').startsWith('gt.'));
    return Response.json(exists ? [{id: 'queued'}] : []);
  });
  const reject = () => worker.fetch(new Request('https://admin.hunghienhoa.com/api/admin/submissions/queued/reject', {method: 'POST', headers: {'Content-Type': 'application/json', Authorization: 'Bearer test'}, body: '{}'}), env);
  assert.equal((await reject()).status, 404);
  exists = true;
  assert.equal((await reject()).status, 200);
});

test('ảnh khung PNG và JPEG trả đúng Content-Type và dữ liệu',async t=>{
 let format='png';
 t.mock.method(globalThis,'fetch',async()=>Response.json([{image_base64:fs.readFileSync(`server/fixtures/frame-${format}.base64`,'utf8')}]));
 for(format of ['png','jpeg']) {
  const response=await worker.fetch(new Request('https://photobooth.hunghienhoa.com/api/frames/qa/image'),{SUPABASE_URL:'https://database.example.test',SUPABASE_PUBLISHABLE_KEY:'test'});
  assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),`image/${format}`);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()),Buffer.from(fs.readFileSync(`server/fixtures/frame-${format}.base64`,'utf8'),'base64'));
 }
});

test('lượt truy cập chỉ gửi mã băm, tải lại cùng trang không tăng lượt trong ngày', async () => {
  const {DatabaseSync}=await import('node:sqlite');
  const {VisitCounter}=await import('./visits.mjs');
  const db=new DatabaseSync(':memory:');
  const counter=new VisitCounter({storage:{sql:{exec:(q,...args)=>db.prepare(q).all(...args)}}});
  const calls=[];
  const env={ASSETS:{fetch:async()=>new Response('<html></html>',{headers:{'Content-Type':'text/html'}})},VISITS:{idFromName:()=>'',get:()=>({fetch:async(url,options)=>{calls.push(url);return counter.fetch(new Request(url,options));}})}};
  try {
    for(const ip of ['192.0.2.1','192.0.2.1','192.0.2.2']) {
      const response=await worker.fetch(new Request('https://hunghienhoa.com/',{headers:{'CF-Connecting-IP':ip,'User-Agent':'Browser'}}),env);
      assert.equal(response.status,200);
    }
    const summary=await (await counter.fetch(new Request('https://counter/summary'))).json();
    assert.equal(summary.total,2);
    assert.ok(calls.every(url=>/[?&]key=[a-f0-9]{64}$/.test(url)&&!url.includes('192.0.2.')));
  } finally {db.close();}
});


test('HTML giữ CSP và không cho tự chèn script thống kê', async () => {
 const env={ASSETS:{fetch:async()=>new Response('<!doctype html><title>Quản trị</title>',{headers:{'Content-Type':'text/html','Cache-Control':'public, max-age=0'}})}};
 const response=await worker.fetch(new Request('https://admin.hunghienhoa.com/'),env);
 assert.equal(response.status,200);
 assert.match(response.headers.get('Cache-Control'),/no-transform/);
 assert.ok(response.headers.get('Content-Security-Policy').includes("script-src 'self'"));
 assert.ok(!(await response.text()).includes('cloudflareinsights'));
});

test('HSTS, nén HTML theo Accept-Encoding và cache dài cho tệp có ?v=', async () => {
 const assets=new Map([
  ['/admin/','<!doctype html><title>Quản trị</title>'],
  ['/admin/style.css','body{}'],
  ['/admin/fonts/BeVietnamPro-Bold.woff2','wOF2'],
  ['/admin/assets/star.svg','<svg/>'],
  ['/admin/config.js','x']
 ]);
 const types={'.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml','.js':'text/javascript'};
 const env={ASSETS:{fetch:async request=>{const path=new URL(request.url).pathname;if(!assets.has(path))return new Response(null,{status:404});return new Response(assets.get(path),{headers:{'Content-Type':types[path.slice(path.lastIndexOf('.'))]||'text/html','Cache-Control':'public, max-age=0, must-revalidate'}});}}};
 const get=(path,headers={})=>worker.fetch(new Request('https://admin.hunghienhoa.com'+path,{headers}),env);
 const html=await get('/',{'Accept-Encoding':'gzip, deflate, br, zstd'});
 assert.equal(html.headers.get('Strict-Transport-Security'),'max-age=31536000');
 assert.equal(html.headers.get('Content-Encoding'),'br');
 assert.match(html.headers.get('Vary'),/Accept-Encoding/);
 assert.match(html.headers.get('Cache-Control'),/no-transform/);
 assert.equal((await get('/',{'Accept-Encoding':'gzip'})).headers.get('Content-Encoding'),'gzip');
 assert.equal((await get('/',{'Accept-Encoding':'br;q=0, gzip'})).headers.get('Content-Encoding'),'gzip');
 assert.equal((await get('/')).headers.get('Content-Encoding'),null);
 assert.equal((await get('/style.css?v=3')).headers.get('Cache-Control'),'public, max-age=31536000, immutable');
 assert.equal((await get('/style.css')).headers.get('Cache-Control'),'public, max-age=0, must-revalidate');
 assert.equal((await get('/config.js')).headers.get('Cache-Control'),'public, max-age=0, must-revalidate');
 assert.equal((await get('/fonts/BeVietnamPro-Bold.woff2')).headers.get('Cache-Control'),'public, max-age=2592000');
 assert.equal((await get('/assets/star.svg')).headers.get('Cache-Control'),'public, max-age=86400');
 assert.equal((await get('/style.css?v=3',{'Accept-Encoding':'br'})).headers.get('Content-Encoding'),null);
});

test('trang không tồn tại trả trang 404 tiếng Việt; favicon.ico chuyển về biểu tượng sao', async () => {
 const page=fs.readFileSync('dist/404.html','utf8');
 const env={ASSETS:{fetch:async request=>new URL(request.url).pathname==='/404'?new Response(page,{headers:{'Content-Type':'text/html'}}):new Response(null,{status:404})}};
 const missing=await worker.fetch(new Request('https://blog.hunghienhoa.com/khong-co',{headers:{Accept:'text/html,application/xhtml+xml'}}),env);
 assert.equal(missing.status,404);
 assert.equal(missing.headers.get('X-Robots-Tag'),'noindex');
 assert.match(missing.headers.get('Cache-Control'),/no-store/);
 assert.ok(missing.headers.get('Content-Security-Policy').includes("default-src 'self'"));
 assert.match(await missing.text(),/Trang này <em>lạc mất<\/em> rồi/);
 const image=await worker.fetch(new Request('https://blog.hunghienhoa.com/khong-co.webp',{headers:{Accept:'image/webp,*/*'}}),env);
 assert.equal(image.status,404);assert.equal(await image.text(),'');
 const icon=await worker.fetch(new Request('https://snap.hunghienhoa.com/favicon.ico'),env);
 assert.equal(icon.status,301);
 assert.equal(icon.headers.get('Location'),'https://snap.hunghienhoa.com/assets/star.svg');
 assert.equal(icon.headers.get('Strict-Transport-Security'),'max-age=31536000');
});
