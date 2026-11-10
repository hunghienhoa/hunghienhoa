import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { initVisits, recordVisit, visitSummary, pageForVisit } from './visits.mjs';
import { adsenseHtml } from './adsense.mjs';
import {agentRoute,pageContext,representation,markdown404,decorateHtml} from './agent-content.mjs';
import { HOUR, fail, keys, text, password, defaultSite, siteSettings, submission, post } from './validation.mjs';

const derive = promisify(scrypt);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sessionLifetime = 8 * HOUR;
const hash = value => createHash('sha256').update(value).digest('hex');
const loopback = value => ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'].includes(value);
const seedPosts = [
  { title: 'Một tấm ảnh giữ lại chuyện nhỏ', slug: 'mot-tam-anh-giu-lai-chuyen-nho', category: 'Góc nhìn', excerpt: 'Có những điều rất bình thường, nhưng khi được đặt trong một khung ảnh lại khiến ta muốn nhìn lâu hơn.', content: 'Một góc bàn có nắng, một chiếc bóng trên tường, một gương mặt vừa bật cười. Chụp ảnh không nhất thiết bắt đầu từ một khung cảnh đặc biệt. Đôi khi điều đáng giữ lại nằm ngay trong ngày bình thường.\n\nThử chụp bốn tấm ở cùng một chỗ, mỗi tấm thay đổi một chi tiết: góc nhìn, ánh sáng, khoảng cách hoặc biểu cảm. Đặt chúng cạnh nhau, bạn sẽ có một câu chuyện nhỏ thay vì bốn hình giống hệt.\n\nKhông cần tìm bức ảnh hoàn hảo. Hãy tìm một chi tiết khiến mình muốn nhớ. Đây là bài viết mẫu để khởi động góc chia sẻ; Hùng có thể sửa hoặc thay bằng câu chuyện của mình.', tags: ['Chụp ảnh', 'Quan sát'] },
  { title: 'Nhặt ý tưởng từ bảng màu quanh mình', slug: 'nhat-y-tuong-tu-bang-mau-quanh-minh', category: 'Sáng tạo', excerpt: 'Một bảng màu thú vị có thể bắt đầu từ cốc trà, chiếc vé xe hoặc ánh chiều ngoài cửa sổ.', content: 'Khi bí ý tưởng, thử nhìn quanh và chọn ba màu đang ở gần nhau. Không cần biết tên màu thật chuẩn: một màu nền, một màu nổi bật và một màu nối hai màu còn lại.\n\nBạn có thể vẽ ba ô màu nhỏ rồi thử đặt một câu ngắn lên đó. Đổi vai trò của từng màu để xem cảm giác thay đổi ra sao. Cùng một bộ màu có thể trở nên yên tĩnh hoặc vui nhộn chỉ bằng cách đổi tỷ lệ.\n\nĐiều thú vị của bài tập này là không có đáp án duy nhất. Bảng màu tốt là bảng màu giúp câu chuyện của bạn rõ hơn. Đây là bài minh họa, chưa phải nhật ký hay dự án thực tế của Hùng.', tags: ['Màu sắc', 'Ý tưởng'] },
  { title: 'Khi chụp ảnh trở thành một cuộc chơi', slug: 'khi-chup-anh-tro-thanh-mot-cuoc-choi', category: 'Thử một chút', excerpt: 'Bốn tấm ảnh, bốn biểu cảm và một lời nhắn: đôi khi chừng ấy đã đủ làm một ngày vui hơn.', content: 'Đặt một luật chơi thật đơn giản trước khi chụp: mỗi tấm phải có một biểu cảm khác nhau, hoặc chỉ thay đổi vị trí của đôi tay. Luật càng nhỏ, bạn càng dễ bắt đầu.\n\nSau khi chụp, thử một khung giấy kem và một khung màu đậm. Hãy để màu của khung làm nền cho gương mặt, thay vì lấn át ảnh. Một lời nhắn ngắn ở cuối dải ảnh có thể biến nó thành một tấm thiệp.\n\nẢnh đẹp không nhất thiết là ảnh nghiêm túc. Bạn có thể bắt đầu bằng việc thấy thoải mái trước máy ảnh. Nội dung này là bài viết mẫu để Hùng tiếp tục biên tập.', tags: ['Hộp Ảnh', 'Kỷ niệm'] }
];

