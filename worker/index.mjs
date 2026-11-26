import {contributionDay} from '../server/contribution-limit.mjs';
import {usageReport} from '../server/usage.mjs';
import {providerUsage} from './usage-providers.mjs';
import { fail, post, siteSettings, submission, defaultSite, imageMime, mediaAsset } from '../server/validation.mjs';
import { pageForVisit } from '../server/visits.mjs';
import { AI_BODY_LIMIT, parseAiRequest, quotaMessage, runAi } from '../server/lamnet-ai.mjs';
import { adsenseHtml } from '../server/adsense.mjs';
import {snaptikRoute} from '../server/snaptik.mjs';
import {agentRoute,pageContext,representation,markdown404,publicHtml,publicRedirect,ADMIN_HOST} from '../server/agent-content.mjs';
export { VisitCounter } from './visits.mjs';

const API_LIMIT = 1600000;
const POSTS_SELECT = 'id,slug,title,excerpt,content,category,tags,status,is_sample,created_at,published_at,has_cover';
const FRAME_SELECT = 'id,name,author_name,author_link,design,created_at';
const SUBMISSION_SELECT = 'id,name,author_name,author_contact,author_link,design,created_at,expires_at';

// shortcut: chưa thêm 'preload' vì khó gỡ khỏi danh sách trình duyệt; thêm khi chủ trang chắc chắn muốn.
const HSTS = 'max-age=63072000; includeSubDomains';
const PERMISSIONS = 'accelerometer=(), autoplay=(), bluetooth=(), camera=(self), display-capture=(), geolocation=(), gyroscope=(), hid=(), magnetometer=(), microphone=(), midi=(), payment=(), serial=(), usb=(), interest-cohort=()';
const DEV_ONLY = /(?:^|\/)README\.md$|\.test\.mjs$/i;
const VERSIONED_CACHE = 'public, max-age=31536000, immutable';
const FONT_CACHE = 'public, max-age=2592000';
const IMAGE_CACHE = 'public, max-age=86400';
// Làm Nét chạy WebAssembly (cả trong luồng phụ) nên mọi phản hồi trong /lamnet/ cần 'wasm-unsafe-eval';
// COOP/COEP bật crossOriginIsolated để WebAssembly dùng nhiều luồng khi máy không có WebGPU.
const isLamnet = url => /^\/(?:api\/)?lamnet(?:\/|$)/.test(url.pathname);
const LAMNET_CSP = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests";

// Static files referenced with ?v= are renamed by bumping v, so they can be cached for a year.
function staticCache(url) {
  if (url.pathname.startsWith('/api/')) return '';
  if (/\.woff2$/i.test(url.pathname)) return FONT_CACHE;
  // Bộ chạy nằm trong thư mục có số phiên bản, mô hình đổi tên khi đổi nội dung: cache một năm.
  if (/^\/lamnet\/(?:vendor\/ort-[\d.]+|models)\/[^/]+\.(?:wasm|mjs|onnx)$/.test(url.pathname)) return VERSIONED_CACHE;
  if (url.searchParams.has('v') && /\.(?:css|m?js)$/i.test(url.pathname)) return VERSIONED_CACHE;
  if (/\.(?:webp|svg|jpe?g|gif)$/i.test(url.pathname)) return IMAGE_CACHE;
  return '';
}

function preferredEncoding(header) {
  const accepted = new Set();
  for (const part of String(header || '').toLowerCase().split(',')) {
    const [name, ...params] = part.trim().split(';');
    const q = params.map(p => p.trim()).find(p => p.startsWith('q='));
    if (name && (!q || Number(q.slice(2)) > 0)) accepted.add(name.trim());
  }
  return accepted.has('br') ? 'br' : accepted.has('gzip') ? 'gzip' : '';
}

