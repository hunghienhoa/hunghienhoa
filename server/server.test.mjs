import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './server.mjs';
import { decodeWebP, decodeFrameImage, imageMime, submission, HOUR, defaultSite } from './validation.mjs';

const folder = path.dirname(fileURLToPath(import.meta.url));
const frame = fs.readFileSync(path.join(folder, 'fixtures', 'frame.webp'));
const frameDataUrl = `data:image/webp;base64,${frame.toString('base64')}`;
for (const format of ['png','jpeg']) {
  const raw=fs.readFileSync(path.join(folder,`fixtures/frame-${format}.base64`),'utf8');
  const bytes=decodeFrameImage(`data:image/${format};base64,${raw}`);
  assert.equal(imageMime(bytes),`image/${format}`);
  assert.throws(()=>decodeFrameImage(`data:image/webp;base64,${raw}`),{status:400});
  assert.throws(()=>decodeFrameImage(`data:image/${format};base64,${bytes.subarray(0,-8).toString('base64')}`),{status:400});
}
assert.deepEqual(decodeWebP(frameDataUrl, true), frame);
for (const value of ['data:image/png;base64,AAAA', 'data:image/webp;base64,AAAA', `${frameDataUrl}!`]) assert.throws(() => decodeWebP(value), { status: 400 });
const design = { background: '#fbf2e3', ink: '#303487', accent: '#ffdc38', title: 'Khung thử', footer: 'Chỉ thiết kế', pattern: 'grid', sticker: 'star' };
const pending = { name: 'Khung kiểm tra', authorName: 'Tác giả thử', authorContact: 'private-only@example.test', authorLink: 'https://example.test/designer', consent: true, design, imageDataUrl: frameDataUrl };
assert.throws(() => submission({ ...pending, photos: ['private photo'] }), { status: 400 });
assert.throws(() => submission({ ...pending, consent: false }), { status: 400 });
assert.throws(() => submission({ ...pending, authorLink: 'javascript:alert(1)' }), { status: 400 });
assert.throws(() => submission({ ...pending, design: { ...design, photo: 'private' } }), { status: 400 });

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hung-api-test-'));
let clock = Date.now();
let app = createApp({ port: 0, dataDir, now: () => clock });
let base, cookie = '', csrf = '';
async function start() { await app.listen(); base = `http://127.0.0.1:${app.server.address().port}`; }
async function request(route, options = {}) {
  const method = options.method || 'GET';
  const headers = {};
  if (!options.anonymous && cookie) headers.Cookie = cookie;
  if (!['GET', 'HEAD'].includes(method)) {
    if (!options.noOrigin) headers.Origin = options.origin || base;
    headers['Content-Type'] = 'application/json';
    if (!options.noCsrf && csrf) headers['X-CSRF-Token'] = options.csrf || csrf;
  } else if (options.origin) headers.Origin = options.origin;
  if(route==='/api/frame-submissions' && options.body?.consent===true) app.db.prepare('DELETE FROM contribution_limits').run();
  const response = await fetch(base + route, { method, headers, ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}) });
  const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : Buffer.from(await response.arrayBuffer());
  return { response, data };
}
async function login() {
  const result = await request('/api/admin/login', { method: 'POST', body: { password: 'Isolated-test-password-123' }, anonymous: true });
  assert.equal(result.response.status, 200);
  cookie = result.response.headers.get('set-cookie').split(';')[0];
  csrf = result.data.csrfToken;
}
try {
  await start();
  assert.equal((await request('/api/health')).data.ok, true);
  assert.equal((await request('/api/admin/posts', { anonymous: true })).response.status, 401);
  assert.equal((await request('/api/admin/setup', { method: 'POST', noOrigin: true, body: { password: 'Isolated-test-password-123' } })).response.status, 403);
  assert.equal((await request('/api/admin/setup', { method: 'POST', origin: 'https://evil.example', body: { password: 'Isolated-test-password-123' } })).response.status, 403);
  const first = await request('/api/admin/session');
  assert.deepEqual(first.data, { authenticated: false, needsSetup: true, setupAllowed: true });
  const setup = await request('/api/admin/setup', { method: 'POST', body: { password: 'Isolated-test-password-123' } });
  assert.equal(setup.response.status, 201);
  assert.ok(setup.response.headers.get('set-cookie').includes('HttpOnly'));
  assert.ok(setup.response.headers.get('set-cookie').includes('SameSite=Strict'));
  cookie = setup.response.headers.get('set-cookie').split(';')[0];
  csrf = setup.data.csrfToken;
  assert.equal((await request('/api/admin/session')).data.authenticated, true);
  assert.equal((await request('/api/admin/setup', { method: 'POST', body: { password: 'Another-test-password' } })).response.status, 409);
  assert.equal((await request('/api/admin/site', { method: 'PUT', noCsrf: true, body: defaultSite })).response.status, 403);
  assert.equal((await request('/api/admin/site', { method: 'PUT', csrf: 'wrong', body: defaultSite })).response.status, 403);
  assert.equal((await request('/api/admin/site', { method: 'PUT', origin: 'https://evil.example', body: defaultSite })).response.status, 403);
  const editedSite = { ...defaultSite, intro: 'Một lời giới thiệu được cập nhật trong kiểm tra.' };
  assert.equal((await request('/api/admin/site', { method: 'PUT', body: editedSite })).response.status, 200);
  assert.equal((await request('/api/site')).data.intro, editedSite.intro);
  assert.equal((await request('/api/admin/analytics',{anonymous:true})).response.status,401);
  await fetch(base+'/'); await fetch(base+'/blog/');
  const views=(await request('/api/admin/analytics')).data;
  assert.equal(views.today,2); assert.equal(views.total,2);
  await fetch(base+'/',{method:'HEAD'});await fetch(base+'/',{headers:{'User-Agent':'test-crawler'}});
  assert.equal((await request('/api/admin/analytics')).data.total,2);
  const firstAdPage=await fetch(base+'/'),secondAdPage=await fetch(base+'/');
  assert.ok(firstAdPage.headers.get('content-security-policy').includes("'strict-dynamic'"));
  assert.notEqual(firstAdPage.headers.get('content-security-policy'),secondAdPage.headers.get('content-security-policy'));
  const adminPage=await fetch(base+'/admin/');
  assert.ok(adminPage.headers.get('content-security-policy').includes("script-src 'self'"));
  assert.ok(!(await adminPage.text()).includes('adsbygoogle'));
  const contentKey=JSON.parse(fs.readFileSync(new URL('../dist/content-fields.json',import.meta.url),'utf8'))[0].key;
  const customSite={...editedSite,pageTexts:{[contentKey]:'Nội dung đã tùy chỉnh'},theme:{cream:'#fff0df',blue:'#403080',yellow:'#ffcc33'}};
  assert.equal((await request('/api/admin/site',{method:'PUT',body:customSite})).response.status,200);
  assert.equal((await request('/api/site')).data.pageTexts[contentKey],'Nội dung đã tùy chỉnh');
  assert.equal((await request('/api/admin/site',{method:'PUT',body:{...customSite,pageTexts:{'bad-key':'x'}}})).response.status,400);
  assert.equal((await request('/api/posts')).data.posts.length, 3);
  assert.ok((await request('/api/posts')).data.posts.every(value => value.isSample));
  console.log('PASS: first-run setup, hashed password session, auth, CSRF, Origin and site editing.');

  const draft = { title: 'Bài thử có <nội dung>', slug: 'bai-thu', excerpt: 'Tóm tắt thử', content: '<img src=x onerror=alert(1)>\nChỉ là văn bản.', category: 'Kiểm tra', tags: ['thử'], status: 'draft', isSample: false, coverDataUrl: frameDataUrl };
  const created = await request('/api/admin/posts', { method: 'POST', body: draft });
  assert.equal(created.response.status, 201);
  const postId = created.data.post.id;
  assert.equal((await request('/api/posts/bai-thu', { anonymous: true })).response.status, 404);
  assert.equal((await request(`/api/posts/${postId}/cover.webp`, { anonymous: true })).response.status, 404);
  assert.equal((await request(`/api/admin/posts/${postId}/cover.webp`, { anonymous: true })).response.status, 401);
  assert.equal((await request(`/api/admin/posts/${postId}/cover.webp`)).response.status, 200);
  const published = await request(`/api/admin/posts/${postId}`, { method: 'PUT', body: { ...draft, status: 'published', coverDataUrl: undefined } });
  assert.equal(published.data.post.status, 'published');
  assert.equal((await request('/api/posts/bai-thu', { anonymous: true })).data.post.content, draft.content);
  const publicCover = await request(`/api/posts/${postId}/cover.webp`, { anonymous: true });
  assert.equal(publicCover.response.headers.get('content-type'), 'image/webp');
  assert.deepEqual(publicCover.data, frame);
  assert.equal((await request('/api/admin/posts', { method: 'POST', body: { ...draft, status: 'published' } })).response.status, 409);
  assert.equal((await request(`/api/admin/posts/${postId}`, { method: 'DELETE' })).response.status, 200);
  assert.equal((await request('/api/posts/bai-thu')).response.status, 404);
  console.log('PASS: draft isolation, publish/edit/delete, safe JSON text and protected draft covers.');

  const submitted = await request('/api/frame-submissions', { method: 'POST', body: pending, anonymous: true });
  assert.equal(submitted.response.status, 201);
  assert.equal(submitted.data.expiresAt, clock + HOUR);
  const pendingId = submitted.data.id;
  assert.equal((await request('/api/frames', { anonymous: true })).data.frames.length, 0);
  assert.equal((await request(`/api/frames/${pendingId}/image.webp`, { anonymous: true })).response.status, 404);
  assert.equal((await request(`/api/admin/submissions/${pendingId}/image.webp`, { anonymous: true })).response.status, 401);
  const queued = await request('/api/admin/submissions');
  assert.equal(queued.data.submissions[0].authorContact, pending.authorContact);
  assert.equal(queued.response.headers.get('cache-control'), 'no-store');
  assert.deepEqual((await request(queued.data.submissions[0].imageUrl)).data, frame);
  const approved = await request(`/api/admin/submissions/${pendingId}/approve`, { method: 'POST', body: {} });
  assert.equal(approved.response.status, 200);
  assert.equal(approved.data.frame.authorName, pending.authorName);
  assert.equal('authorContact' in approved.data.frame, false);
  assert.equal((await request('/api/admin/submissions')).data.submissions.length, 0);
  assert.equal(app.db.prepare('SELECT count(*) AS count FROM submissions').get().count, 0);
  assert.equal(fs.readFileSync(path.join(dataDir, 'content.sqlite')).includes(Buffer.from(pending.authorContact)), false);
  clock += HOUR + 1;
  app.cleanup();
  const kept = await request('/api/frames', { anonymous: true });
  assert.equal(kept.data.frames.length, 1);
  assert.equal(JSON.stringify(kept.data).includes(pending.authorContact), false);
  assert.equal((await request(kept.data.frames[0].imageUrl, { anonymous: true })).response.status, 200);
  console.log('PASS: pending posters are private; approval retains only public credit and clears private contact.');
  for(const format of ['png','jpeg']) {
    const raw=Buffer.from(fs.readFileSync(path.join(folder,`fixtures/frame-${format}.base64`),'utf8'),'base64');
    app.db.prepare('INSERT INTO frames VALUES(?,?,?,?,?,?,?)').run(`format-${format}`,'Khung thử','QA','',JSON.stringify(design),raw,clock);
    const result=await request(`/api/frames/format-${format}/image`,{anonymous:true});
    assert.equal(result.response.headers.get('content-type'),`image/${format}`);
    assert.deepEqual(result.data,raw);
    app.db.prepare('DELETE FROM frames WHERE id=?').run(`format-${format}`);
  }

  const expires = await request('/api/frame-submissions', { method: 'POST', body: { ...pending, authorContact: 'expires-soon@example.test' }, anonymous: true });
  const expiresId = expires.data.id;
  clock += HOUR - 1;
  assert.equal((await request(`/api/admin/submissions/${expiresId}/image.webp`)).response.status, 200);
  clock += 1;
  assert.equal((await request(`/api/admin/submissions/${expiresId}/approve`, { method: 'POST', body: {} })).response.status, 404);
  assert.equal((await request(`/api/admin/submissions/${expiresId}/image.webp`)).response.status, 404);
  assert.equal(app.db.prepare('SELECT count(*) AS count FROM submissions').get().count, 0);
  assert.equal(fs.readFileSync(path.join(dataDir, 'content.sqlite')).includes(Buffer.from('expires-soon@example.test')), false);
  const rejected = await request('/api/frame-submissions', { method: 'POST', body: pending, anonymous: true });
  assert.equal((await request(`/api/admin/submissions/${rejected.data.id}/reject`, { method: 'POST', body: {} })).response.status, 200);
  assert.equal((await request('/api/admin/submissions')).data.submissions.length, 0);
  const startupExpired = await request('/api/frame-submissions', { method: 'POST', body: pending, anonymous: true });
  assert.equal(startupExpired.response.status, 201);
  clock += HOUR;
  await app.close();
  app = createApp({ port: 0, dataDir, now: () => clock });
  await start();
  assert.equal(app.db.prepare('SELECT count(*) AS count FROM submissions').get().count, 0);
  assert.equal((await request('/api/frames')).data.frames.length, 1);
  assert.equal((await request('/private-data/content.sqlite')).response.status, 404);
  assert.equal((await request('/server/server.mjs')).response.status, 404);
  assert.equal((await request('/..%5cprivate-data%5ccontent.sqlite')).response.status, 404);
  assert.equal((await request('/api/site', { origin: 'https://evil.example' })).response.status, 403);
  console.log('PASS: one-hour expiry gates reads/approval immediately, deletes on startup and preserves approved frames.');

  await login();
  const removed = await request(`/api/admin/frames/${pendingId}`, { method: 'DELETE' });
  assert.equal(removed.response.status, 200);
  assert.equal((await request(`/api/frames/${pendingId}/image.webp`, { anonymous: true })).response.status, 404);
  assert.equal((await request('/api/admin/logout', { method: 'POST', body: {} })).response.status, 200);
  assert.equal((await request('/api/admin/posts')).response.status, 401);
  assert.equal(fs.readFileSync(path.join(dataDir, 'content.sqlite')).includes(Buffer.from('Isolated-test-password-123')), false);
  app.db.prepare('INSERT INTO submissions VALUES(?,?,?,?,?,?,?,?,?)').run('timer-test', pending.name, pending.authorName, 'timer-private@example.test', '', JSON.stringify(design), frame, clock, clock + 25);
  app.cleanup();
  clock += 25;
  await new Promise(resolve => setTimeout(resolve, 90));
  assert.equal(app.db.prepare('SELECT count(*) AS count FROM submissions').get().count, 0);
  assert.equal(fs.readFileSync(path.join(dataDir, 'content.sqlite')).includes(Buffer.from('timer-private@example.test')), false);
  assert.equal((await request('/api/admin/login', { method: 'POST', body: { password: 'x'.repeat(2 * 1024 * 1024 + 1) }, anonymous: true })).response.status, 413);
  for (let attempt = 0; attempt < 8; attempt++) assert.equal((await request('/api/admin/login', { method: 'POST', body: { password: 'Wrong-test-password-123' }, anonymous: true })).response.status, 401);
  assert.equal((await request('/api/admin/login', { method: 'POST', body: { password: 'Wrong-test-password-123' }, anonymous: true })).response.status, 429);
  for (let attempt = 0; attempt < 5; attempt++) assert.equal((await request('/api/frame-submissions', { method: 'POST', body: { ...pending, consent: false }, anonymous: true })).response.status, 400);
  assert.equal((await request('/api/frame-submissions', { method: 'POST', body: pending, anonymous: true })).response.status, 429);
  console.log('PASS: traversal/private-file blocking, frame removal, logout and no plaintext password.');
  console.log('PASS: timer-driven physical purge, body limits and auth/submission rate limits.');
} finally {
  await app.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
}

const publicData = fs.mkdtempSync(path.join(os.tmpdir(), 'hung-api-public-test-'));
const production = createApp({ port: 0, host: '127.0.0.1', dataDir: publicData, production: true });
try {
  await production.listen();
  const origin = `http://127.0.0.1:${production.server.address().port}`;
  const shoot = await fetch(origin + '/photobooth/shoot');
  assert.equal(shoot.status, 200);
  assert.match(await shoot.text(), /class="shoot-page"/);
  assert.equal((await fetch(origin + '/photobooth/shoot/', {redirect:'manual'})).status, 308);
  assert.equal((await (await fetch(origin + '/api/admin/session')).json()).setupAllowed, false);
  const response = await fetch(origin + '/api/admin/setup', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'Isolated-test-password-123' }) });
  assert.equal(response.status, 403);
  console.log('PASS: production cannot claim first admin without a bootstrap token.');
} finally { await production.close(); fs.rmSync(publicData, { recursive: true, force: true }); }
