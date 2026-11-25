import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../worker/index.mjs';

test('đăng bài tự động: Authorization Bearer được chuyển thành header x-agent-token cho hàm Supabase, lỗi được dịch gọn', async t => {
  const calls = [];
  let reply = () => Response.json({ id: 7, slug: 'bai-thu', status: 'published' });
  t.mock.method(globalThis, 'fetch', async (url, init) => { calls.push({ url: String(url), init }); return reply(); });
  const env = { SUPABASE_URL: 'https://db.example.test', SUPABASE_PUBLISHABLE_KEY: 'pub' };
  const send = (auth, body = { slug: 'bai-thu', title: 'Bài thử' }) => worker.fetch(new Request('https://blog.hunghienhoa.com/api/agent/publish', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) }, body: JSON.stringify(body) }), env);
  assert.equal((await send(null)).status, 401);
  assert.equal(calls.length, 0, 'thiếu mã thì không gọi Supabase');
  const ok = await send('Bearer ma-bi-mat');
  assert.deepEqual([ok.status, (await ok.json()).slug], [201, 'bai-thu']);
  assert.equal(calls[0].url, 'https://db.example.test/rest/v1/rpc/agent_publish_post');
  assert.deepEqual([calls[0].init.headers['x-agent-token'], calls[0].init.headers.apikey], ['ma-bi-mat', 'pub']);
  assert.deepEqual(JSON.parse(calls[0].init.body), { p_post: { slug: 'bai-thu', title: 'Bài thử' } });
  reply = () => Response.json({ message: 'unauthorized' }, { status: 401 });
  assert.equal((await send('Bearer sai')).status, 401);
  reply = () => Response.json({ message: 'daily limit reached' }, { status: 400 });
  const limit = await send('Bearer ma-bi-mat');
  assert.deepEqual([limit.status, (await limit.json()).error], [400, 'Không đăng được bài: daily limit reached']);
  assert.equal((await worker.fetch(new Request('https://blog.hunghienhoa.com/api/agent/publish'), env)).status, 405);
});
