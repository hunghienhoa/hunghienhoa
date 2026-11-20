import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { AI_CLIENT_LIMIT, AI_DAILY_LIMIT, AI_MODEL, aiStatus, claimAi, initAiQuota, parseAiRequest, runAi } from '../server/lamnet-ai.mjs';
import { createApp } from '../server/server.mjs';
import worker from '../worker/index.mjs';

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9]);
const jpegUrl = 'data:image/jpeg;base64,' + jpeg.toString('base64');
const enhance = { mode: 'enhance', consent: true, image: jpegUrl, width: 1024, height: 768 };
const status = async promise => { try { await promise; return 0; } catch (error) { return error.status; } };
// Binding Workers AI giả: ghi lại model và form multipart, trả ảnh JPEG hoặc ném lỗi như Workers AI thật.
function fakeAi(fail) {
  const calls = [];
  return { calls, run: async (model, input) => {
    const form = await new Response(input.multipart.body, { headers: { 'content-type': input.multipart.contentType } }).formData();
    calls.push({ model, form });
    if (fail) throw new Error(fail);
    return { image: jpeg.toString('base64') };
  } };
}

test('yêu cầu AI đám mây: bắt buộc đồng ý gửi ảnh, đúng định dạng thật, kích thước kết quả và câu lệnh có giới hạn', async () => {
  const parsed = value => status(Promise.resolve().then(() => parseAiRequest(value)));
  assert.equal(await parsed({ ...enhance, consent: undefined }), 400);
  assert.equal(await parsed({ ...enhance, image: 'data:image/png;base64,' + jpeg.toString('base64') }), 400);
  for (const [width, height] of [[1025, 768], [2048, 768], [128, 768], [1000, 768]]) assert.equal(await parsed({ ...enhance, width, height }), 400, `${width}x${height}`);
  assert.equal(await parsed({ mode: 'generate', prompt: 'x'.repeat(1001) }), 400);
  assert.equal(await parsed({ mode: 'generate', prompt: '   ' }), 400);
  assert.equal(await parsed({ mode: 'other' }), 400);
  const ok = parseAiRequest(enhance);
  assert.deepEqual([ok.mime, ok.image.equals(jpeg), ok.width, ok.height], ['image/jpeg', true, 1024, 768]);
  assert.deepEqual(parseAiRequest({ mode: 'generate', prompt: '  một chú mèo  ' }), { mode: 'generate', prompt: 'một chú mèo', width: 1024, height: 1024 });
});

test('lượt AI: mỗi người 3/ngày, cả website 30/ngày, lỗi thì trả lại lượt, sang ngày mới đếm lại', () => {
  const db = new DatabaseSync(':memory:'), sql = (query, ...params) => db.prepare(query).all(...params), now = Date.UTC(2026, 10, 20, 3);
  initAiQuota(sql);
  for (let i = 1; i <= AI_CLIENT_LIMIT; i++) assert.equal(claimAi(sql, 'a', now).remaining, AI_CLIENT_LIMIT - i);
  assert.deepEqual(claimAi(sql, 'a', now), { remaining: 0, reason: 'client' });
  assert.equal(claimAi(sql, 'a', now, true).remaining, 1);
  assert.equal(claimAi(sql, 'a', now).claimed, true);
  let used = AI_CLIENT_LIMIT, client = 0;
  while (used < AI_DAILY_LIMIT) { if (claimAi(sql, 'c' + Math.floor(client++ / AI_CLIENT_LIMIT), now).claimed) used++; }
  assert.deepEqual(claimAi(sql, 'moi', now), { remaining: 0, reason: 'global' });
  assert.equal(aiStatus(sql, 'moi', now).remaining, 0);
  assert.equal(aiStatus(sql, 'moi', now + 86400000).remaining, AI_CLIENT_LIMIT);
  assert.equal(claimAi(sql, 'a', now + 86400000).remaining, AI_CLIENT_LIMIT - 1);
  assert.equal(sql('SELECT COUNT(*) AS n FROM ai_quota WHERE day<?', '2026-11-21')[0].n, 0, 'xóa bộ đếm ngày cũ');
  assert.ok(AI_DAILY_LIMIT * 126 < 10000, 'trần mỗi ngày nằm trong 10.000 Neuron miễn phí');
});

