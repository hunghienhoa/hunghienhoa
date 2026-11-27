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
  const submit=()=>worker.fetch(new Request('https://hunghienhoa.com/api/frame-submissions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),env);
  assert.equal((await submit()).status,201);
  blocked=true;assert.equal((await submit()).status,429);assert.equal(saved,1);blocked=false;
  assert.equal(messages.length,1);
  assert.equal(messages[0].to,'hunghienhoa2110@gmail.com');
  assert.match(messages[0].text,/https:\/\/admin\.hunghienhoa\.com\//);
  assert.ok(!JSON.stringify(messages[0]).includes('private@example.invalid'));
  assert.ok(!JSON.stringify(messages[0]).includes('imageDataUrl'));
  failEmail=true; assert.equal((await submit()).status,201);
  failInsert=true; assert.equal((await submit()).status,503);
  assert.equal(messages.length,1);
});

test('Làm Nét: tệp riêng trong /lamnet/, tệp dùng chung ở gốc; mọi phản hồi cho phép WebAssembly và cô lập nguồn gốc', async () => {
  // Một tên miền: tệp của Làm Nét nằm sẵn trong /lamnet/, tệp dùng chung được trang gọi bằng ../ nên đi thẳng tới gốc.
  for (const [path, mapped] of [['/lamnet/', '/lamnet/'], ['/lamnet/app.js?v=1', '/lamnet/app.js'], ['/lamnet/vendor/ort-1.22.0/ort.webgpu.min.mjs', '/lamnet/vendor/ort-1.22.0/ort.webgpu.min.mjs'], ['/lamnet/models/realesr-general-x4v3.onnx', '/lamnet/models/realesr-general-x4v3.onnx'], ['/footer.css?v=3', '/footer.css']])
    assert.equal(new URL(assetRequest(new Request('https://hunghienhoa.com' + path)).url).pathname, mapped, path);
  assert.equal(assetRequest(new Request('https://hunghienhoa.com/lamnet')).headers.get('location'), 'https://hunghienhoa.com/lamnet/');
  assert.equal(assetRequest(new Request('https://lamnet.hunghienhoa.com/')).headers.get('location'), 'https://hunghienhoa.com/lamnet/');
  const seen = [];
  const env = { ASSETS: { fetch: async request => { seen.push(new URL(request.url).pathname); return new Response('x', { headers: { 'Content-Type': 'application/wasm' } }); } } };
  const wasm = await worker.fetch(new Request('https://hunghienhoa.com/lamnet/vendor/ort-1.22.0/ort-wasm-simd-threaded.jsep.wasm'), env);
  assert.deepEqual(seen, ['/lamnet/vendor/ort-1.22.0/ort-wasm-simd-threaded.jsep.wasm']);
  assert.match(wasm.headers.get('Content-Security-Policy'), /script-src 'self' 'wasm-unsafe-eval'/);
  assert.equal(wasm.headers.get('Cross-Origin-Opener-Policy'), 'same-origin');
  assert.equal(wasm.headers.get('Cross-Origin-Embedder-Policy'), 'require-corp');
  assert.equal(wasm.headers.get('Cache-Control'), 'public, max-age=31536000, immutable');
  const other = await worker.fetch(new Request('https://hunghienhoa.com/snaptik/assets/star.svg'), env);
  assert.ok(!other.headers.get('Content-Security-Policy').includes('wasm-unsafe-eval') && !other.headers.has('Cross-Origin-Embedder-Policy'), 'Chỉ Làm Nét được nới CSP');
});
test('mỗi mục là một đường dẫn; subdomain cũ chuyển 308 về đường dẫn tương ứng', () => {
  // Trang quản trị có subdomain riêng: admin.hunghienhoa.com lấy tệp từ dist/admin, tài nguyên dùng chung vẫn ở gốc.
  for (const [path, mapped] of [['/', '/admin/'], ['/app.js?v=1', '/admin/app.js'], ['/style.css', '/admin/style.css'], ['/content-fields.json', '/admin/content-fields.json'], ['/ui.css?v=1', '/ui.css'], ['/fonts/BeVietnamPro-Bold.woff2', '/fonts/BeVietnamPro-Bold.woff2'], ['/api/admin/session', '/api/admin/session']])
    assert.equal(new URL(assetRequest(new Request('https://admin.hunghienhoa.com' + path)).url).pathname, mapped, path);
  assert.equal(assetRequest(new Request('https://admin.hunghienhoa.com/admin/')).headers.get('location'), 'https://admin.hunghienhoa.com/');
  assert.equal(new URL(assetRequest(new Request('https://hunghienhoa.com/blog/style.css')).url).pathname, '/blog/style.css');
  assert.equal(new URL(assetRequest(new Request('https://hunghienhoa.com/photobooth/assets/star.svg')).url).pathname, '/photobooth/assets/star.svg');
  assert.equal(new URL(assetRequest(new Request('https://hunghienhoa.com/photobooth/shoot')).url).pathname, '/photobooth/shoot');
  assert.equal(assetRequest(new Request('https://hunghienhoa.com/photobooth/shoot/')).headers.get('location'), 'https://hunghienhoa.com/photobooth/shoot');
  assert.equal(new URL(assetRequest(new Request('https://hunghienhoa.com/blog/?bai=vui')).url).pathname, '/blog/');
  for (const [old, next] of [['https://blog.hunghienhoa.com/?bai=vui', 'https://hunghienhoa.com/blog/?bai=vui'], ['https://hunghienhoa.com/admin/', 'https://admin.hunghienhoa.com/'], ['https://hunghienhoa.com/admin', 'https://admin.hunghienhoa.com/'], ['https://www.hunghienhoa.com/admin/index.html', 'https://admin.hunghienhoa.com/'], ['https://photobooth.hunghienhoa.com/shoot', 'https://hunghienhoa.com/photobooth/shoot'], ['https://snap.hunghienhoa.com/?x=1', 'https://hunghienhoa.com/snaptik/?x=1'], ['https://hunghienhoa.com/snap/', 'https://hunghienhoa.com/snaptik/'], ['https://lamnet.hunghienhoa.com/style.css', 'https://hunghienhoa.com/lamnet/style.css']])
    assert.equal(assetRequest(new Request(old)).headers.get('location'), next, old);
  assert.equal(assetRequest(new Request('https://hunghienhoa.com/photobooth')).headers.get('location'), 'https://hunghienhoa.com/photobooth/');
  assert.equal(new URL(assetRequest(new Request('http://127.0.0.1:4180/blog/')).url).pathname, '/blog/');
  assert.equal(new URL(assetRequest(new Request('https://hunghienhoa.com/snaptik/')).url).pathname, '/snaptik/');
  assert.equal(new URL(assetRequest(new Request('https://hunghienhoa.com/snaptik/app.js?v=1')).url).pathname, '/snaptik/app.js');
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
  const url = 'https://hunghienhoa.com/api/admin/submissions/test/image.webp';
  assert.equal((await worker.fetch(new Request(url), env)).status, 401);
  assert.equal(calls.length, 0);
  email = 'other@example.test';
  const request = path => new Request(path, { headers: { Authorization: 'Bearer example-test-token' } });
  assert.equal((await worker.fetch(request(url), env)).status, 403);
  email = env.ADMIN_EMAIL;
  for (const path of [url, 'https://hunghienhoa.com/api/admin/posts/test/cover.webp']) {
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
  const reject = () => worker.fetch(new Request('https://hunghienhoa.com/api/admin/submissions/queued/reject', {method: 'POST', headers: {'Content-Type': 'application/json', Authorization: 'Bearer test'}, body: '{}'}), env);
  assert.equal((await reject()).status, 404);
  exists = true;
  assert.equal((await reject()).status, 200);
});

test('ảnh khung PNG và JPEG trả đúng Content-Type và dữ liệu',async t=>{
 let format='png';
 t.mock.method(globalThis,'fetch',async()=>Response.json([{image_base64:fs.readFileSync(`server/fixtures/frame-${format}.base64`,'utf8')}]));
 for(format of ['png','jpeg']) {
  const response=await worker.fetch(new Request('https://hunghienhoa.com/api/frames/qa/image'),{SUPABASE_URL:'https://database.example.test',SUPABASE_PUBLISHABLE_KEY:'test'});
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
  ['/fonts/BeVietnamPro-Bold.woff2','wOF2'],
  ['/assets/star.svg','<svg/>'],
  ['/admin/config.js','x']
 ]);
 const types={'.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml','.js':'text/javascript'};
 const env={ASSETS:{fetch:async request=>{const path=new URL(request.url).pathname;if(!assets.has(path))return new Response(null,{status:404});return new Response(assets.get(path),{headers:{'Content-Type':types[path.slice(path.lastIndexOf('.'))]||'text/html','Cache-Control':'public, max-age=0, must-revalidate'}});}}};
 const get=(path,headers={})=>worker.fetch(new Request('https://admin.hunghienhoa.com'+path,{headers}),env);
 const html=await get('/',{'Accept-Encoding':'gzip, deflate, br, zstd'});
 assert.equal(html.headers.get('Strict-Transport-Security'),'max-age=63072000; includeSubDomains');
 assert.equal(html.headers.get('Cross-Origin-Opener-Policy'),'same-origin');
 assert.equal(html.headers.get('Cross-Origin-Resource-Policy'),'same-site');
 assert.match(html.headers.get('Content-Security-Policy'),/upgrade-insecure-requests/);
 assert.match(html.headers.get('Permissions-Policy'),/payment=\(\)/);
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
 const missing=await worker.fetch(new Request('https://hunghienhoa.com/blog/khong-co',{headers:{Accept:'text/html,application/xhtml+xml'}}),env);
 assert.equal(missing.status,404);
 assert.equal(missing.headers.get('X-Robots-Tag'),'noindex');
 assert.match(missing.headers.get('Cache-Control'),/no-store/);
 assert.ok(missing.headers.get('Content-Security-Policy').includes("default-src 'self'"));
 assert.match(await missing.text(),/Trang này <em>lạc mất rồi.<\/em>/);
 const image=await worker.fetch(new Request('https://hunghienhoa.com/blog/khong-co.webp',{headers:{Accept:'image/webp,*/*'}}),env);
 assert.equal(image.status,404);assert.equal(await image.text(),'');
 const icon=await worker.fetch(new Request('https://hunghienhoa.com/favicon.ico'),env);
 assert.equal(icon.status,301);
 assert.equal(icon.headers.get('Location'),'https://hunghienhoa.com/assets/star.svg');
 assert.equal(icon.headers.get('Strict-Transport-Security'),'max-age=63072000; includeSubDomains');
});

test('dữ liệu Supabase được cache tại edge; admin lưu thì xóa đúng khóa; ảnh media riêng không cache', async t => {
  const store = new Map();
  const fakeCache = {
    match: async request => store.get(request.url)?.clone() || undefined,
    put: async (request, response) => { store.set(request.url, response.clone()); },
    delete: async request => store.delete(request.url)
  };
  globalThis.caches = { default: fakeCache };
  t.after(() => { delete globalThis.caches; });
  const env = { SUPABASE_URL: 'https://database.example.test', SUPABASE_PUBLISHABLE_KEY: 'public-test-key', ADMIN_EMAIL: 'owner@example.test' };
  const rest = [];
  const webp = fs.readFileSync('server/fixtures/frame.webp').toString('base64');
  t.mock.method(globalThis, 'fetch', async (url, options = {}) => {
    const path = new URL(url).pathname;
    if (path === '/auth/v1/user') return Response.json({ email: env.ADMIN_EMAIL });
    rest.push(`${options.method || 'GET'} ${path}`);
    if (path.endsWith('/site_settings')) return Response.json([{ data: { displayName: 'Hùng Hiền Hòa' } }]);
    if (path.endsWith('/posts') && (options.method || 'GET') === 'GET') return Response.json([{ id: 7, slug: 'bai-mau', title: 'Bài', excerpt: 'Tóm tắt', content: 'Nội dung', category: 'Thử', tags: [], status: 'published', is_sample: false, created_at: '2026-11-18T00:00:00Z', published_at: '2026-11-18T00:00:00Z', has_cover: true, cover_base64: webp }]);
    if (path.endsWith('/posts')) return Response.json([{ id: 7, slug: 'bai-mau', title: 'Bài', excerpt: 'Tóm tắt', content: 'Nội dung', category: 'Thử', tags: [], status: 'published', is_sample: false, created_at: '2026-11-18T00:00:00Z', published_at: '2026-11-18T00:00:00Z', has_cover: true }]);
    if (path.endsWith('/media_assets')) return Response.json([{ image_base64: webp }]);
    return Response.json([]);
  });
  const get = path => worker.fetch(new Request('https://hunghienhoa.com' + path), env, { waitUntil: () => {} });
  const count = name => rest.filter(call => call === `GET /rest/v1/${name}`).length;

  for (let i = 0; i < 3; i++) assert.equal((await (await get('/api/site')).json()).displayName, 'Hùng Hiền Hòa');
  assert.equal(count('site_settings'), 1);
  for (let i = 0; i < 2; i++) assert.equal((await get('/api/posts/bai-mau')).status, 200);
  for (let i = 0; i < 2; i++) { const cover = await get('/api/posts/7/cover.webp'); assert.equal(cover.status, 200); assert.equal(cover.headers.get('content-type'), 'image/webp'); assert.equal(cover.headers.get('cache-control'), 'public, max-age=300'); }
  assert.equal(count('posts'), 2);
  for (let i = 0; i < 2; i++) assert.equal((await get('/api/media/11111111-1111-4111-8111-111111111111.webp')).headers.get('cache-control'), 'no-store');
  assert.equal(count('media_assets'), 2);
  assert.ok(![...store.keys()].some(key => key.includes('media')));

  const admin = (method, path, body) => worker.fetch(new Request('https://hunghienhoa.com' + path, { method, headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) }), env);
  const del = await admin('DELETE', '/api/admin/posts/7');
  assert.equal(del.status, 200);
  assert.ok(!store.has('https://hunghienhoa.com/__edge-cache/v1/post%3Abai-mau'));
  assert.ok(!store.has('https://hunghienhoa.com/__edge-cache/v1/cover%3A7'));
  assert.ok(store.has('https://hunghienhoa.com/__edge-cache/v1/site'));
  await get('/api/posts/bai-mau');
  assert.equal(count('posts'), 3, 'sau khi xóa phải đọc lại từ Supabase');
  await get('/api/site');
  assert.equal(count('site_settings'), 1, 'khóa không liên quan vẫn còn cache');
});

