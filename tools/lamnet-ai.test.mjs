import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { AI_CLIENT_LIMIT, AI_DAILY_LIMIT, AI_MODELS, aiStatus, claimAi, initAiQuota, parseAiRequest, runAi } from '../server/lamnet-ai.mjs';
import { createApp } from '../server/server.mjs';
import worker from '../worker/index.mjs';

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9]);
const jpegUrl = 'data:image/jpeg;base64,' + jpeg.toString('base64');
const status = async promise => { try { await promise; return 0; } catch (error) { return error.status; } };
const geminiReply = () => Response.json({ candidates: [{ content: { parts: [{ text: 'ok' }, { inlineData: { mimeType: 'image/jpeg', data: jpeg.toString('base64') } }] } }] });
const geminiDown = () => Response.json({ error: { code: 500, status: 'INTERNAL', message: 'x' } }, { status: 500 });

test('yêu cầu AI: chỉ nhận Gemini, bắt buộc đồng ý gửi ảnh, đúng định dạng thật, câu lệnh có giới hạn', async () => {
  const parsed = value => status(Promise.resolve().then(() => parseAiRequest(value)));
  assert.equal(await parsed({ provider: 'gemini', mode: 'enhance', image: jpegUrl }), 400);
  assert.equal(await parsed({ provider: 'gemini', mode: 'enhance', consent: true, image: 'data:image/png;base64,' + jpeg.toString('base64') }), 400);
  assert.equal(await parsed({ provider: 'openai', mode: 'generate', prompt: 'mèo' }), 400);
  assert.equal(await parsed({ provider: 'gemini', mode: 'generate', prompt: 'x'.repeat(1001) }), 400);
  assert.equal(await parsed({ provider: 'gemini', mode: 'generate', prompt: '   ' }), 400);
  const ok = parseAiRequest({ provider: 'gemini', mode: 'enhance', consent: true, image: jpegUrl });
  assert.deepEqual([ok.mime, ok.image.equals(jpeg)], ['image/jpeg', true]);
  assert.equal(parseAiRequest({ provider: 'gemini', mode: 'generate', prompt: '  một chú mèo  ' }).prompt, 'một chú mèo');
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
});

test('Gemini: gửi ảnh và câu lệnh đúng định dạng REST, lấy ảnh trả về, lỗi đổi thành thông báo tiếng Việt', async t => {
  t.mock.method(console, 'error', () => {});
  const calls = [];
  const out = await runAi(parseAiRequest({ provider: 'gemini', mode: 'enhance', consent: true, image: jpegUrl }), { gemini: 'gk' }, async (url, init) => { calls.push({ url, init }); return geminiReply(); });
  assert.equal(calls[0].url, `https://generativelanguage.googleapis.com/v1/models/${AI_MODELS.gemini}:generateContent`);
  assert.equal(calls[0].init.headers['x-goog-api-key'], 'gk');
  const body = JSON.parse(calls[0].init.body);
  assert.deepEqual(body.generationConfig.responseModalities, ['IMAGE']);
  assert.equal(body.contents[0].parts[1].inline_data.data, jpeg.toString('base64'));
  assert.match(body.contents[0].parts[0].text, /sharpen/i);
  assert.deepEqual([out.mime, out.bytes.equals(jpeg)], ['image/jpeg', true]);
  await runAi({ provider: 'gemini', mode: 'generate', prompt: 'một chú mèo' }, { gemini: 'gk' }, async (url, init) => { calls.push({ url, init }); return geminiReply(); });
  assert.deepEqual(JSON.parse(calls[1].init.body).contents[0].parts, [{ text: 'một chú mèo' }]);
  const run = fetchImpl => status(runAi({ provider: 'gemini', mode: 'generate', prompt: 'x' }, { gemini: 'gk' }, fetchImpl));
  assert.equal(await run(async () => Response.json({ promptFeedback: { blockReason: 'SAFETY' } })), 422, 'bị chặn vì an toàn');
  assert.equal(await run(async () => Response.json({ error: { status: 'PERMISSION_DENIED', message: 'x' } }, { status: 403 })), 503, 'khóa sai');
  assert.equal(await run(async () => Response.json({ error: { status: 'RESOURCE_EXHAUSTED', message: 'x' } }, { status: 429 })), 503, 'hết hạn mức');
  assert.equal(await run(geminiDown), 502);
  assert.equal(await run(async () => Response.json({ candidates: [{ content: { parts: [{ inlineData: { data: Buffer.from('not image').toString('base64') } }] } }] })), 502);
  assert.equal(await status(runAi({ provider: 'gemini', mode: 'generate', prompt: 'x' }, {}, geminiReply)), 503, 'chưa có khóa thì báo chưa bật');
});

