import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

function admin(hostname, handler) {
  const nodes = new Map(), storage = new Map(), requests = [], revoked = [], timers = new Map();
  let clock = Date.now(), timerId = 0, elementId = 0;
  function node(selector) {
    if (!nodes.has(selector)) nodes.set(selector, { value: '', hidden: false, textContent: '', handlers: {}, children: [], classList: { toggle() {} }, addEventListener(name, callback) { this.handlers[name] = callback; }, append(...children) { this.children.push(...children); }, reset() {}, replaceChildren(...children) { this.children = children; }, removeAttribute(name) { delete this[name]; } });
    return nodes.get(selector);
  }
  const TestURL = class extends URL {
    static createObjectURL() { return 'blob:private-poster'; }
    static revokeObjectURL(url) { revoked.push(url); }
  };
  const context = vm.createContext({
    location: { hostname, origin: `https://${hostname}` }, URL: TestURL, Blob, Date: class extends Date { static now() { return clock; } },
    document: { querySelector: node, querySelectorAll: () => [], createElement: () => node(`created-${elementId++}`) },
    window: { HUNG_SUPABASE: { url: 'https://database.example.test', key: 'public-test-key' }, addEventListener() {} },
    sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    fetch: async (path, options) => { requests.push({ path, options }); return handler(path, options); },
    setInterval() {}, setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, delay }); return id; }, clearTimeout(id) { timers.delete(id); }, console
  });
  vm.runInContext(readFileSync('dist/admin/app.js', 'utf8'), context);
  return { node, context, storage, requests, revoked, timers, setTime(value) { clock = value; } };
}

test('quản trị loopback dùng cookie/CSRF cục bộ và không gửi mật khẩu lên Supabase', async () => {
  const app = admin('127.0.0.1', path => path === '/api/admin/session'
    ? Response.json({ authenticated: false, needsSetup: true, setupAllowed: true })
    : Response.json({ error: 'Không tạo tài khoản trong kiểm thử.' }, { status: 400 }));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.node('#email').hidden, true);
  assert.equal(app.node('#auth-submit').textContent, 'Tạo mật khẩu');
  assert.equal(app.node('#password').minLength, 12);
  app.node('#password').value = 'fake-test-password';
  await app.node('#auth-form').handlers.submit({ preventDefault() {} });
  assert.equal(app.requests.at(-1).path, '/api/admin/setup');
  assert.equal(app.requests.at(-1).options.credentials, 'same-origin');
  assert.deepEqual(JSON.parse(app.requests.at(-1).options.body), { password: 'fake-test-password' });
  vm.runInContext("csrfToken = 'test-csrf'", app.context);
  await assert.rejects(vm.runInContext("api('/api/admin/site', { method: 'PUT', body: '{}' })", app.context));
  assert.equal(app.requests.at(-1).options.headers['X-CSRF-Token'], 'test-csrf');
  assert.ok(app.requests.every(request => !request.path.startsWith('https://')));
});

test('tài khoản online bị từ chối không giữ lại token', async () => {
  const app = admin('admin.hunghienhoa.com', path => path.startsWith('https://database.example.test')
    ? Response.json({ access_token: 'test-access', refresh_token: 'test-refresh', expires_in: 3600 })
    : Response.json({ error: 'Tài khoản chưa có quyền quản trị.' }, { status: 403 }));
  await new Promise(resolve => setImmediate(resolve));
  app.node('#email').value = 'other@example.test'; app.node('#password').value = 'fake-test-password';
  await app.node('#auth-form').handlers.submit({ preventDefault() {} });
  assert.equal(app.storage.size, 0);
  assert.equal(app.requests.at(-1).options.headers.Authorization, 'Bearer test-access');
  assert.match(app.node('#auth-status').textContent, /chưa có quyền/);
});

test('đăng nhập online không áp dụng quy tắc tạo mật khẩu và báo rõ lỗi xác nhận email', async () => {
  const html = readFileSync('dist/admin/index.html', 'utf8');
  const input = html.match(/<input\b[^>]*id="password"[^>]*>/)?.[0];
  assert.ok(input); assert.doesNotMatch(input, /minlength|maxlength/);
  for (const [code, expected] of [['email_not_confirmed', /chưa được xác nhận/], ['invalid_credentials', /tài khoản quản trị của Hùng/]]) {
    const app = admin('admin.hunghienhoa.com', () => Response.json({ error_code: code, msg: 'English server error' }, { status: 400 }));
    await new Promise(resolve => setImmediate(resolve));
    app.node('#email').value = 'owner@example.test'; app.node('#password').value = 'short';
    await app.node('#auth-form').handlers.submit({ preventDefault() {} });
    assert.equal(JSON.parse(app.requests[0].options.body).password, 'short');
    assert.match(app.node('#auth-status').textContent, expected);
    assert.equal(app.storage.size, 0);
  }
});

