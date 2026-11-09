import assert from 'node:assert/strict';
import test from 'node:test';
import { assetRequest, readJson } from './index.mjs';

test('miền phụ được ánh xạ vào đúng thư mục giao diện', () => {
  assert.equal(new URL(assetRequest(new Request('https://admin.hunghienhoa.com/')).url).pathname, '/admin/');
  assert.equal(new URL(assetRequest(new Request('https://blog.hunghienhoa.com/style.css')).url).pathname, '/blog/style.css');
  assert.equal(new URL(assetRequest(new Request('https://photobooth.hunghienhoa.com/assets/star.svg')).url).pathname, '/photobooth/assets/star.svg');
  assert.equal(new URL(assetRequest(new Request('https://hunghienhoa.com/blog/')).url).pathname, '/blog/');
  assert.equal(assetRequest(new Request('https://www.hunghienhoa.com/hello')).headers.get('location'), 'https://hunghienhoa.com/hello');
});

test('trình đọc JSON chặn sai định dạng và payload quá lớn', async () => {
  assert.deepEqual(await readJson(new Request('https://example.test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"ok":true}' })), { ok: true });
  await assert.rejects(() => readJson(new Request('https://example.test', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}' })), { status: 415 });
  await assert.rejects(() => readJson(new Request('https://example.test', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': '1600001' }, body: '{}' })), { status: 413 });
});