test('Workers AI: gửi multipart đúng tên trường cho FLUX.2 [klein], lấy ảnh base64, lỗi đổi thành thông báo tiếng Việt', async t => {
  t.mock.method(console, 'error', () => {});
  const ai = fakeAi();
  const out = await runAi(parseAiRequest(enhance), ai);
  assert.equal(ai.calls[0].model, AI_MODEL);
  const form = ai.calls[0].form;
  assert.deepEqual([form.get('width'), form.get('height')], ['1024', '768']);
  assert.match(form.get('prompt'), /sharpen/i);
  assert.equal(Buffer.from(await form.get('input_image_0').arrayBuffer()).equals(jpeg), true);
  assert.deepEqual([out.mime, out.bytes.equals(jpeg)], ['image/jpeg', true]);
  await runAi(parseAiRequest({ mode: 'generate', prompt: 'một chú mèo' }), ai);
  assert.deepEqual([ai.calls[1].form.get('prompt'), ai.calls[1].form.get('width'), ai.calls[1].form.has('input_image_0')], ['một chú mèo', '1024', false]);
  const run = message => status(runAi(parseAiRequest({ mode: 'generate', prompt: 'x' }), fakeAi(message)));
  assert.equal(await run('4006: you have used up your daily free allocation of 10,000 neurons'), 503);
  assert.equal(await run('3030: Image was flagged by the NSFW filter'), 422);
  assert.equal(await run('5000: internal error'), 502);
  assert.equal(await status(runAi(parseAiRequest({ mode: 'generate', prompt: 'x' }), { run: async () => ({ image: Buffer.from('not image').toString('base64') }) })), 502);
  assert.equal(await status(runAi(parseAiRequest({ mode: 'generate', prompt: 'x' }), { run: async () => ({}) })), 422);
  assert.equal(await status(runAi(parseAiRequest({ mode: 'generate', prompt: 'x' }), undefined)), 503, 'chưa có binding thì báo chưa bật');
});

test('server cục bộ và Worker: cùng API /api/lamnet/ai, ảnh trả về no-store, hết lượt thì 429, lỗi thì trả lượt', async t => {
  t.mock.method(console, 'error', () => {});
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'hung-lamnet-ai-'));
  let down = false;
  const ai = { calls: 0, run: async () => { ai.calls++; if (down) throw new Error('5000: internal error'); return { image: jpeg.toString('base64') }; } };
  const app = createApp({ port: 0, dataDir: folder, ai });
  await app.listen();
  try {
    const local = 'http://127.0.0.1:' + app.server.address().port, url = local + '/api/lamnet/ai';
    const post = value => fetch(url, { method: 'POST', headers: { Origin: local, 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
    assert.deepEqual(await (await fetch(url)).json(), { remaining: 3, enabled: true });
    let response = await post(enhance);
    assert.deepEqual([response.status, response.headers.get('content-type'), response.headers.get('cache-control'), response.headers.get('x-lamnet-remaining')], [200, 'image/jpeg', 'no-store', '2']);
    assert.equal(Buffer.from(await response.arrayBuffer()).equals(jpeg), true);
    down = true;
    assert.equal((await post({ mode: 'generate', prompt: 'mèo' })).status, 502);
    down = false;
    assert.equal((await (await fetch(url)).json()).remaining, 2, 'lỗi thì trả lại lượt');
    assert.equal((await post({ ...enhance, consent: false })).status, 400, 'thiếu đồng ý');
    for (let i = 0; i < 2; i++) assert.equal((await post({ mode: 'generate', prompt: 'mèo' })).status, 200);
    assert.equal((await post({ mode: 'generate', prompt: 'mèo' })).status, 429);
    assert.equal(ai.calls, 4);
  } finally { await app.close(); fs.rmSync(folder, { recursive: true, force: true }); }

  const counts = { claims: 0, releases: 0 };
  const visits = { idFromName: () => '', get: () => ({ fetch: async address => {
    const pathname = new URL(address).pathname;
    if (pathname === '/ai-status') return Response.json({ remaining: 3 });
    if (pathname === '/ai') { counts.claims++; return Response.json({ remaining: 2, claimed: true }); }
    counts.releases++; return Response.json({ remaining: 3 });
  } }) };
  let calls = 0;
  const env = { VISITS: visits, AI: { run: async () => { if (++calls > 1) throw new Error('5000: internal error'); return { image: jpeg.toString('base64') }; } } };
  const request = (method, body) => new Request('https://lamnet.hunghienhoa.com/api/lamnet/ai', { method, headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.9' }, body: body && JSON.stringify(body) });
  assert.deepEqual(await (await worker.fetch(request('GET'), env)).json(), { remaining: 3, enabled: true });
  let response = await worker.fetch(request('POST', enhance), env);
  assert.deepEqual([response.status, response.headers.get('content-type'), response.headers.get('x-lamnet-remaining')], [200, 'image/jpeg', '2']);
  assert.match(response.headers.get('content-security-policy'), /default-src 'self'/);
  response = await worker.fetch(request('POST', { mode: 'generate', prompt: 'mèo' }), env);
  assert.equal(response.status, 502);
  assert.match((await response.json()).error, /AI đám mây đang gặp lỗi/, 'Worker giữ thông báo cụ thể thay vì câu lỗi chung');
  assert.deepEqual([counts.claims, counts.releases, calls], [2, 1, 2]);
  assert.deepEqual(await (await worker.fetch(request('GET'), { VISITS: visits })).json(), { remaining: 3, enabled: false }, 'không có binding AI thì báo chưa bật');
});