test('ảnh chờ duyệt được tải bằng Bearer token rồi giải phóng khi đăng xuất', async () => {
  const app = admin('admin.hunghienhoa.com', () => new Response('poster', { headers: { 'Content-Type': 'image/webp' } }));
  await new Promise(resolve => setImmediate(resolve));
  vm.runInContext("saveSession({ access_token: 'test-access', expires_at: Date.now() + 3600000 })", app.context);
  await vm.runInContext("setImage(document.querySelector('#preview'), '/api/admin/submissions/test/image.webp')", app.context);
  assert.equal(app.requests.at(-1).options.headers.Authorization, 'Bearer test-access');
  assert.equal(app.requests.at(-1).options.cache, 'no-store');
  assert.equal(app.node('#preview').src, 'blob:private-poster');
  vm.runInContext('showAuth()', app.context);
  assert.deepEqual(app.revoked, ['blob:private-poster']);
});

test('các yêu cầu đồng thời chỉ đổi token một lần và không khôi phục phiên đã đăng xuất', async () => {
  let finishRefresh;
  const app = admin('admin.hunghienhoa.com', path => path.startsWith('https://database.example.test')
    ? new Promise(resolve => { finishRefresh = resolve; }) : Response.json({ ok: true }));
  await new Promise(resolve => setImmediate(resolve));
  vm.runInContext("saveSession({ access_token: 'old-access', refresh_token: 'old-refresh', expires_at: Date.now() })", app.context);
  const parallel = vm.runInContext("Promise.all([api('/api/admin/posts'), api('/api/admin/frames'), api('/api/admin/site')])", app.context);
  assert.equal(app.requests.filter(request => request.path.includes('grant_type=refresh_token')).length, 1);
  finishRefresh(Response.json({ access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 3600 }));
  await parallel;
  assert.ok(app.requests.filter(request => request.path.startsWith('/api/')).every(request => request.options.headers.Authorization === 'Bearer new-access'));
  const secondRefresh = vm.runInContext('refreshSession()', app.context);
  vm.runInContext('saveSession(null); showAuth()', app.context);
  finishRefresh(Response.json({ access_token: 'must-not-return', refresh_token: 'unused', expires_in: 3600 }));
  assert.equal(await secondRefresh, false);
  assert.equal(app.storage.size, 0);
});

test('bản chờ hết hạn bị xóa khỏi bộ nhớ/giao diện và giải phóng ảnh ngay khi đến hạn', async () => {
  const app = admin('admin.hunghienhoa.com', () => Response.json({}));
  await new Promise(resolve => setImmediate(resolve));
  app.setTime(1000);
  vm.runInContext("submissions = [{ id: 'expired', authorContact: 'private@example.test', expiresAt: 2000 }]; privateImageUrls.add('blob:pending'); scheduleSubmissionExpiry()", app.context);
  const timer = [...app.timers.values()][0];
  assert.equal(timer.delay, 1000);
  app.setTime(2000); timer.callback();
  assert.equal(vm.runInContext('submissions.length', app.context), 0);
  assert.deepEqual(app.revoked, ['blob:pending']);
  assert.match(app.node('#submissions-list').children[0].textContent, /Chưa có khung/);
  vm.runInContext('showAuth()', app.context);
  assert.equal(app.timers.size, 0);
});

test('ảnh chờ trả về sau thời hạn không được gắn lại vào giao diện', async () => {
  let finishImage;
  const app = admin('admin.hunghienhoa.com', () => new Promise(resolve => { finishImage = resolve; }));
  await new Promise(resolve => setImmediate(resolve));
  app.setTime(1000);
  vm.runInContext("saveSession({ access_token: 'test-access', expires_at: 100000 })", app.context);
  const pendingImage = vm.runInContext("setImage(document.querySelector('#preview'), '/api/admin/submissions/test/image', 2000)", app.context);
  app.setTime(2000);
  finishImage(new Response('poster', { headers: { 'Content-Type': 'image/webp' } }));
  await pendingImage;
  assert.equal(app.node('#preview').src, undefined);
  assert.equal(vm.runInContext('privateImageUrls.size', app.context), 0);
});

test('làm mới danh sách không làm hỏng ảnh bìa nháp đang sửa; đăng xuất vẫn giải phóng ảnh', async () => {
  const app = admin('admin.hunghienhoa.com', () => Response.json({}));
  await new Promise(resolve => setImmediate(resolve));
  app.node('#cover-preview').hidden = false; app.node('#cover-preview').src = 'blob:draft-cover';
  vm.runInContext("privateImageUrls.add('blob:draft-cover'); privateImageUrls.add('blob:pending'); clearPrivateImages(true)", app.context);
  assert.deepEqual(app.revoked, ['blob:pending']);
  assert.equal(vm.runInContext('privateImageUrls.size', app.context), 1);
  vm.runInContext('showAuth()', app.context);
  assert.deepEqual(app.revoked, ['blob:pending', 'blob:draft-cover']);
});