test('server cục bộ và Worker: cùng API /api/lamnet/ai, ảnh trả về no-store, hết lượt thì 429, lỗi thì trả lượt', async t => {
  t.mock.method(console, 'error', () => {});
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'hung-lamnet-ai-'));
  let calls = 0, down = false;
  const app = createApp({ port: 0, dataDir: folder, aiKeys: { gemini: 'gk' }, aiFetch: async () => { calls++; return down ? geminiDown() : geminiReply(); } });
  await app.listen();
  try {
    const local = 'http://127.0.0.1:' + app.server.address().port, url = local + '/api/lamnet/ai';
    const post = value => fetch(url, { method: 'POST', headers: { Origin: local, 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
    assert.deepEqual(await (await fetch(url)).json(), { remaining: 3, providers: { gemini: true } });
    let response = await post({ provider: 'gemini', mode: 'enhance', consent: true, image: jpegUrl });
    assert.deepEqual([response.status, response.headers.get('content-type'), response.headers.get('cache-control'), response.headers.get('x-lamnet-remaining')], [200, 'image/jpeg', 'no-store', '2']);
    assert.equal(Buffer.from(await response.arrayBuffer()).equals(jpeg), true);
    down = true;
    assert.equal((await post({ provider: 'gemini', mode: 'generate', prompt: 'mèo' })).status, 502);
    down = false;
    assert.equal((await (await fetch(url)).json()).remaining, 2, 'lỗi thì trả lại lượt');
    assert.equal((await post({ provider: 'gemini', mode: 'enhance', image: jpegUrl })).status, 400, 'thiếu đồng ý');
    for (let i = 0; i < 2; i++) assert.equal((await post({ provider: 'gemini', mode: 'generate', prompt: 'mèo' })).status, 200);
    assert.equal((await post({ provider: 'gemini', mode: 'generate', prompt: 'mèo' })).status, 429);
    assert.equal(calls, 4);
  } finally { await app.close(); fs.rmSync(folder, { recursive: true, force: true }); }

  const counts = { claims: 0, releases: 0 };
  const env = { GEMINI_API_KEY: 'gk', VISITS: { idFromName: () => '', get: () => ({ fetch: async address => {
    const pathname = new URL(address).pathname;
    if (pathname === '/ai-status') return Response.json({ remaining: 3 });
    if (pathname === '/ai') { counts.claims++; return Response.json({ remaining: 2, claimed: true }); }
    counts.releases++; return Response.json({ remaining: 3 });
  } }) } };
  const request = (method, body) => new Request('https://lamnet.hunghienhoa.com/api/lamnet/ai', { method, headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.9' }, body: body && JSON.stringify(body) });
  let geminiCalls = 0;
  t.mock.method(globalThis, 'fetch', async () => (++geminiCalls === 1 ? geminiReply() : geminiDown()));
  assert.deepEqual(await (await worker.fetch(request('GET'), env)).json(), { remaining: 3, providers: { gemini: true } });
  let response = await worker.fetch(request('POST', { provider: 'gemini', mode: 'enhance', consent: true, image: jpegUrl }), env);
  assert.deepEqual([response.status, response.headers.get('content-type'), response.headers.get('x-lamnet-remaining')], [200, 'image/jpeg', '2']);
  assert.match(response.headers.get('content-security-policy'), /default-src 'self'/);
  response = await worker.fetch(request('POST', { provider: 'gemini', mode: 'generate', prompt: 'mèo' }), env);
  assert.equal(response.status, 502);
  assert.match((await response.json()).error, /Gemini đang gặp lỗi/, 'Worker giữ thông báo cụ thể thay vì câu lỗi chung');
  assert.deepEqual([counts.claims, counts.releases, geminiCalls], [2, 1, 2]);
  assert.equal((await worker.fetch(request('GET'), { VISITS: env.VISITS })).status, 200, 'không có khóa thì vẫn trả trạng thái');
});
