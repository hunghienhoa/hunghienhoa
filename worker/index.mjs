import {contributionDay} from '../server/contribution-limit.mjs';
import {usageReport} from '../server/usage.mjs';
import {providerUsage} from './usage-providers.mjs';
import { fail, post, siteSettings, submission, defaultSite, imageMime } from '../server/validation.mjs';
import { pageForVisit } from '../server/visits.mjs';
import { adsenseHtml } from '../server/adsense.mjs';
import {agentRoute,pageContext,representation,markdown404,decorateHtml} from '../server/agent-content.mjs';
export { VisitCounter } from './visits.mjs';

const API_LIMIT = 1600000;
const POSTS_SELECT = 'id,slug,title,excerpt,content,category,tags,status,is_sample,created_at,published_at,has_cover';
const FRAME_SELECT = 'id,name,author_name,author_link,design,created_at';
const SUBMISSION_SELECT = 'id,name,author_name,author_contact,author_link,design,created_at,expires_at';

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}

async function withSecurity(response, env, metadata) {
  const headers = new Headers(response.headers);
  let body = response.body;
  headers.set('Content-Security-Policy', `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' ${env.SUPABASE_URL}; media-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`);
  headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  if (headers.get('content-type')?.includes('text/html')) {
    let html = await response.text();
    if(metadata) {
      html=decorateHtml(html,metadata.site,metadata.ctx,metadata.url);
      headers.append('Vary','Accept');headers.set('Cache-Control','no-store');headers.delete('ETag');headers.delete('Content-Length');
    }
    const ads = adsenseHtml(html, crypto.randomUUID().replaceAll('-',''));
    body = ads?.body ?? html;
    if (ads) {headers.set('Content-Security-Policy',ads.csp);headers.set('Cache-Control','no-store');headers.delete('ETag');headers.delete('Content-Length');}
    // Keep HTML/CSP intact; the site's own counter does not need an injected analytics beacon.
    const cacheControl = headers.get('Cache-Control') || 'no-store';
    headers.set('Cache-Control', /(?:^|,)\s*no-transform(?:,|$)/i.test(cacheControl) ? cacheControl : cacheControl + ', no-transform');
  }
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}

async function readJson(request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) fail(415, 'Yêu cầu cần dùng dữ liệu JSON.');
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > API_LIMIT) fail(413, 'Dữ liệu gửi lên quá lớn.');
  if (!request.body) fail(400, 'Dữ liệu gửi lên đang trống.');
  const reader = request.body.getReader(), chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > API_LIMIT) { await reader.cancel(); fail(413, 'Dữ liệu gửi lên quá lớn.'); }
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

