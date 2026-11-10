import assert from 'node:assert/strict';
import test from 'node:test';
import worker, { assetRequest, readJson } from './index.mjs';

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
    return Response.json([{ image_base64: 'dGVzdA==', cover_base64: 'dGVzdA==' }]);
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