// HTML keeps Cache-Control: no-transform so Cloudflare cannot inject scripts that break the CSP nonce,
// which also stops Cloudflare from compressing it. Setting Content-Encoding lets the Workers runtime compress it.
function deliver(request, response) {
  const url = new URL(request.url), headers = new Headers(response.headers);
  headers.set('Strict-Transport-Security', HSTS);
  if (isLamnet(url)) {
    headers.set('Content-Security-Policy', LAMNET_CSP);
    headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  }
  const cacheControl = headers.get('Cache-Control') || '';
  const cache = response.status === 200 && ['GET', 'HEAD'].includes(request.method) && !/no-store/i.test(cacheControl) && !headers.get('content-type')?.includes('text/html') ? staticCache(url) : '';
  if (cache) headers.set('Cache-Control', cache);
  const encoding = preferredEncoding(request.headers.get('accept-encoding'));
  if (encoding && response.body && ![204, 304].includes(response.status) && headers.get('content-type')?.includes('text/html') && /no-transform/i.test(cacheControl) && !headers.has('Content-Encoding')) {
    headers.set('Content-Encoding', encoding);
    headers.append('Vary', 'Accept-Encoding');
    headers.delete('Content-Length');
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}

async function withSecurity(response, env, metadata, head=false) {
  const headers = new Headers(response.headers);
  let body = response.body,status=response.status;
  headers.set('Content-Security-Policy', `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' ${env.SUPABASE_URL}; media-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests`);
  headers.set('Permissions-Policy', PERMISSIONS);
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Cross-Origin-Resource-Policy', 'same-site');
  headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  if (headers.get('content-type')?.includes('text/html')) {
    let html = await response.text();
    if(metadata) {
      const page=await publicHtml(html,metadata.site,metadata.ctx,metadata.url,metadata.data);
      html=page.body;status=page.status;
      if(status===404)headers.set('X-Robots-Tag','noindex');
      headers.append('Vary','Accept');headers.set('Cache-Control','no-store');headers.delete('ETag');headers.delete('Content-Length');
    }
    const ads = adsenseHtml(html, crypto.randomUUID().replaceAll('-',''));
    body = ads?.body ?? html;
    if (ads) {headers.set('Content-Security-Policy',ads.csp);headers.set('Cache-Control','no-store');headers.delete('ETag');headers.delete('Content-Length');}
    // Keep HTML/CSP intact; the site's own counter does not need an injected analytics beacon.
    const cacheControl = headers.get('Cache-Control') || 'no-store';
    headers.set('Cache-Control', /(?:^|,)\s*no-transform(?:,|$)/i.test(cacheControl) ? cacheControl : cacheControl + ', no-transform');
  }
  return new Response(head?null:body, { status, headers });
}

async function readJson(request, limit = API_LIMIT) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) fail(415, 'Yêu cầu cần dùng dữ liệu JSON.');
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > limit) fail(413, 'Dữ liệu gửi lên quá lớn.');
  if (!request.body) fail(400, 'Dữ liệu gửi lên đang trống.');
  const reader = request.body.getReader(), chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) { await reader.cancel(); fail(413, 'Dữ liệu gửi lên quá lớn.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { fail(400, 'Dữ liệu JSON chưa hợp lệ.'); }
}

function bearer(request) {
  const value = request.headers.get('authorization') || '';
  return value.startsWith('Bearer ') ? value.slice(7) : '';
}

async function rest(env, resource, { method = 'GET', token = '', query = {}, body, prefer = '' } = {}) {
  const url = new URL(`/rest/v1/${resource}`, env.SUPABASE_URL);
  for (const [name, value] of Object.entries(query)) if (value !== undefined) url.searchParams.set(name, String(value));
  const response = await fetch(url, {
    method,
    headers: {
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(prefer ? { Prefer: prefer } : {})
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const raw = await response.text();
  let data = null;
  if (raw) try { data = JSON.parse(raw); } catch { data = raw; }
  if (!response.ok) {
    const duplicate = data?.code === '23505';
    fail(duplicate ? 409 : response.status, duplicate ? 'Đường dẫn bài viết đã được sử dụng.' : (data?.message || 'Chưa truy cập được dữ liệu.'));
  }
  return data;
}

async function requireAdmin(request, env) {
  const token = bearer(request);
  if (!token) fail(401, 'Cần đăng nhập quản trị.');
  const response = await fetch(new URL('/auth/v1/user', env.SUPABASE_URL), { headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` } });
  if (!response.ok) fail(401, 'Phiên đăng nhập đã hết hạn.');
  const user = await response.json();
  if (String(user.email || '').toLowerCase() !== env.ADMIN_EMAIL.toLowerCase()) fail(403, 'Tài khoản này chưa có quyền quản trị.');
  return token;
}

function postData(row, admin = false) {
  return {
    id: String(row.id), slug: row.slug, title: row.title, excerpt: row.excerpt, content: row.content,
    category: row.category, tags: row.tags || [], publishedAt: row.published_at ? Date.parse(row.published_at) : null,
    isSample: !!row.is_sample, coverUrl: row.has_cover ? `${admin ? '/api/admin' : '/api'}/posts/${row.id}/cover.webp` : null,
    ...(admin ? { status: row.status, createdAt: Date.parse(row.created_at) } : {})
  };
}

function frameData(row) {
  return { id: row.id, name: row.name, authorName: row.author_name, authorLink: row.author_link || '', design: row.design, imageUrl: `/api/frames/${row.id}/image`, createdAt: Date.parse(row.created_at) };
}

function pendingData(row) {
  return { id: row.id, name: row.name, authorName: row.author_name, authorContact: row.author_contact || '', authorLink: row.author_link || '', design: row.design, imageUrl: `/api/admin/submissions/${row.id}/image`, createdAt: Date.parse(row.created_at), expiresAt: Date.parse(row.expires_at) };
}

function image(base64, privateImage = false) {
  if (!base64) fail(404, 'Không tìm thấy ảnh.');
  const binary = atob(base64), bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return new Response(bytes, { headers: { 'Content-Type': imageMime(Buffer.from(bytes)), 'Cache-Control': privateImage ? 'no-store' : 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' } });
}

// Bộ nhớ đệm tại máy chủ Cloudflare gần người xem (Cache API, theo từng trung tâm dữ liệu) để không phải hỏi
// Supabase ở mỗi lượt mở trang. Admin lưu thì xóa khóa liên quan tại trung tâm đang dùng; nơi khác tự hết hạn sau TTL.
const CONTENT_TTL = 60, IMAGE_TTL = 300;
const cacheKey = name => new Request(`https://hunghienhoa.com/__edge-cache/v1/${encodeURIComponent(name)}`);
const edgeCache = () => globalThis.caches?.default || null;

function later(ctx, promise) {
  const safe = promise.catch(() => console.error('edge_cache_failed'));
  return ctx?.waitUntil ? ctx.waitUntil(safe) : safe;
}

// Stale-while-revalidate: bản đã lưu được trả ngay; quá CONTENT_TTL thì làm mới phía sau cho lượt sau, nên người xem
// không phải chờ Supabase (~1 giây từ máy chủ xa Singapore). Bản lưu bị bỏ hẳn sau STALE_TTL: nội dung đã gỡ có thể
// còn hiện một lượt ở trung tâm dữ liệu khác trong tối đa một giờ (admin lưu xóa ngay ở trung tâm đang dùng).
const STALE_TTL = 3600;
async function cachedJson(ctx, name, load) {
  const cache = edgeCache();
  if (!cache) return load();
  const key = cacheKey(name);
  const store = value => cache.put(key, new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${STALE_TTL}`, 'X-Fetched-At': String(Date.now()) } }));
  const hit = await cache.match(key).catch(() => null);
  if (hit) {
    if (!(Date.now() - Number(hit.headers.get('X-Fetched-At')) <= CONTENT_TTL * 1000)) later(ctx, load().then(store));
    return hit.json();
  }
  const value = await load();
  await later(ctx, store(value));
  return value;
}

async function cachedImage(ctx, name, load) {
  const cache = edgeCache();
  if (!cache) return image(await load());
  const hit = await cache.match(cacheKey(name)).catch(() => null);
  if (hit) return new Response(hit.body, { headers: { 'Content-Type': hit.headers.get('Content-Type'), 'Cache-Control': `public, max-age=${IMAGE_TTL}`, 'X-Content-Type-Options': 'nosniff' } });
  const response = image(await load());
  await later(ctx, cache.put(cacheKey(name), response.clone()));
  return response;
}

async function purge(names) {
  const cache = edgeCache();
  if (cache) await Promise.all(names.map(name => cache.delete(cacheKey(name)).catch(() => false)));
}

async function loadSite(env) {
  const rows = await rest(env, 'site_settings', { query: { select: 'data', id: 'eq.1', limit: 1 } });
  if (!rows?.[0]) fail(503, 'Nội dung trang chưa được khởi tạo.');
  return rows[0].data;
}

async function loadPost(env, slug) {
  const rows = await rest(env, 'posts', { query: { select: POSTS_SELECT, slug: `eq.${slug}`, status: 'eq.published', limit: 1 } });
  return rows?.[0] ? postData(rows[0]) : null;
}

const postKeys = slug => ['listing', 'posts', 'api-posts', ...(slug ? [`post:${slug}`] : [])];

function originAllowed(request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

async function publicApi(request, env, route, ctx) {
  if (!originAllowed(request)) fail(403, 'Nguồn gửi yêu cầu không được phép.');
  if(/^\/api\/snap(?:tik)?\//.test(route)) {
    if(!env.SNAPTIK_LIMIT)fail(503,'Dịch vụ tải video đang được chuẩn bị.');
    const key=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(contributionDay(Date.now())+':'+(request.headers.get('CF-Connecting-IP')||'unknown')))),byte=>byte.toString(16).padStart(2,'0')).join('');
    if(!(await env.SNAPTIK_LIMIT.limit({key})).success)fail(429,'Bạn thao tác hơi nhanh. Hãy chờ một phút rồi thử lại nhé.');
    return snaptikRoute(request);
  }
  // Đăng bài tự động hằng ngày: phiên tự chạy gửi bài kèm mã bí mật trong Authorization; Worker chuyển sang hàm
  // agent_publish_post của Supabase (hàm tự kiểm tra mã, giới hạn 2 bài/ngày và định dạng bài).
  if (route === '/api/agent/publish') {
    if (request.method !== 'POST') fail(405, 'Phương thức chưa được hỗ trợ.');
    const token = bearer(request);
    if (!token) fail(401, 'Thiếu mã đăng bài.');
    // Chặn thử mã dồn dập: mỗi địa chỉ tối đa 30 lần/phút (cùng cơ chế giới hạn đang dùng cho Snap).
    if (env.SNAPTIK_LIMIT && !(await env.SNAPTIK_LIMIT.limit({ key: 'agent:' + (request.headers.get('CF-Connecting-IP') || 'unknown') })).success) fail(429, 'Bạn thao tác hơi nhanh. Hãy chờ một phút rồi thử lại nhé.');
    const body = await readJson(request, 1800000);
    const response = await fetch(new URL('/rest/v1/rpc/agent_publish_post', env.SUPABASE_URL), { method: 'POST', headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, 'x-agent-token': token, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_post: body }) });
    const result = await response.json().catch(() => null);
    if (!response.ok) fail(response.status === 400 ? 400 : response.status === 401 || response.status === 403 ? 401 : 502, response.status === 401 || response.status === 403 ? 'Mã đăng bài chưa đúng.' : `Không đăng được bài: ${String(result?.message || 'lỗi không rõ').slice(0, 120)}`);
    await purge(postKeys(result?.slug));
    return json(result, 201);
  }
  if (route === '/api/lamnet/ai') {
    if (!env.VISITS) fail(503, 'Chưa kiểm tra được lượt dùng AI. Hãy thử lại sau.');
    const key=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(contributionDay(Date.now())+':'+(request.headers.get('CF-Connecting-IP')||'unknown')))),byte=>byte.toString(16).padStart(2,'0')).join('');
    const counter=env.VISITS.get(env.VISITS.idFromName('site'));
    if (request.method === 'GET') return json({ ...(await (await counter.fetch(`https://counter/ai-status?key=${key}`)).json()), enabled: !!env.AI });
    if (request.method !== 'POST') fail(405, 'Phương thức chưa được hỗ trợ.');
    const value = parseAiRequest(await readJson(request, AI_BODY_LIMIT));
    const quota=await counter.fetch(`https://counter/ai?key=${key}`,{method:'POST'}), claim=await quota.json().catch(()=>({}));
    if (quota.status === 429) fail(429, quotaMessage(claim.reason));
    if (!quota.ok) fail(503, 'Chưa kiểm tra được lượt dùng AI. Hãy thử lại sau.');
    try {
      const out = await runAi(value, env.AI);
      return new Response(out.bytes, { headers: { 'Content-Type': out.mime, 'Cache-Control': 'no-store', 'X-Lamnet-Remaining': String(claim.remaining) } });
    } catch (error) {
      await counter.fetch(`https://counter/ai-release?key=${key}`,{method:'POST'}).catch(()=>{});
      if (!error?.status) throw error;
      return json({ error: error.message }, error.status); // thông báo đã soạn sẵn (chưa bật, đang bận, từ chối…), không chứa khóa hay nội dung
    }
  }
  if (request.method === 'GET' && route === '/api/health') return json({ ok: true, service: 'hunghienhoa' });
  const media=route.match(/^\/api\/media\/([a-f0-9-]{36})\.webp$/);
  if(request.method==='GET' && media) {
    const rows=await rest(env,'media_assets',{query:{select:'image_base64',id:`eq.${media[1]}`,limit:1}});
    return image(rows?.[0]?.image_base64,true);
  }
  if (request.method === 'GET' && route === '/api/site') return json(await cachedJson(ctx, 'site', () => loadSite(env)));
  if (request.method === 'GET' && route === '/api/posts') {
    return json({ posts: await cachedJson(ctx, 'api-posts', async () => (await rest(env, 'posts', { query: { select: POSTS_SELECT, status: 'eq.published', order: 'published_at.desc,id.asc' } })).map(row => postData(row))) });
  }
  let match = route.match(/^\/api\/posts\/([^/]+)\/cover\.webp$/);
  if (request.method === 'GET' && match) {
    const id = decodeURIComponent(match[1]);
    return cachedImage(ctx, `cover:${id}`, async () => (await rest(env, 'posts', { query: { select: 'cover_base64', id: `eq.${id}`, status: 'eq.published', limit: 1 } }))?.[0]?.cover_base64);
  }
  match = route.match(/^\/api\/posts\/([^/]+)$/);
  if (request.method === 'GET' && match) {
    const slug = decodeURIComponent(match[1]);
    const post = await cachedJson(ctx, `post:${slug}`, () => loadPost(env, slug));
    if (!post) fail(404, 'Không tìm thấy bài viết.');
    return json({ post });
  }
  if (request.method === 'GET' && route === '/api/frames') {
    return json({ frames: await cachedJson(ctx, 'frames', async () => (await rest(env, 'frames', { query: { select: FRAME_SELECT, order: 'created_at.desc,id.asc' } })).map(frameData)) });
  }
  match = route.match(/^\/api\/frames\/([^/]+)\/image(?:\.webp)?$/);
  if (request.method === 'GET' && match) {
    const id = decodeURIComponent(match[1]);
    return cachedImage(ctx, `frame-image:${id}`, async () => (await rest(env, 'frames', { query: { select: 'image_base64', id: `eq.${id}`, limit: 1 } }))?.[0]?.image_base64);
  }
  if (request.method === 'POST' && route === '/api/frame-submissions') {
    const value = submission(await readJson(request)), id = crypto.randomUUID(), created = new Date(), expires = new Date(created.getTime() + 3600000);
    if(!env.VISITS) fail(503,'Chưa kiểm tra được lượt đóng góp. Hãy thử lại sau.');
    const key=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(contributionDay(created.getTime())+':'+(request.headers.get('CF-Connecting-IP')||'unknown')))),byte=>byte.toString(16).padStart(2,'0')).join('');
    const limiter=env.VISITS.get(env.VISITS.idFromName('site'));
    const quota=await limiter.fetch(`https://counter/contribution?key=${key}`,{method:'POST'});
    if(quota.status===429) fail(429,'Bạn đã gửi đủ 3 khung hôm nay. Hãy quay lại vào ngày mai (giờ Việt Nam).');
    if(!quota.ok) fail(503,'Chưa kiểm tra được lượt đóng góp.');
    try {
    await rest(env, 'frame_submissions', { method: 'POST', body: { id, name: value.name, author_name: value.authorName, author_contact: value.authorContact, author_link: value.authorLink, consent: true, design: value.design, image_base64: value.image.toString('base64'), created_at: created.toISOString(), expires_at: expires.toISOString() }, prefer: 'return=minimal' });
    }catch(error){await limiter.fetch(`https://counter/contribution-release?key=${key}`,{method:'POST'});throw error;}
    const notice = notifyFrameSubmission(env, id, expires).catch(() => console.error('frame_notification_failed'));
    if (ctx?.waitUntil) ctx.waitUntil(notice); else await notice;
    return json({ id, status: 'pending', expiresAt: expires.getTime() }, 201);
  }
  return null;
}

async function notifyFrameSubmission(env, id, expires) {
  if (!env.FRAME_EMAIL) return;
  // Keep private contacts, contributor text and images out of long-lived mailboxes.
  await env.FRAME_EMAIL.send({
    to: 'hunghienhoa2110@gmail.com', from: 'thongbao@hunghienhoa.com',
    subject: 'Hộp Ảnh: có khung mới chờ Hùng duyệt',
    text: `Có một khung ảnh mới chờ duyệt.\nMã bản chờ: ${id}\nHết hạn: ${expires.toLocaleString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh'})}\nVào duyệt: https://admin.hunghienhoa.com/\nBản chờ tự xóa sau một giờ nếu chưa được duyệt.`,
    html: `<p>Có một khung ảnh mới chờ Hùng duyệt.</p><p><a href="https://admin.hunghienhoa.com/">Mở trang quản trị để xem và duyệt</a></p><p>Bản chờ tự xóa sau một giờ nếu chưa được duyệt.</p>`
  });
  console.info('frame_notification_sent');
}

function dbPost(value) {
  const data = { slug: value.slug, title: value.title, excerpt: value.excerpt, content: value.content, category: value.category, tags: value.tags, status: value.status, is_sample: value.isSample, published_at: value.status === 'published' ? new Date().toISOString() : null };
  if (value.cover !== undefined) data.cover_base64 = value.cover ? value.cover.toString('base64') : null;
  return data;
}

async function adminApi(request, env, route) {
  if (route === '/api/admin/session' && request.method === 'GET') {
    await requireAdmin(request, env);
    return json({ authenticated: true });
  }
  const token = await requireAdmin(request, env);
  if (route === '/api/admin/analytics' && request.method === 'GET') return env.VISITS.get(env.VISITS.idFromName('site')).fetch('https://counter/summary');
  if (!originAllowed(request)) fail(403, 'Nguồn gửi yêu cầu không được phép.');
  if(route==='/api/admin/media' && request.method==='POST') {
    const value=mediaAsset(await readJson(request)),id=crypto.randomUUID();
    await rest(env,'media_assets',{method:'POST',token,body:{id,scope:value.scope,image_base64:value.image.toString('base64')},prefer:'return=minimal'});
    return json({url:`/api/media/${id}.webp`,previewUrl:`/api/admin/media/${id}.webp`},201);
  }
  const media=route.match(/^\/api\/admin\/media\/([a-f0-9-]{36})\.webp$/);
  if(request.method==='GET' && media) {
    const rows=await rest(env,'media_assets',{token,query:{select:'image_base64',id:`eq.${media[1]}`,limit:1}});
    return image(rows?.[0]?.image_base64,true);
  }
  if (route === '/api/admin/logout' && request.method === 'POST') return json({ ok: true });
  if (route === '/api/admin/usage') {
    if (request.method!=='GET') return new Response(JSON.stringify({error:'Số liệu chỉ cập nhật tự động từ API.'}),{status:405,headers:{Allow:'GET','Content-Type':'application/json','Cache-Control':'no-store'}});
    const live=await providerUsage(env,token);
    return json({...usageReport(live.entries),connections:live.connections});
  }
  if (route === '/api/admin/site') {
    if (request.method === 'GET') {
      const rows = await rest(env, 'site_settings', { token, query: { select: 'data', id: 'eq.1', limit: 1 } });
      return json(rows?.[0]?.data || {});
    }
    if (request.method === 'PUT') {
      const value = siteSettings(await readJson(request));
      const rows = await rest(env, 'site_settings', { method: 'PATCH', token, query: { id: 'eq.1', select: 'data' }, body: { data: value, updated_at: new Date().toISOString() }, prefer: 'return=representation' });
      await purge(['site']);
      return json(rows[0].data);
    }
  }
  if (route === '/api/admin/posts' && request.method === 'GET') {
    const rows = await rest(env, 'posts', { token, query: { select: POSTS_SELECT, order: 'created_at.desc,id.asc' } });
    return json({ posts: rows.map(row => postData(row, true)) });
  }
  if (route === '/api/admin/posts' && request.method === 'POST') {
    const value = post(await readJson(request));
    const rows = await rest(env, 'posts', { method: 'POST', token, query: { select: POSTS_SELECT }, body: dbPost(value), prefer: 'return=representation' });
    await purge([...postKeys(rows[0].slug), `cover:${rows[0].id}`]);
    return json({ post: postData(rows[0], true) }, 201);
  }
  let match = route.match(/^\/api\/admin\/posts\/([^/]+)\/cover\.webp$/);
  if (request.method === 'GET' && match) {
    const rows = await rest(env, 'posts', { token, query: { select: 'cover_base64', id: `eq.${decodeURIComponent(match[1])}`, limit: 1 } });
    return image(rows?.[0]?.cover_base64, true);
  }
  match = route.match(/^\/api\/admin\/posts\/([^/]+)$/);
  if (match && request.method === 'PUT') {
    const id = decodeURIComponent(match[1]), value = post(await readJson(request));
    const before = await rest(env, 'posts', { token, query: { select: 'slug', id: `eq.${id}`, limit: 1 } });
    const rows = await rest(env, 'posts', { method: 'PATCH', token, query: { id: `eq.${id}`, select: POSTS_SELECT }, body: dbPost(value), prefer: 'return=representation' });
    if (!rows?.[0]) fail(404, 'Không tìm thấy bài viết.');
    await purge([...postKeys(rows[0].slug), ...(before?.[0]?.slug ? [`post:${before[0].slug}`] : []), `cover:${id}`]);
    return json({ post: postData(rows[0], true) });
  }
  if (match && request.method === 'DELETE') {
    const id = decodeURIComponent(match[1]);
    const rows = await rest(env, 'posts', { method: 'DELETE', token, query: { id: `eq.${id}`, select: 'slug' }, prefer: 'return=representation' });
    await purge([...postKeys(rows?.[0]?.slug), `cover:${id}`]);
    return json({ ok: true });
  }
  if (route === '/api/admin/submissions' && request.method === 'GET') {
    const rows = await rest(env, 'frame_submissions', { token, query: { select: SUBMISSION_SELECT, expires_at: `gt.${new Date().toISOString()}`, order: 'created_at.desc,id.asc' } });
    return json({ submissions: rows.map(pendingData) });
  }
  match = route.match(/^\/api\/admin\/submissions\/([^/]+)\/image(?:\.webp)?$/);
  if (request.method === 'GET' && match) {
    const rows = await rest(env, 'frame_submissions', { token, query: { select: 'image_base64', id: `eq.${decodeURIComponent(match[1])}`, expires_at: `gt.${new Date().toISOString()}`, limit: 1 } });
    return image(rows?.[0]?.image_base64, true);
  }
  match = route.match(/^\/api\/admin\/submissions\/([^/]+)\/(approve|reject)$/);
  if (request.method === 'POST' && match) {
    const id = decodeURIComponent(match[1]);
    await readJson(request);
    if (match[2] === 'reject') {
      const rows = await rest(env, 'frame_submissions', { method: 'DELETE', token, query: { select: 'id', id: `eq.${id}`, expires_at: `gt.${new Date().toISOString()}` }, prefer: 'return=representation' });
      if (!rows?.length) fail(404, 'Bản đóng góp đã hết hạn hoặc không còn tồn tại.');
      return json({ ok: true });
    }
    await rest(env, 'rpc/approve_frame_submission', { method: 'POST', token, body: { p_id: id } });
    const rows = await rest(env, 'frames', { token, query: { select: FRAME_SELECT, id: `eq.${id}`, limit: 1 } });
    if (!rows?.[0]) fail(404, 'Bản đóng góp đã hết hạn hoặc không còn tồn tại.');
    await purge(['frames']);
    return json({ frame: frameData(rows[0]) });
  }
  if (route === '/api/admin/frames' && request.method === 'GET') {
    const rows = await rest(env, 'frames', { token, query: { select: FRAME_SELECT, order: 'created_at.desc,id.asc' } });
    return json({ frames: rows.map(frameData) });
  }
  match = route.match(/^\/api\/admin\/frames\/([^/]+)$/);
  if (request.method === 'DELETE' && match) {
    const id = decodeURIComponent(match[1]);
    await rest(env, 'frames', { method: 'DELETE', token, query: { id: `eq.${id}` }, prefer: 'return=minimal' });
    await purge(['frames', `frame-image:${id}`]);
    return json({ ok: true });
  }
  fail(404, 'Không tìm thấy chức năng quản trị.');
}

const ADMIN_FILES = new Set(['/', '/index.html', '/app.js', '/config.js', '/editor.js', '/media.js', '/usage.js', '/style.css', '/content-fields.json']);
function assetRequest(request) {
  const url = new URL(request.url);
  const redirect=publicRedirect(url);
  if(redirect)return Response.redirect(redirect.href,308);
  // Các trang công khai nằm trong thư mục cùng tên của dist. Trên admin.hunghienhoa.com, trang và tệp riêng của
  // quản trị lấy từ dist/admin; tài nguyên dùng chung (/ui.css, /fonts, /assets, …) và /api giữ nguyên ở gốc.
  if (url.hostname === ADMIN_HOST && ADMIN_FILES.has(url.pathname)) url.pathname = '/admin' + (url.pathname === '/index.html' ? '/' : url.pathname);
  return new Request(url, request);
}

async function notFoundPage(request, env) {
  if (!['GET', 'HEAD'].includes(request.method) || !/text\/html/i.test(request.headers.get('accept') || '') || !env.ASSETS) return null;
  const page = await env.ASSETS.fetch(new Request(new URL('/404', request.url)));
  if (!page.ok) return null;
  const headers = new Headers(page.headers);
  headers.set('X-Robots-Tag', 'noindex');
  headers.set('Cache-Control', 'no-store');
  return withSecurity(new Response(page.body, { status: 404, headers }), env, null, request.method === 'HEAD');
}

export default {
  async fetch(request, env, ctx) {
    return deliver(request, await handle(request, env, ctx));
  }
};

async function handle(request, env, ctx) {
    const redirect=publicRedirect(new URL(request.url));
    if(redirect)return Response.redirect(redirect.href,308);
    const route = new URL(request.url).pathname;
    if (route === '/favicon.ico') return Response.redirect(new URL('/assets/star.svg', request.url).href, 301);
    // Tài liệu và test dành cho lập trình viên nằm trong dist nhưng không phục vụ công khai.
    if (DEV_ONLY.test(route)) return (await notFoundPage(request, env)) || new Response(null, { status: 404 });
    try {
      if (route.startsWith('/api/')) {
        const response = route.startsWith('/api/admin/') ? await adminApi(request, env, route) : await publicApi(request, env, route, ctx);
        if (response) return response;
        fail(404, 'Không tìm thấy API.');
      }
      const mapped = assetRequest(request);
      if (mapped instanceof Response) return mapped;
      const url=new URL(request.url),ctxPage=pageContext(url);
      const data={
        site:()=>cachedJson(ctx,'site',()=>loadSite(env)),
        posts:()=>cachedJson(ctx,'posts',async()=>{
          const posts=[];
          for(let offset=0;offset<50000;offset+=1000){const rows=await rest(env,'posts',{query:{select:'slug,title,excerpt,is_sample,published_at,updated_at',status:'eq.published',order:'published_at.desc,id.asc',limit:1000,offset}});posts.push(...rows.map(row=>({...row,isSample:!!row.is_sample})));if(rows.length<1000)return posts;}
          fail(503,'Danh sách cần được chia thành nhiều sitemap.');
        }),
        post:slug=>cachedJson(ctx,`post:${slug}`,()=>loadPost(env,slug)),
        listing:()=>cachedJson(ctx,'listing',async()=>{const rows=await rest(env,'posts',{query:{select:'id,slug,title,excerpt,category,published_at,is_sample,has_cover',status:'eq.published',order:'published_at.desc,id.asc',limit:50}});return rows.map(row=>postData(row));})
      };
      const agent=await agentRoute(request,data);
      if(agent)return withSecurity(agent,env);
      const response = await env.ASSETS.fetch(mapped);
      if(response.status===404&&representation(request.headers.get('accept'))==='text/markdown')return withSecurity(markdown404(ctxPage,request.method==='HEAD'),env);
      if(response.status===404){const page=await notFoundPage(request,env);if(page)return page;}
      const page = pageForVisit(new URL(mapped.url).pathname);
      if (env.VISITS && page && request.method === 'GET' && response.ok && response.headers.get('content-type')?.includes('text/html') && !/bot|crawler|spider|headless/i.test(request.headers.get('user-agent') || '')) {
        const key=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(contributionDay(Date.now())+':'+(request.headers.get('CF-Connecting-IP')||'unknown')))),byte=>byte.toString(16).padStart(2,'0')).join('');
        const count = env.VISITS.get(env.VISITS.idFromName('site')).fetch(`https://counter/record?page=${page}&key=${key}`, {method:'POST'}).catch(() => console.error('visit_count_failed'));
        if (ctx?.waitUntil) ctx.waitUntil(count); else await count;
      }
      const metadata=ctxPage&&['/','/index.html',...(ctxPage.page==='photobooth'?['/shoot','/shoot.html']:[])].includes(ctxPage.path)&&response.ok&&response.headers.get('content-type')?.includes('text/html')?{ctx:ctxPage,url,site:await data.site().catch(()=>defaultSite),data}:null;
      return withSecurity(response, env, metadata, request.method==='HEAD');
    } catch (error) {
      const status = Number(error?.status) || 500;
      if (status >= 500) console.error(JSON.stringify({ message: 'request_failed', status, path: route, error: error instanceof Error ? error.message : String(error) }));
      return json({ error: status >= 500 ? 'Máy chủ đang gặp sự cố. Hãy thử lại sau.' : error.message }, status);
    }
}

export { assetRequest, readJson };