function originAllowed(request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

async function publicApi(request, env, route, ctx) {
  if (!originAllowed(request)) fail(403, 'Nguồn gửi yêu cầu không được phép.');
  if (request.method === 'GET' && route === '/api/health') return json({ ok: true, service: 'hunghienhoa' });
  if (request.method === 'GET' && route === '/api/site') {
    const rows = await rest(env, 'site_settings', { query: { select: 'data', id: 'eq.1', limit: 1 } });
    if (!rows?.[0]) fail(503, 'Nội dung trang chưa được khởi tạo.');
    return json(rows[0].data);
  }
  if (request.method === 'GET' && route === '/api/posts') {
    const rows = await rest(env, 'posts', { query: { select: POSTS_SELECT, status: 'eq.published', order: 'published_at.desc,id.asc' } });
    return json({ posts: rows.map(row => postData(row)) });
  }
  let match = route.match(/^\/api\/posts\/([^/]+)\/cover\.webp$/);
  if (request.method === 'GET' && match) {
    const rows = await rest(env, 'posts', { query: { select: 'cover_base64', id: `eq.${decodeURIComponent(match[1])}`, status: 'eq.published', limit: 1 } });
    return image(rows?.[0]?.cover_base64);
  }
  match = route.match(/^\/api\/posts\/([^/]+)$/);
  if (request.method === 'GET' && match) {
    const rows = await rest(env, 'posts', { query: { select: POSTS_SELECT, slug: `eq.${decodeURIComponent(match[1])}`, status: 'eq.published', limit: 1 } });
    if (!rows?.[0]) fail(404, 'Không tìm thấy bài viết.');
    return json({ post: postData(rows[0]) });
  }
  if (request.method === 'GET' && route === '/api/frames') {
    const rows = await rest(env, 'frames', { query: { select: FRAME_SELECT, order: 'created_at.desc,id.asc' } });
    return json({ frames: rows.map(frameData) });
  }
  match = route.match(/^\/api\/frames\/([^/]+)\/image(?:\.webp)?$/);
  if (request.method === 'GET' && match) {
    const rows = await rest(env, 'frames', { query: { select: 'image_base64', id: `eq.${decodeURIComponent(match[1])}`, limit: 1 } });
    return image(rows?.[0]?.image_base64);
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
    const rows = await rest(env, 'posts', { method: 'PATCH', token, query: { id: `eq.${id}`, select: POSTS_SELECT }, body: dbPost(value), prefer: 'return=representation' });
    if (!rows?.[0]) fail(404, 'Không tìm thấy bài viết.');
    return json({ post: postData(rows[0], true) });
  }
  if (match && request.method === 'DELETE') {
    await rest(env, 'posts', { method: 'DELETE', token, query: { id: `eq.${decodeURIComponent(match[1])}` }, prefer: 'return=minimal' });
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
    return json({ frame: frameData(rows[0]) });
  }
  if (route === '/api/admin/frames' && request.method === 'GET') {
    const rows = await rest(env, 'frames', { token, query: { select: FRAME_SELECT, order: 'created_at.desc,id.asc' } });
    return json({ frames: rows.map(frameData) });
  }
  match = route.match(/^\/api\/admin\/frames\/([^/]+)$/);
  if (request.method === 'DELETE' && match) {
    await rest(env, 'frames', { method: 'DELETE', token, query: { id: `eq.${decodeURIComponent(match[1])}` }, prefer: 'return=minimal' });
    return json({ ok: true });
  }
  fail(404, 'Không tìm thấy chức năng quản trị.');
}

function assetRequest(request) {
  const url = new URL(request.url), host = url.hostname.toLowerCase();
  if (host === 'www.hunghienhoa.com') {
    url.hostname = 'hunghienhoa.com';
    return new Response(null, { status: 308, headers: { Location: url.href } });
  }
  const projectPath = url.pathname.match(/^\/(admin|blog|photobooth)(?:\/|$)/);
  if (host === 'hunghienhoa.com' && projectPath) {
    url.hostname = `${projectPath[1]}.hunghienhoa.com`;
    url.pathname = url.pathname.slice(projectPath[1].length + 1) || '/';
    return new Response(null, { status: 308, headers: { Location: url.href } });
  }
  const section = host === 'admin.hunghienhoa.com' ? 'admin' : host === 'blog.hunghienhoa.com' ? 'blog' : host === 'photobooth.hunghienhoa.com' ? 'photobooth' : '';
  if (section === 'photobooth' && url.pathname === '/shoot/') return new Response(null, {status:308,headers:{Location:new URL('/shoot',url).href}});
  if (section && !url.pathname.startsWith(`/${section}/`)) url.pathname = `/${section}${url.pathname === '/' ? '/' : url.pathname}`;
  return new Request(url, request);
}

export default {
  async fetch(request, env, ctx) {
    const route = new URL(request.url).pathname;
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
        site:async()=>{const rows=await rest(env,'site_settings',{query:{select:'data',id:'eq.1',limit:1}});if(!rows?.[0])fail(503,'Nội dung chưa sẵn sàng.');return rows[0].data;},
        posts:async()=>{
          const posts=[];
          for(let offset=0;offset<50000;offset+=1000){const rows=await rest(env,'posts',{query:{select:'slug,title,excerpt,is_sample',status:'eq.published',order:'published_at.desc,id.asc',limit:1000,offset}});posts.push(...rows.map(row=>({...row,isSample:!!row.is_sample})));if(rows.length<1000)return posts;}
          fail(503,'Danh sách cần được chia thành nhiều sitemap.');
        },
        post:async slug=>{const rows=await rest(env,'posts',{query:{select:POSTS_SELECT,status:'eq.published',slug:'eq.'+slug,limit:1}});return rows[0]?postData(rows[0]):null;}
      };
      const agent=await agentRoute(request,data);
      if(agent)return withSecurity(agent,env);
      const response = await env.ASSETS.fetch(mapped);
      if(response.status===404&&representation(request.headers.get('accept'))==='text/markdown')return withSecurity(markdown404(ctxPage,request.method==='HEAD'),env);
      const page = pageForVisit(new URL(mapped.url).pathname);
      if (env.VISITS && page && request.method === 'GET' && response.ok && response.headers.get('content-type')?.includes('text/html') && !/bot|crawler|spider|headless/i.test(request.headers.get('user-agent') || '')) {
        const key=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(contributionDay(Date.now())+':'+(request.headers.get('CF-Connecting-IP')||'unknown')))),byte=>byte.toString(16).padStart(2,'0')).join('');
        const count = env.VISITS.get(env.VISITS.idFromName('site')).fetch(`https://counter/record?page=${page}&key=${key}`, {method:'POST'}).catch(() => console.error('visit_count_failed'));
        if (ctx?.waitUntil) ctx.waitUntil(count); else await count;
      }
      const metadata=ctxPage&&['/','/index.html'].includes(ctxPage.path)&&response.ok&&response.headers.get('content-type')?.includes('text/html')?{ctx:ctxPage,url,site:await data.site().catch(()=>defaultSite)}:null;
      return withSecurity(response, env, metadata);
    } catch (error) {
      const status = Number(error?.status) || 500;
      if (status >= 500) console.error(JSON.stringify({ message: 'request_failed', status, path: route, error: error instanceof Error ? error.message : String(error) }));
      return json({ error: status >= 500 ? 'Máy chủ đang gặp sự cố. Hãy thử lại sau.' : error.message }, status);
    }
  }
};

export { assetRequest, readJson };