test('dữ liệu cache quá 60 giây vẫn trả ngay, làm mới phía sau cho lượt sau', async t => {
  const store = new Map();
  globalThis.caches = { default: { match: async request => store.get(request.url)?.clone(), put: async (request, response) => { store.set(request.url, response.clone()); }, delete: async request => store.delete(request.url) } };
  t.after(() => { delete globalThis.caches; });
  const env = { SUPABASE_URL: 'https://database.example.test', SUPABASE_PUBLISHABLE_KEY: 'public-test-key', ADMIN_EMAIL: 'owner@example.test' };
  let version = 'cũ', calls = 0;
  t.mock.method(globalThis, 'fetch', async url => { if (new URL(url).pathname.endsWith('/site_settings')) { calls++; return Response.json([{ data: { displayName: version } }]); } return Response.json([]); });
  const pending = [];
  const get = async () => (await (await worker.fetch(new Request('https://hunghienhoa.com/api/site'), env, { waitUntil: promise => pending.push(promise) })).json()).displayName;
  assert.equal(await get(), 'cũ');
  const key = 'https://hunghienhoa.com/__edge-cache/v1/site', saved = store.get(key), headers = new Headers(saved.headers);
  headers.set('X-Fetched-At', String(Date.now() - 120000));
  store.set(key, new Response(await saved.clone().text(), { headers }));
  version = 'mới';
  assert.equal(await get(), 'cũ', 'trả ngay bản đã lưu, không chờ Supabase');
  await Promise.all(pending);
  assert.equal(calls, 2, 'đã làm mới phía sau đúng một lần');
  assert.equal(await get(), 'mới');
  assert.equal(calls, 2, 'bản vừa làm mới còn hạn nên không gọi lại');
});

test('README và file test trong dist không được phục vụ công khai', async () => {
 const env={ASSETS:{fetch:async request=>{const path=new URL(request.url).pathname;return path==='/404'?new Response('<!doctype html><title>404</title>',{headers:{'Content-Type':'text/html'}}):new Response('bí mật nội bộ',{headers:{'Content-Type':'text/plain'}});}}};
 for(const url of ['https://hunghienhoa.com/blog/README.md','https://admin.hunghienhoa.com/README.md','https://hunghienhoa.com/photobooth/core.test.mjs','https://hunghienhoa.com/photobooth/design.test.mjs','https://hunghienhoa.com/blog/readme.md']){
  const response=await worker.fetch(new Request(url,{headers:{Accept:'text/html'}}),env);
  assert.equal(response.status,404,url);assert.ok(!(await response.text()).includes('bí mật nội bộ'),url);
 }
 assert.equal((await worker.fetch(new Request('https://hunghienhoa.com/photobooth/core.mjs'),env)).status,200);
});
