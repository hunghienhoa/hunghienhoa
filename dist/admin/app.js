const $ = selector => document.querySelector(selector);
if (location.hostname === 'admin.hunghienhoa.com') $('header a[target="_blank"]').href = 'https://hunghienhoa.com/';
const API = (window.HUNG_API_BASE || '').replace(/\/$/, '');
const SUPABASE = window.HUNG_SUPABASE;
const SESSION_KEY = 'hung_admin_session';
const LOCAL = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
let session = LOCAL ? null : readSession(), csrfToken = '', needsSetup = false, posts = [], frames = [], submissions = [], coverData;
const privateImageUrls = new Set();
if (LOCAL) { $('#email').hidden = true; $('#email').required = false; $('label[for="email"]').hidden = true; }
const message = (element, text = '', error = false) => { element.textContent = text; element.classList.toggle('error', error); };
const make = (tag, text, className) => { const element = document.createElement(tag); if (text !== undefined) element.textContent = text; if (className) element.className = className; return element; };
function readSession() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || null; } catch { sessionStorage.removeItem(SESSION_KEY); return null; } }
function saveSession(value) { session = value; if (value) sessionStorage.setItem(SESSION_KEY, JSON.stringify(value)); else sessionStorage.removeItem(SESSION_KEY); }
async function authRequest(path, body, token = '') {
  const response = await fetch(`${SUPABASE.url}/auth/v1/${path}`, { method: 'POST', cache: 'no-store', headers: { apikey: SUPABASE.key, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.msg || data.error_description || data.message || 'Chưa đăng nhập được. Hãy kiểm tra lại email và mật khẩu.');
  return data;
}
async function refreshSession() {
  if (!session?.refresh_token) return false;
  try {
    const data = await authRequest('token?grant_type=refresh_token', { refresh_token: session.refresh_token });
    saveSession({ access_token: data.access_token, refresh_token: data.refresh_token, expires_at: Date.now() + data.expires_in * 1000 });
    return true;
  } catch { saveSession(null); return false; }
}
function assetUrl(path) { const url = new URL(path, API || location.origin); if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Địa chỉ ảnh không hợp lệ.'); return url.href; }
function clearPrivateImages() { for (const url of privateImageUrls) URL.revokeObjectURL(url); privateImageUrls.clear(); }
async function setImage(element, path) {
  element.removeAttribute('src');
  if (LOCAL || !new URL(assetUrl(path)).pathname.startsWith('/api/admin/')) { element.src = assetUrl(path); return; }
  if (session?.expires_at <= Date.now() + 30000) await refreshSession();
  const activeToken = session?.access_token;
  try {
    const blob = await api(path, {}, true);
    if (!session || session.access_token !== activeToken) return;
    const url = URL.createObjectURL(blob); privateImageUrls.add(url); element.src = url;
  } catch (error) { message($('#page-status'), error.message, true); }
}
function showAuth() {
  clearPrivateImages();
  csrfToken = '';
  posts = []; frames = []; submissions = [];
  $('#workspace').hidden = true; $('#auth-box').hidden = false; $('#logout').hidden = true;
  for (const id of ['submissions-list', 'frames-list', 'posts-list', 'stats']) $('#' + id).replaceChildren();
  $('#post-form').reset(); $('#site-form').reset(); $('#auth-form').reset();
  $('#cover-preview').hidden = true; $('#cover-preview').removeAttribute('src'); coverData = undefined;
}
async function api(path, options = {}, asBlob = false) {
  if (session?.expires_at <= Date.now() + 30000) await refreshSession();
  const write = options.method && options.method !== 'GET';
  const response = await fetch(API + path, { credentials: LOCAL ? 'same-origin' : 'omit', cache: 'no-store', ...options, headers: { ...(write ? { 'Content-Type': 'application/json' } : {}), ...(LOCAL && write && csrfToken ? { 'X-CSRF-Token': csrfToken } : {}), ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}), ...options.headers } });
  const data = response.ok && asBlob ? await response.blob() : await response.json().catch(() => ({ error: 'Máy chủ trả về dữ liệu chưa hợp lệ.' }));
  if (response.status === 401) { saveSession(null); showAuth(); }
  if (!response.ok) throw new Error(data.error || 'Chưa thực hiện được. Hãy thử lại.');
  return data;
}
function action(text, handler, style = '') { const button = make('button', text, style); button.type = 'button'; button.addEventListener('click', async () => { button.disabled = true; try { await handler(); } catch (error) { message($('#page-status'), error.message, true); } finally { button.disabled = false; } }); return button; }
function empty(container, text) { container.replaceChildren(make('p', text, 'empty')); }
function renderStats() { $('#stats').replaceChildren(...[[submissions.length, 'Khung chờ duyệt'], [frames.length, 'Khung trong thư viện'], [posts.filter(post => post.status === 'published').length, 'Bài đã xuất bản']].map(([count, label]) => { const card = make('div', undefined, 'stat'); card.append(make('b', String(count)), make('span', label)); return card; })); }
function creditLink(url) { try { const parsed = new URL(url); if (!['http:', 'https:'].includes(parsed.protocol)) return null; const a = make('a', 'Trang của tác giả ↗'); a.href = parsed.href; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; } catch { return null; } }
function renderFrames(pending) {
  const list = pending ? submissions : frames;
  const target = $(pending ? '#submissions-list' : '#frames-list');
  if (!list.length) { empty(target, pending ? 'Chưa có khung nào đang chờ duyệt.' : 'Chưa có khung đã duyệt. Khung được chọn sẽ hiện ở đây và trong Hộp Ảnh.'); return; }
  target.replaceChildren(...list.map(item => {
    const card = make('article', undefined, 'item'), image = make('img'), copy = make('div');
    setImage(image, item.imageUrl); image.alt = `Thiết kế khung ${item.name}`; image.loading = 'lazy';
    copy.append(make('h3', item.name), make('p', `Tác giả: ${item.authorName}`));
    const link = item.authorLink && creditLink(item.authorLink); if (link) copy.append(link);
    if (pending) {
      copy.append(make('p', item.authorContact ? `Liên hệ riêng: ${item.authorContact}` : 'Không để lại thông tin liên hệ riêng.'), make('small', `Hết hạn: ${new Date(item.expiresAt).toLocaleString('vi-VN')}`));
      const controls = make('div', undefined, 'item-actions');
      controls.append(action('Duyệt khung', async () => { await api(`/api/admin/submissions/${encodeURIComponent(item.id)}/approve`, { method: 'POST', body: '{}' }); message($('#page-status'), 'Đã duyệt khung. Thông tin liên hệ riêng của bản chờ đã được xóa.'); await loadAll(); }, 'approve'), action('Từ chối và xóa', async () => { await api(`/api/admin/submissions/${encodeURIComponent(item.id)}/reject`, { method: 'POST', body: '{}' }); message($('#page-status'), 'Đã từ chối và xóa bản đóng góp.'); await loadAll(); }, 'danger'));
      copy.append(controls);
    } else {
      copy.append(make('small', `Đã duyệt: ${new Date(item.createdAt).toLocaleDateString('vi-VN')}`));
      copy.append(action('Gỡ khỏi thư viện', async () => { if (!confirm('Gỡ khung này và xóa thiết kế khỏi thư viện?')) return; await api(`/api/admin/frames/${encodeURIComponent(item.id)}`, { method: 'DELETE' }); await loadAll(); message($('#page-status'), 'Đã gỡ khung khỏi thư viện.'); }, 'danger'));
    }
    card.append(image, copy); return card;
  }));
}
function editPost(post) {
  const form = $('#post-form'); form.reset();
  for (const key of ['id', 'title', 'slug', 'excerpt', 'content', 'category', 'status']) form.elements.namedItem(key).value = post?.[key] || (key === 'status' ? 'draft' : '');
  form.elements.tags.value = (post?.tags || []).join(', '); form.elements.isSample.checked = !!post?.isSample;
  coverData = undefined; $('#post-cover').value = ''; $('#cover-preview').hidden = !post?.coverUrl;
  if (post?.coverUrl) setImage($('#cover-preview'), post.coverUrl); else $('#cover-preview').removeAttribute('src');
  message($('#post-status'));
}
function renderPosts() {
  const target = $('#posts-list');
  if (!posts.length) { empty(target, 'Chưa có bài viết. Bắt đầu một câu chuyện nhỏ nhé.'); return; }
  target.replaceChildren(...posts.map(post => {
    const card = make('article', undefined, 'post-entry'); card.append(make('h3', post.title), make('p', `${post.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}${post.isSample ? ' · Bài viết mẫu' : ''}`));
    const controls = make('div', undefined, 'item-actions'); controls.append(action('Sửa bài', async () => { editPost(post); $('#post-form').scrollIntoView({ behavior: 'smooth', block: 'start' }); }), action('Xóa bài', async () => { if (!confirm(`Xóa hẳn bài “${post.title}”?`)) return; await api(`/api/admin/posts/${encodeURIComponent(post.id)}`, { method: 'DELETE' }); editPost(); await loadAll(); message($('#page-status'), 'Đã xóa bài viết.'); }, 'danger')); card.append(controls); return card;
  }));
}
async function loadAll() {
  const [postData, pendingData, frameData, site] = await Promise.all([api('/api/admin/posts'), api('/api/admin/submissions'), api('/api/admin/frames'), api('/api/admin/site')]);
  posts = postData.posts; submissions = pendingData.submissions; frames = frameData.frames;
  clearPrivateImages();
  renderStats(); renderPosts(); renderFrames(true); renderFrames(false);
  const settings = site.site || site;
  for (const key of ['displayName', 'shortName', 'intro', 'about', 'email', 'phone', 'blogTitle', 'blogIntro']) $('#site-form').elements.namedItem(key).value = settings[key] || '';
}
async function enter() { $('#auth-form').reset(); $('#auth-box').hidden = true; $('#workspace').hidden = false; $('#logout').hidden = false; message($('#auth-status')); await loadAll(); }
async function initialize() {
  try {
    if (LOCAL) {
      const data = await api('/api/admin/session');
      if (data.authenticated) { csrfToken = data.csrfToken; await enter(); return; }
      needsSetup = data.needsSetup; showAuth(); $('#auth-form').hidden = false;
      $('#auth-submit').textContent = needsSetup ? 'Tạo mật khẩu' : 'Đăng nhập';
      $('#auth-submit').disabled = !!needsSetup && !data.setupAllowed;
      $('#auth-note').textContent = needsSetup ? 'Tạo mật khẩu riêng để quản trị bản trên máy này.' : 'Đăng nhập bằng mật khẩu quản trị trên máy này.';
      return;
    }
    if (!session && !(await refreshSession())) { showAuth(); $('#auth-form').hidden = false; $('#auth-note').textContent = 'Đăng nhập bằng tài khoản Supabase của Hùng để quản lý nội dung và duyệt khung.'; return; }
    const data = await api('/api/admin/session');
    if (data.authenticated) { await enter(); return; }
    saveSession(null); showAuth(); $('#auth-form').hidden = false;
    $('#auth-note').textContent = 'Tài khoản này chưa có quyền quản trị.';
  } catch (error) { saveSession(null); showAuth(); $('#auth-form').hidden = false; message($('#auth-status'), error.message || 'Chưa kết nối được máy chủ quản trị.', true); }
}
$('#auth-form').addEventListener('submit', async event => {
  event.preventDefault(); const button = $('#auth-submit'); button.disabled = true; message($('#auth-status'));
  try {
    if (LOCAL) {
      const data = await api(needsSetup ? '/api/admin/setup' : '/api/admin/login', { method: 'POST', body: JSON.stringify({ password: $('#password').value }) });
      csrfToken = data.csrfToken; await enter(); return;
    }
    const data = await authRequest('token?grant_type=password', { email: $('#email').value.trim(), password: $('#password').value });
    saveSession({ access_token: data.access_token, refresh_token: data.refresh_token, expires_at: Date.now() + data.expires_in * 1000 });
    const allowed = await api('/api/admin/session');
    if (!allowed.authenticated) throw new Error('Tài khoản này chưa có quyền quản trị.');
    await enter();
  } catch (error) { saveSession(null); showAuth(); $('#auth-form').hidden = false; message($('#auth-status'), error.message, true); } finally { button.disabled = false; }
});
$('#logout').addEventListener('click', async () => { try { if (LOCAL) await api('/api/admin/logout', { method: 'POST', body: '{}' }); else if (session?.access_token) await authRequest('logout', {}, session.access_token); } catch {} finally { saveSession(null); showAuth(); await initialize(); } });
document.querySelectorAll('[data-panel]').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('[data-panel]').forEach(item => item.setAttribute('aria-pressed', String(item === button))); document.querySelectorAll('[data-view]').forEach(view => { view.hidden = view.dataset.view !== button.dataset.panel; }); message($('#page-status')); }));
$('#refresh-submissions').addEventListener('click', async () => { try { await loadAll(); message($('#page-status'), 'Đã cập nhật danh sách chờ duyệt.'); } catch (error) { message($('#page-status'), error.message, true); } });
$('#new-post').addEventListener('click', () => editPost());
$('#post-cover').addEventListener('change', async event => {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 12 * 1024 * 1024) throw new Error('Chọn ảnh PNG, JPEG hoặc WebP nhỏ hơn 12 MB.');
    const url = URL.createObjectURL(file), image = new Image();
    try {
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('Không đọc được ảnh bìa.')); image.src = url; });
      if (image.naturalWidth * image.naturalHeight > 45000000) throw new Error('Ảnh bìa quá lớn. Hãy chọn ảnh dưới 45 triệu điểm ảnh.');
      const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight)), canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale)); canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      const normalized = canvas.toDataURL('image/webp', .86);
      if (!normalized.startsWith('data:image/webp;') || normalized.length > 1350000) throw new Error('Chưa chuyển được ảnh bìa thành WebP dưới 1 MB. Hãy chọn ảnh nhỏ hơn.');
      coverData = normalized; $('#cover-preview').src = coverData; $('#cover-preview').hidden = false; message($('#post-status'), 'Ảnh bìa đã chuyển thành WebP. Chỉ được lưu khi Hùng bấm lưu bài viết.');
    } finally { URL.revokeObjectURL(url); }
  } catch (error) { event.target.value = ''; message($('#post-status'), error.message, true); }
});
$('#post-form').addEventListener('submit', async event => {
  event.preventDefault(); const form = event.currentTarget, button = $('#save-post'); button.disabled = true; message($('#post-status'));
  try {
    const values = Object.fromEntries(new FormData(form)); const id = values.id; delete values.id;
    values.tags = String(values.tags || '').split(',').map(tag => tag.trim()).filter(Boolean); values.isSample = form.elements.isSample.checked;
    if (coverData !== undefined) values.coverDataUrl = coverData;
    const response = await api('/api/admin/posts' + (id ? '/' + encodeURIComponent(id) : ''), { method: id ? 'PUT' : 'POST', body: JSON.stringify(values) });
    await loadAll(); if (response.post) editPost(response.post); message($('#post-status'), values.status === 'published' ? 'Đã lưu và xuất bản bài viết.' : 'Đã lưu bản nháp. Bài chưa xuất hiện trên trang công khai.');
  } catch (error) { message($('#post-status'), error.message, true); } finally { button.disabled = false; }
});
$('#site-form').addEventListener('submit', async event => {
  event.preventDefault(); const button = $('#save-site'); button.disabled = true;
  try { await api('/api/admin/site', { method: 'PUT', body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) }); message($('#site-status'), 'Đã lưu nội dung. Tải lại trang công khai để xem thay đổi.'); } catch (error) { message($('#site-status'), error.message, true); } finally { button.disabled = false; }
});
window.addEventListener('pagehide', showAuth);
window.addEventListener('pageshow', event => { if (event.persisted) initialize(); });
setInterval(async () => { if (!LOCAL && !session) return; try { const data = await api('/api/admin/session'); if (!data.authenticated) await initialize(); } catch { saveSession(null); showAuth(); } }, 60000);
initialize();
