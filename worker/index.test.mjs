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

test('ảnh khung PNG và JPEG trả đúng Content-Type và dữ liệu',async t=>{
 let format='png';
 t.mock.method(globalThis,'fetch',async()=>Response.json([{image_base64:fs.readFileSync(`server/fixtures/frame-${format}.base64`,'utf8')}]));
 for(format of ['png','jpeg']) {
  const response=await worker.fetch(new Request('https://photobooth.hunghienhoa.com/api/frames/qa/image'),{SUPABASE_URL:'https://database.example.test',SUPABASE_PUBLISHABLE_KEY:'test'});
  assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),`image/${format}`);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()),Buffer.from(fs.readFileSync(`server/fixtures/frame-${format}.base64`,'utf8'),'base64'));
 }
});