export function createApp(options = {}) {
  const host = options.host ?? process.env.HOST ?? '127.0.0.1';
  const port = Number(options.port ?? process.env.PORT ?? 4180);
  const production = options.production ?? process.env.NODE_ENV === 'production';
  // Local pending submissions must not be copied into the OneDrive source checkout.
  const defaultDataDir = process.platform === 'win32' && process.env.LOCALAPPDATA && !production ? path.join(process.env.LOCALAPPDATA, 'HungHienHoa', 'portfolio-data') : path.join(root, 'private-data');
  const dataDir = path.resolve(options.dataDir ?? process.env.DATA_DIR ?? defaultDataDir);
  const dist = path.resolve(options.distDir ?? path.join(root, 'dist'));
  const now = options.now ?? Date.now;
  const bootstrapToken = options.bootstrapToken ?? process.env.ADMIN_SETUP_TOKEN ?? '';
  const extraOrigins = options.allowedOrigins ?? (process.env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
  if (bootstrapToken && bootstrapToken.length < 32) throw new Error('ADMIN_SETUP_TOKEN cần ít nhất 32 ký tự ngẫu nhiên.');
  for (const origin of extraOrigins) {
    let parsed;
    try { parsed = new URL(origin); } catch { throw new Error('ALLOWED_ORIGINS cần chứa các origin HTTP/HTTPS đầy đủ.'); }
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.origin !== origin || parsed.username || parsed.password) throw new Error('ALLOWED_ORIGINS không chấp nhận wildcard hoặc đường dẫn.');
  }
  const dataRelativeToDist = path.relative(dist, dataDir);
  if (!dataRelativeToDist.startsWith('..') && !path.isAbsolute(dataRelativeToDist)) throw new Error('Thư mục dữ liệu riêng phải nằm ngoài dist.');
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path.join(dataDir, 'content.sqlite'));
  const visitSQL = (query, ...params) => /^SELECT/i.test(query) ? db.prepare(query).all(...params) : (db.prepare(query).run(...params), []);
  initVisits(visitSQL);
  db.exec(`PRAGMA journal_mode=DELETE; PRAGMA secure_delete=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,csrf TEXT NOT NULL,expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS posts(id TEXT PRIMARY KEY,slug TEXT UNIQUE NOT NULL,title TEXT NOT NULL,excerpt TEXT NOT NULL,content TEXT NOT NULL,category TEXT NOT NULL,tags TEXT NOT NULL,status TEXT NOT NULL,is_sample INTEGER NOT NULL,cover BLOB,created_at INTEGER NOT NULL,published_at INTEGER);
    CREATE TABLE IF NOT EXISTS submissions(id TEXT PRIMARY KEY,name TEXT NOT NULL,author_name TEXT NOT NULL,author_contact TEXT NOT NULL,author_link TEXT NOT NULL,design TEXT NOT NULL,image BLOB NOT NULL,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS submissions_expiry ON submissions(expires_at);
    CREATE TABLE IF NOT EXISTS frames(id TEXT PRIMARY KEY,name TEXT NOT NULL,author_name TEXT NOT NULL,author_link TEXT NOT NULL,design TEXT NOT NULL,image BLOB NOT NULL,created_at INTEGER NOT NULL);`);
  db.prepare('INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)').run('site', JSON.stringify(defaultSite));
  if (!db.prepare('SELECT value FROM settings WHERE key=?').get('seeded')) {
    for (const seed of seedPosts) db.prepare('INSERT INTO posts VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(randomUUID(), seed.slug, seed.title, seed.excerpt, seed.content, seed.category, JSON.stringify(seed.tags), 'published', 1, null, now(), now());
    db.prepare('INSERT INTO settings(key,value) VALUES(?,?)').run('seeded', 'true');
  }
  try { fs.chmodSync(path.join(dataDir, 'content.sqlite'), 0o600); } catch {}
  const limits = new Map();
  let expiryTimer;
  let closed = false;
  function cleanup() {
    db.prepare('DELETE FROM submissions WHERE expires_at<=?').run(now());
    db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(now());
    for (const [key, value] of limits) if (value.until <= now()) limits.delete(key);
  }
  function schedule() {
    clearTimeout(expiryTimer);
    if (closed) return;
    const next = db.prepare('SELECT MIN(expires_at) AS next FROM (SELECT expires_at FROM submissions UNION ALL SELECT expires_at FROM sessions)').get().next;
    if (next !== null) {
      expiryTimer = setTimeout(() => { cleanup(); schedule(); }, Math.min(2147483647, Math.max(1, Number(next) - now())));
      expiryTimer.unref();
    }
  }
  cleanup();
  schedule();
  function rateLimit(req, name, maximum, windowMs) {
    const key = `${name}:${req.socket.remoteAddress}`;
    let value = limits.get(key);
    if (!value || value.until <= now()) value = { count: 0, until: now() + windowMs };
    value.count++;
    limits.set(key, value);
    if (value.count > maximum || limits.size > 10000) fail(429, 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.');
  }
  function getSetting(key) { return db.prepare('SELECT value FROM settings WHERE key=?').get(key)?.value; }
  function setSetting(key, value) { db.prepare('INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, value); }
  function activeSession(req) {
    const token = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith('hung_admin='))?.slice(11);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    return db.prepare('SELECT * FROM sessions WHERE token_hash=? AND expires_at>?').get(hash(token), now()) || null;
  }
  function sessionCookie(res, token, age) { res.setHeader('Set-Cookie', `hung_admin=${token}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${age}${production ? '; Secure' : ''}`); }
  function startSession(res) {
    const token = randomBytes(32).toString('hex'), csrf = randomBytes(32).toString('hex');
    db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token), csrf, now() + sessionLifetime);
    sessionCookie(res, token, sessionLifetime / 1000);
    schedule();
    return { authenticated: true, csrfToken: csrf };
  }
  function auth(req, write = false) {
    const session = activeSession(req);
    if (!session) fail(401, 'Vui lòng đăng nhập quản trị.');
    if (write && req.headers['x-csrf-token'] !== session.csrf) fail(403, 'Phiên xác thực thao tác chưa hợp lệ. Hãy tải lại trang.');
    return session;
  }
  async function body(req) {
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) fail(415, 'Chỉ nhận dữ liệu JSON.');
    if (Number(req.headers['content-length'] || 0) > 2 * 1024 * 1024) fail(413, 'Dữ liệu gửi lên quá lớn.');
    let size = 0;
    const chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 2 * 1024 * 1024) fail(413, 'Dữ liệu gửi lên quá lớn.');
      chunks.push(chunk);
    }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { fail(400, 'Dữ liệu JSON chưa hợp lệ.'); }
  }
  function postData(row, admin = false) {
    return { id: row.id, slug: row.slug, title: row.title, excerpt: row.excerpt, content: row.content, category: row.category, tags: JSON.parse(row.tags), publishedAt: row.published_at, isSample: !!row.is_sample, coverUrl: row.cover ? `${admin ? '/api/admin' : '/api'}/posts/${row.id}/cover.webp` : null, ...(admin ? { status: row.status, createdAt: row.created_at } : {}) };
  }
  function frameData(row) { return { id: row.id, name: row.name, authorName: row.author_name, authorLink: row.author_link, design: JSON.parse(row.design), imageUrl: `/api/frames/${row.id}/image.webp`, createdAt: row.created_at }; }
  function pendingData(row) { return { id: row.id, name: row.name, authorName: row.author_name, authorContact: row.author_contact, authorLink: row.author_link, design: JSON.parse(row.design), imageUrl: `/api/admin/submissions/${row.id}/image.webp`, createdAt: row.created_at, expiresAt: row.expires_at }; }
  function json(res, value, code = 200) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); }
  function image(res, value, privateImage = false) {
    res.writeHead(200, { 'Content-Type': 'image/webp', 'Content-Length': value.length, 'Cache-Control': privateImage ? 'no-store' : 'public, max-age=3600', 'Cross-Origin-Resource-Policy': privateImage ? 'same-origin' : 'cross-origin' });
    res.end(Buffer.from(value));
  }
  function origins() {
    const address = server.address();
    const activePort = typeof address === 'object' && address ? address.port : port;
    return new Set([`http://127.0.0.1:${activePort}`, `http://localhost:${activePort}`, `http://[::1]:${activePort}`, ...extraOrigins]);
  }
  const types = { '.wasm': 'application/wasm', '.tflite': 'application/octet-stream', '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon' };
  async function handle(req, res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy', `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: ${extraOrigins.join(' ')}; font-src 'self'; connect-src 'self' ${extraOrigins.join(' ')}; media-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`);
    const origin = req.headers.origin;
    if (origin && origins().has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
    }
    const url = new URL(req.url, 'http://localhost');
    let route;
    try { route = decodeURIComponent(url.pathname); } catch { fail(400, 'Đường dẫn chưa hợp lệ.'); }
    if (route.startsWith('/api/')) {
      if (origin && !origins().has(origin)) fail(403, 'Nguồn truy cập chưa được cho phép.');
      if (req.method === 'OPTIONS') {
        if (!origin || !origins().has(origin)) fail(403, 'Nguồn truy cập chưa được cho phép.');
        res.writeHead(204, { 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,X-CSRF-Token', 'Access-Control-Max-Age': '600' }); return res.end();
      }
      if (!['GET', 'HEAD'].includes(req.method) && (!origin || !origins().has(origin))) fail(403, 'Nguồn thao tác chưa được cho phép.');
      cleanup();
      if (req.method === 'GET' && route === '/api/health') return json(res, { ok: true });
      if (req.method === 'GET' && route === '/api/site') return json(res, JSON.parse(getSetting('site')));
      if (req.method === 'GET' && route === '/api/posts') return json(res, { posts: db.prepare("SELECT * FROM posts WHERE status='published' ORDER BY published_at DESC,id").all().map(row => postData(row)) });
      let match = route.match(/^\/api\/posts\/([^/]+)\/cover\.webp$/);
      if (req.method === 'GET' && match) {
        const row = db.prepare("SELECT cover FROM posts WHERE id=? AND status='published'").get(match[1]);
        if (!row?.cover) fail(404, 'Không tìm thấy ảnh.');
        return image(res, row.cover);
      }
      match = route.match(/^\/api\/posts\/([^/]+)$/);
      if (req.method === 'GET' && match) {
        const row = db.prepare("SELECT * FROM posts WHERE slug=? AND status='published'").get(match[1]);
        if (!row) fail(404, 'Không tìm thấy bài viết.');
        return json(res, { post: postData(row) });
      }
      if (req.method === 'GET' && route === '/api/frames') return json(res, { frames: db.prepare('SELECT * FROM frames ORDER BY created_at DESC,id').all().map(frameData) });
      match = route.match(/^\/api\/frames\/([^/]+)\/image\.webp$/);
      if (req.method === 'GET' && match) {
        const row = db.prepare('SELECT image FROM frames WHERE id=?').get(match[1]);
        if (!row) fail(404, 'Không tìm thấy khung.');
        return image(res, row.image);
      }
      if (req.method === 'POST' && route === '/api/frame-submissions') {
        rateLimit(req, 'submit', 5, HOUR);
        const value = submission(await body(req));
        const id = randomUUID(), createdAt = now(), expiresAt = createdAt + HOUR;
        db.prepare('INSERT INTO submissions VALUES(?,?,?,?,?,?,?,?,?)').run(id, value.name, value.authorName, value.authorContact, value.authorLink, JSON.stringify(value.design), value.image, createdAt, expiresAt);
        schedule();
        return json(res, { id, status: 'pending', expiresAt }, 201);
      }
      if (req.method === 'GET' && route === '/api/admin/session') {
        const session = activeSession(req), needsSetup = !getSetting('password');
        return json(res, { authenticated: !!session, needsSetup, setupAllowed: needsSetup && !production && loopback(host) && loopback(req.socket.remoteAddress), ...(session ? { csrfToken: session.csrf } : {}) });
      }
      if (req.method === 'POST' && route === '/api/admin/setup') {
        rateLimit(req, 'auth', 10, 10 * 60 * 1000);
        if (getSetting('password')) fail(409, 'Quản trị đã được thiết lập. Vui lòng đăng nhập.');
        const value = await body(req);
        keys(value, ['password', 'setupToken']);
        const local = !production && loopback(host) && loopback(req.socket.remoteAddress);
        const givenToken = typeof value.setupToken === 'string' ? value.setupToken : '';
        const validToken = bootstrapToken && givenToken.length <= 256 && timingSafeEqual(Buffer.from(hash(givenToken)), Buffer.from(hash(bootstrapToken)));
        if (!local && !validToken) fail(403, 'Thiết lập lần đầu cần thực hiện trên máy chủ hoặc mã thiết lập riêng.');
        const salt = randomBytes(16).toString('hex');
        const derived = await derive(password(value.password), salt, 64);
        if (getSetting('password')) fail(409, 'Quản trị đã được thiết lập. Vui lòng đăng nhập.');
        setSetting('password', `${salt}:${derived.toString('hex')}`);
        return json(res, startSession(res), 201);
      }
      if (req.method === 'POST' && route === '/api/admin/login') {
        rateLimit(req, 'auth', 10, 10 * 60 * 1000);
        const value = await body(req); keys(value, ['password']);
        const provided = password(value.password), stored = getSetting('password');
        const [salt, expected] = stored?.split(':') || ['00000000000000000000000000000000', '00'.repeat(64)];
        const actual = await derive(provided, salt, 64);
        if (!stored || !timingSafeEqual(actual, Buffer.from(expected, 'hex'))) fail(401, 'Mật khẩu chưa đúng.');
        return json(res, startSession(res));
      }
      if (route.startsWith('/api/admin/')) {
        const session = auth(req, req.method !== 'GET' && req.method !== 'HEAD');
        if (route === '/api/admin/analytics' && req.method === 'GET') return json(res, visitSummary(visitSQL, now()));
        if (req.method === 'POST' && route === '/api/admin/logout') {
          db.prepare('DELETE FROM sessions WHERE token_hash=?').run(session.token_hash);
          sessionCookie(res, '', 0);
          return json(res, { ok: true });
        }
        if (route === '/api/admin/site') {
          if (req.method === 'GET') return json(res, JSON.parse(getSetting('site')));
          if (req.method === 'PUT') { const value = siteSettings(await body(req)); setSetting('site', JSON.stringify(value)); return json(res, value); }
        }
        if (route === '/api/admin/posts' && req.method === 'GET') return json(res, { posts: db.prepare('SELECT * FROM posts ORDER BY created_at DESC,id').all().map(row => postData(row, true)) });
        match = route.match(/^\/api\/admin\/posts(?:\/([^/]+))?$/);
        if (match && ['POST', 'PUT', 'DELETE'].includes(req.method)) {
          const existing = match[1] ? db.prepare('SELECT * FROM posts WHERE id=?').get(match[1]) : null;
          if (match[1] && !existing) fail(404, 'Không tìm thấy bài viết.');
          if (req.method === 'DELETE') { if (!existing) fail(400, 'Cần chọn bài viết.'); db.prepare('DELETE FROM posts WHERE id=?').run(existing.id); return json(res, { ok: true }); }
          if ((req.method === 'POST' && match[1]) || (req.method === 'PUT' && !match[1])) fail(405, 'Phương thức chưa phù hợp.');
          const value = post(await body(req));
          const duplicate = db.prepare('SELECT id FROM posts WHERE slug=?').get(value.slug);
          if (duplicate && duplicate.id !== existing?.id) fail(409, 'Đường dẫn bài viết đã có. Hãy chọn đường dẫn khác.');
          const id = existing?.id || randomUUID();
          const publishedAt = value.status === 'published' ? existing?.published_at ?? now() : null;
          if (existing) db.prepare('UPDATE posts SET slug=?,title=?,excerpt=?,content=?,category=?,tags=?,status=?,is_sample=?,cover=?,published_at=? WHERE id=?').run(value.slug, value.title, value.excerpt, value.content, value.category, JSON.stringify(value.tags), value.status, Number(value.isSample), value.cover === undefined ? existing.cover : value.cover, publishedAt, id);
          else db.prepare('INSERT INTO posts VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(id, value.slug, value.title, value.excerpt, value.content, value.category, JSON.stringify(value.tags), value.status, Number(value.isSample), value.cover || null, now(), publishedAt);
          return json(res, { post: postData(db.prepare('SELECT * FROM posts WHERE id=?').get(id), true) }, existing ? 200 : 201);
        }
        match = route.match(/^\/api\/admin\/posts\/([^/]+)\/cover\.webp$/);
        if (req.method === 'GET' && match) {
          const row = db.prepare('SELECT cover FROM posts WHERE id=?').get(match[1]);
          if (!row?.cover) fail(404, 'Không tìm thấy ảnh.');
          return image(res, row.cover, true);
        }
        if (route === '/api/admin/submissions' && req.method === 'GET') return json(res, { submissions: db.prepare('SELECT * FROM submissions WHERE expires_at>? ORDER BY created_at DESC,id').all(now()).map(pendingData) });
        match = route.match(/^\/api\/admin\/submissions\/([^/]+)\/image\.webp$/);
        if (req.method === 'GET' && match) {
          const row = db.prepare('SELECT image FROM submissions WHERE id=? AND expires_at>?').get(match[1], now());
          if (!row) fail(404, 'Bản chờ không còn hoặc đã hết hạn.');
          return image(res, row.image, true);
        }
        match = route.match(/^\/api\/admin\/submissions\/([^/]+)\/(approve|reject)$/);
        if (req.method === 'POST' && match) {
          db.exec('BEGIN IMMEDIATE');
          let result;
          try {
            const row = db.prepare('SELECT * FROM submissions WHERE id=? AND expires_at>?').get(match[1], now());
            if (!row) fail(404, 'Bản chờ không còn hoặc đã hết hạn.');
            if (match[2] === 'approve') {
              db.prepare('INSERT INTO frames VALUES(?,?,?,?,?,?,?)').run(row.id, row.name, row.author_name, row.author_link, row.design, row.image, now());
              result = { frame: frameData(db.prepare('SELECT * FROM frames WHERE id=?').get(row.id)) };
            } else result = { ok: true };
            db.prepare('DELETE FROM submissions WHERE id=?').run(row.id);
            db.exec('COMMIT');
          } catch (error) { db.exec('ROLLBACK'); throw error; }
          schedule();
          return json(res, result);
        }
        if (route === '/api/admin/frames' && req.method === 'GET') return json(res, { frames: db.prepare('SELECT * FROM frames ORDER BY created_at DESC,id').all().map(frameData) });
        match = route.match(/^\/api\/admin\/frames\/([^/]+)$/);
        if (req.method === 'DELETE' && match) {
          if (!db.prepare('DELETE FROM frames WHERE id=?').run(match[1]).changes) fail(404, 'Không tìm thấy khung.');
          return json(res, { ok: true });
        }
      }
      fail(404, 'Không tìm thấy nội dung yêu cầu.');
    }
    if (!['GET', 'HEAD'].includes(req.method)) fail(405, 'Chỉ hỗ trợ đọc trang.');
    const pageURL=new URL(req.url,`http://${req.headers.host}`),ctxPage=pageContext(pageURL);
    const agent=await agentRoute(new Request(pageURL,{method:req.method,headers:{Accept:req.headers.accept||'*/*'}}),{
      site:async()=>JSON.parse(getSetting('site')),
      posts:async()=>db.prepare("SELECT slug,title,excerpt,is_sample FROM posts WHERE status='published' ORDER BY published_at DESC,id").all().map(row=>({...row,isSample:!!row.is_sample})),
      post:async slug=>{const row=db.prepare("SELECT * FROM posts WHERE slug=? AND status='published'").get(slug);return row?postData(row):null;}
    });
    if(agent){res.writeHead(agent.status,Object.fromEntries(agent.headers));return res.end(req.method==='HEAD'?undefined:Buffer.from(await agent.arrayBuffer()));}
    if (route.includes('\0') || route.split(/[\\/]/).some(part => part.startsWith('.'))) fail(404, 'Không tìm thấy trang.');
    const adminHost = options.adminHost ?? process.env.ADMIN_HOST ?? 'admin.hunghienhoa.com';
    const requestHost = (req.headers.host || '').split(':')[0];
    if (requestHost === adminHost) route = `/admin${route}`;
    if (route === '/photobooth/shoot/') { res.writeHead(308, {Location:'/photobooth/shoot'}); return res.end(); }
    if (route === '/photobooth/shoot') route = '/photobooth/shoot.html';
    let file = path.resolve(dist, `.${route}`);
    const relative = path.relative(dist, file);
    if (relative.startsWith('..') || path.isAbsolute(relative)) fail(404, 'Không tìm thấy trang.');
    let stat;
    try { stat = fs.statSync(file); if (stat.isDirectory()) { file = path.join(file, 'index.html'); stat = fs.statSync(file); } } catch { fail(404, 'Không tìm thấy trang.'); }
    const contentType = types[path.extname(file).toLowerCase()];
    if (!stat.isFile() || !contentType) fail(404, 'Không tìm thấy trang.');
    const content = fs.readFileSync(file);
    const visitPage = pageForVisit(route);
    if (visitPage && req.method === 'GET' && contentType.includes('text/html') && !/bot|crawler|spider|headless/i.test(req.headers['user-agent'] || '')) recordVisit(visitSQL, visitPage, now());
    const metadata=contentType.includes('text/html')&&ctxPage&&['/','/index.html'].includes(ctxPage.path);
    const html=metadata?decorateHtml(content.toString('utf8'),JSON.parse(getSetting('site')),ctxPage,pageURL):contentType.includes('text/html')?content.toString('utf8'):'';
    if(metadata)res.setHeader('Vary','Accept');
    const ads = contentType.includes('text/html') ? adsenseHtml(html,randomBytes(16).toString('base64')) : null;
    const output = ads ? Buffer.from(ads.body) : metadata?Buffer.from(html):content;
    if (ads) res.setHeader('Content-Security-Policy',ads.csp);
    res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': output.length, 'Cache-Control': ads ? 'no-store' : 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : output);
  }
  const server = http.createServer((req, res) => { handle(req, res).catch(error => {
    if (res.headersSent) { res.destroy(); return; }
    if(error.status===404&&!req.url.startsWith('/api/')&&representation(req.headers.accept)==='text/markdown'){
      const response=markdown404(pageContext(new URL(req.url,`http://${req.headers.host}`)),req.method==='HEAD');
      res.writeHead(404,Object.fromEntries(response.headers));response.text().then(body=>res.end(req.method==='HEAD'?undefined:body));return;
    }
    json(res, { error: error.status ? error.message : 'Máy chủ chưa xử lý được thao tác. Vui lòng thử lại.' }, error.status || 500);
    if (!error.status) console.error('Lỗi máy chủ:', error.code || error.name);
  }); });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return {
    server, db, cleanup: () => { cleanup(); schedule(); },
    listen: () => new Promise(resolve => server.listen(port, host, resolve)),
    close: async () => { closed = true; clearTimeout(expiryTimer); await new Promise(resolve => server.close(resolve)); db.close(); }
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const app = createApp();
  await app.listen();
  const address = app.server.address();
  console.log(`Hồ sơ và quản trị đang chạy tại http://${typeof address === 'object' ? address.address : '127.0.0.1'}:${typeof address === 'object' ? address.port : 4180}`);
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await app.close(); process.exit(0); });
}
