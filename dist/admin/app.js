const $ = selector => document.querySelector(selector);
const API = (window.HUNG_API_BASE || '').replace(/\/$/, '');
const SUPABASE = window.HUNG_SUPABASE;
const SESSION_KEY = 'hung_admin_session';
const LOCAL = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
// Trên admin.hunghienhoa.com, liên kết sang trang công khai phải trỏ về tên miền chính.
const SITE = location.hostname === 'admin.hunghienhoa.com' ? 'https://hunghienhoa.com' : '';
if (SITE) $('#site-link').href = SITE + '/';
let session = LOCAL ? null : readSession(), csrfToken = '', needsSetup = false, posts = [], frames = [], submissions = [], coverData;
let currentSettings = {}, contentFields = [];
let refreshPromise, submissionExpiryTimer, authVersion = 0;
const privateImageUrls = new Set();
if (LOCAL) { $('#email').hidden = true; $('#email').required = false; $('label[for="email"]').hidden = true; }
const message = (element, text = '', error = false) => { element.textContent = text; element.classList.toggle('error', error); };
const make = (tag, text, className) => { const element = document.createElement(tag); if (text !== undefined) element.textContent = text; if (className) element.className = className; return element; };
function readSession() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || null; } catch { sessionStorage.removeItem(SESSION_KEY); return null; } }
function saveSession(value) { session = value; if (value) sessionStorage.setItem(SESSION_KEY, JSON.stringify(value)); else sessionStorage.removeItem(SESSION_KEY); }
async function authRequest(path, body, token = '') {
  let response;
  try { response = await fetch(`${SUPABASE.url}/auth/v1/${path}`, { method: 'POST', cache: 'no-store', headers: { apikey: SUPABASE.key, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) }); }
  catch { throw new Error('Không kết nối được dịch vụ đăng nhập. Kiểm tra mạng rồi thử lại.'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const messages = {
      invalid_credentials: 'Email hoặc mật khẩu chưa đúng. Hãy dùng tài khoản quản trị của Hùng.',
      email_not_confirmed: 'Email này chưa được xác nhận. Hãy kiểm tra thư xác nhận trong hộp thư.',
      user_banned: 'Tài khoản này đang bị khóa. Hãy liên hệ người quản lý trang.',
      over_request_rate_limit: 'Bạn đã thử đăng nhập quá nhiều lần. Chờ vài phút rồi thử lại.',
      captcha_failed: 'Đăng nhập đang yêu cầu xác minh bảo mật. Hãy thử lại sau.'
    };
    const code = data.error_code || data.code;
    throw new Error(messages[code] || `Dịch vụ đăng nhập chưa xử lý được yêu cầu (HTTP ${response.status}${code ? `, ${code}` : ''}).`);
  }
  return data;
}
async function refreshSession() {
  if (refreshPromise) return refreshPromise;
  const refreshToken = session?.refresh_token;
  if (!refreshToken) return false;
  refreshPromise = (async () => {
    try {
      const data = await authRequest('token?grant_type=refresh_token', { refresh_token: refreshToken });
      if (session?.refresh_token !== refreshToken) return false;
      saveSession({ access_token: data.access_token, refresh_token: data.refresh_token, expires_at: Date.now() + data.expires_in * 1000 });
      return true;
    } catch { if (session?.refresh_token === refreshToken) saveSession(null); return false; }
    finally { refreshPromise = null; }
  })();
  return refreshPromise;
}
function assetUrl(path) { const url = new URL(path, API || location.origin); if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Địa chỉ ảnh không hợp lệ.'); return url.href; }
function clearPrivateImages(keepCover = false) {
  const cover = keepCover && !$('#cover-preview').hidden ? $('#cover-preview').src : '';
  for (const url of privateImageUrls) if (url !== cover) { URL.revokeObjectURL(url); privateImageUrls.delete(url); }
}
async function setImage(element, path, expiresAt = Infinity) {
  element.removeAttribute('src');
  if (Date.now() >= expiresAt) return;
  if (LOCAL || !new URL(assetUrl(path)).pathname.startsWith('/api/admin/')) { element.src = assetUrl(path); return; }
  if (session?.expires_at <= Date.now() + 30000) await refreshSession();
  const activeToken = session?.access_token;
  try {
    const blob = await api(path, {}, true);
    if (!session || session.access_token !== activeToken || Date.now() >= expiresAt) return;
    const url = URL.createObjectURL(blob); privateImageUrls.add(url); element.src = url;
  } catch (error) { message($('#page-status'), error.message, true); }
}
function showAuth() {
  authVersion++;
  clearTimeout(submissionExpiryTimer);
  clearPrivateImages();
  csrfToken = '';
  posts = []; frames = []; submissions = [];
  $('#workspace').hidden = true; $('#auth-box').hidden = false; $('#logout').hidden = true;
  for (const id of ['submissions-list', 'frames-list', 'posts-list', 'stats']) $('#' + id).replaceChildren();
  for (const id of ['traffic-stats','traffic-pages','traffic-chart','customize-fields']) $('#' + id).replaceChildren();
  for (const id of ['usage-list','usage-services','usage-summary']) $('#'+id).replaceChildren(); $('#usage-status').textContent='';
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
    setImage(image, item.imageUrl, pending ? item.expiresAt : Infinity); image.alt = `Thiết kế khung ${item.name}`; image.loading = 'lazy';
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
  $('#post-form textarea[name="content"]').dispatchEvent(new Event('input'));
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
  if (typeof Event === 'function') $('#posts-filter')?.dispatchEvent?.(new Event('input'));
}
async function loadAll() {
  const version = authVersion;
  const [postData, pendingData, frameData, site] = await Promise.all([api('/api/admin/posts'), api('/api/admin/submissions'), api('/api/admin/frames'), api('/api/admin/site')]);
  if (version !== authVersion) return;
  posts = postData.posts; submissions = pendingData.submissions; frames = frameData.frames;
  clearPrivateImages(true);
  renderStats(); renderPosts(); renderFrames(true); renderFrames(false);
  scheduleSubmissionExpiry();
  const settings = site.site || site;
  currentSettings = settings;
  await loadCustomization(settings);
  await loadAnalytics();
  for (const key of ['displayName', 'shortName', 'intro', 'about', 'email', 'phone', 'blogTitle', 'blogIntro']) $('#site-form').elements.namedItem(key).value = settings[key] || '';
}
function scheduleSubmissionExpiry() {
  clearTimeout(submissionExpiryTimer);
  if (!submissions.length) return;
  const next = Math.min(...submissions.map(item => item.expiresAt));
  submissionExpiryTimer = setTimeout(() => {
    submissions = submissions.filter(item => item.expiresAt > Date.now());
    clearPrivateImages(true);
    renderStats(); renderFrames(true); renderFrames(false);
    scheduleSubmissionExpiry();
  }, Math.min(2147483647, Math.max(0, next - Date.now())));
}
async function enter() { $('#auth-form').reset(); $('#auth-box').hidden = true; $('#workspace').hidden = false; $('#logout').hidden = false; message($('#auth-status')); await loadAll(); }
async function initialize() {
  try {
    if (LOCAL) {
      const data = await api('/api/admin/session');
      if (data.authenticated) { csrfToken = data.csrfToken; await enter(); return; }
      needsSetup = data.needsSetup; showAuth(); $('#auth-form').hidden = false;
      $('#password').minLength = needsSetup ? 12 : 0; $('#password').maxLength = 128;
      $('#password').autocomplete = needsSetup ? 'new-password' : 'current-password';
      $('#auth-submit').textContent = needsSetup ? 'Tạo mật khẩu' : 'Đăng nhập';
      $('#auth-submit').disabled = !!needsSetup && !data.setupAllowed;
      $('#auth-note').textContent = needsSetup ? 'Tạo mật khẩu riêng để quản trị bản trên máy này.' : 'Đăng nhập bằng mật khẩu quản trị trên máy này.';
      return;
    }
    if (!session && !(await refreshSession())) { showAuth(); $('#auth-form').hidden = false; $('#auth-note').textContent = 'Đăng nhập bằng tài khoản quản trị của Hùng để quản lý nội dung và duyệt khung.'; return; }
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
      coverData = normalized; $('#cover-preview').src = coverData; $('#cover-preview').hidden = false; message($('#post-status'), 'Ảnh bìa đã chuyển thành WebP, sẽ được lưu cùng bài viết.'); $('#post-form').dispatchEvent(new Event('input'));
    } finally { URL.revokeObjectURL(url); }
  } catch (error) { event.target.value = ''; message($('#post-status'), error.message, true); }
});
$('#post-form').addEventListener('submit', async event => {
  // Bấm Lưu: lưu và nạp lại form từ máy chủ. Tự lưu (form.dataset.autosave): chỉ cập nhật id và danh sách,
  // không đặt lại form để chữ Hùng đang gõ không bị mất.
  event.preventDefault(); const form = event.currentTarget, button = $('#save-post'), auto = form.dataset.autosave === '1'; button.disabled = true; if (!auto) message($('#post-status'));
  try {
    const values = Object.fromEntries(new FormData(form)); const id = values.id; delete values.id;
    values.tags = String(values.tags || '').split(',').map(tag => tag.trim()).filter(Boolean); values.isSample = form.elements.isSample.checked;
    if (coverData !== undefined) values.coverDataUrl = coverData;
    const response = await api('/api/admin/posts' + (id ? '/' + encodeURIComponent(id) : ''), { method: id ? 'PUT' : 'POST', body: JSON.stringify(values) });
    if (auto) {
      if (response.post?.id) form.elements.id.value = response.post.id;
      coverData = undefined;
      const postData = await api('/api/admin/posts'); posts = postData.posts; renderPosts(); renderStats();
    } else { await loadAll(); if (response.post) editPost(response.post); }
    message($('#post-status'), values.status === 'published' ? `Đã lưu lúc ${clock()} và cập nhật ngay trên web.` : `Đã lưu bản nháp lúc ${clock()}. Chọn Xuất bản để bài hiện trên web.`);
  } catch (error) { message($('#post-status'), error.message, true); } finally { button.disabled = false; }
});
$('#site-form').addEventListener('submit', async event => {
  event.preventDefault(); const button = $('#save-site'); button.disabled = true;
  try { currentSettings = await api('/api/admin/site', { method: 'PUT', body: JSON.stringify({...currentSettings,...Object.fromEntries(new FormData(event.currentTarget))}) }); message($('#site-status'), `Đã lưu lúc ${clock()} và cập nhật ngay trên web.`); } catch (error) { message($('#site-status'), error.message, true); } finally { button.disabled = false; }
});
async function loadAnalytics() {
  try {
    const data = await api('/api/admin/analytics');
    $('#traffic-stats').replaceChildren(...[[data.total,'Tổng lượt truy cập'],[data.today,'Hôm nay'],[data.last7,'7 ngày gần nhất'],[data.last30,'30 ngày gần nhất']].map(([count,label]) => {const card=make('div',undefined,'stat');card.append(make('b',Number(count).toLocaleString('vi-VN')),make('span',label));return card;}));
    const names={main:'Trang chính',blog:'Blog',photobooth:'Photobooth',snaptik:'Snap',lamnet:'Làm Nét',cotuong:'Cờ Tướng'};
    $('#traffic-pages').replaceChildren(...Object.entries(names).map(([page,label]) => make('p',label+': '+(data.pages.find(row=>row.page===page)?.count || 0).toLocaleString('vi-VN'))));
    const max=Math.max(1,...data.daily.map(row=>row.count));
    $('#traffic-chart').replaceChildren(...data.daily.map(row=>{const column=make('div',undefined,'traffic-column'),bar=make('div');bar.style.height=Math.max(2,row.count/max*120)+'px';bar.title=row.day+': '+row.count+' lượt xem';column.append(bar,make('small',row.day.slice(5)),make('span',String(row.count)));return column;}));
  } catch (error) { $('#traffic-stats').replaceChildren(make('p','Chưa tải được số liệu: '+error.message)); }
}
async function loadCustomization(settings) {
  if (!contentFields.length) {
    const response=await fetch('content-fields.json');
    if(!response.ok) throw new Error('Chưa tải được danh sách nội dung chỉnh sửa.');
    contentFields=await response.json();
  }
  const container=$('#customize-fields');container.replaceChildren();
  const global=make('details');global.append(make('summary','Màu giao diện và mạng xã hội'));
  for(const [key,fallback] of Object.entries({cream:'#fbf2e3',blue:'#303487',yellow:'#ffdc38'})) {
    const label=make('label',({cream:'Màu nền',blue:'Màu chữ / chủ đạo',yellow:'Màu nhấn'})[key]),input=make('input');input.type='color';input.dataset.theme=key;input.value=settings.theme?.[key] || fallback;label.append(input);global.append(label);
  }
  const defaults={facebook:'https://www.facebook.com/quanghungdethuong',instagram:'https://www.instagram.com/im.bqhung/',threads:'https://www.threads.com/@im.bqhung',tiktok:'https://www.tiktok.com/@im.bqhung',zalo:'https://zalo.me/0898298886',youtube:'https://www.youtube.com/@hunghienhoa98886',wechat:'bqhtit'};
  const socialNames={facebook:'Facebook',instagram:'Instagram',threads:'Threads',tiktok:'TikTok',zalo:'Zalo',youtube:'YouTube',wechat:'Mã WeChat'};
  for(const [key,value] of Object.entries(defaults)) {const label=make('label',socialNames[key]),input=make('input');input.type=key==='wechat'?'text':'url';input.required=true;input.maxLength=key==='wechat'?80:500;input.dataset.social=key;input.value=settings.socials?.[key] || value;label.append(input);global.append(label);}
  container.append(global);
  const images=make('details');images.append(make('summary','Ảnh trang chính — ảnh đại diện'));
  const imageGrid=make('div',undefined,'field-grid');images.append(imageGrid);
  for(const [key,name] of Object.entries({about:'Ảnh đại diện ở mục Về Hùng'})) {
    const label=make('label',name,'custom-field media-field'),input=make('input'),preview=make('img'),note=make('p');
    input.type='file';input.accept='image/png,image/jpeg,image/webp';input.dataset.imageKey=key;input.dataset.imageUrl=settings.pageImages?.[key]||'';
    preview.alt=name;preview.hidden=!input.dataset.imageUrl;if(input.dataset.imageUrl)preview.src=input.dataset.imageUrl;
    const version=authVersion;
    input.addEventListener('change',async()=>{const file=input.files[0];if(!file)return;input.disabled=true;$('#save-customization').disabled=true;try{const asset=await uploadAdminImage(file,'site');if(version!==authVersion || !input.isConnected)return;input.dataset.imageUrl=asset.url;preview.hidden=false;setImage(preview,asset.previewUrl);note.textContent='Ảnh đã chọn, đang tự lưu…';$('#customize-form').dispatchEvent(new Event('input'));}catch(error){if(version===authVersion)note.textContent=error.message;}finally{input.disabled=false;$('#save-customization').disabled=!!document.querySelector('[data-image-key]:disabled');input.value='';}});
    const reset=action('Khôi phục hình gốc',async()=>{input.dataset.imageUrl='';preview.hidden=true;preview.removeAttribute('src');note.textContent='Đang khôi phục ảnh gốc…';$('#customize-form').dispatchEvent(new Event('input'));});
    label.append(input,preview,note,reset);imageGrid.append(label);
  }
  container.append(images);
  for(const [page,name] of Object.entries({main:'Trang chủ',blog:'Góc tò mò (Blog)',photobooth:'Hộp Ảnh',snaptik:'Snap Video',lamnet:'Làm Nét',cotuong:'Cờ Tướng',admin:'Trang quản trị'})) {
    const group=make('details');group.append(make('summary',name));
    const pageUrl={main:'/',blog:'/blog/',photobooth:'/photobooth/',snaptik:'/snaptik/',lamnet:'/lamnet/',cotuong:'/cotuong/'}[page];
    if(pageUrl){const open=make('a','Mở trang này trong thẻ mới ↗','page-link');open.href=SITE+pageUrl;open.target='_blank';open.rel='noopener';group.append(open);}
    const grid=make('div',undefined,'field-grid');group.append(grid);
    for(const field of contentFields.filter(field=>field.page===page)) {
      const label=make('label',field.label,'custom-field'),input=make('textarea');input.rows=2;input.maxLength=3000;input.dataset.textKey=field.key;input.value=settings.pageTexts?.[field.key] ?? field.default;
      const reset=action('Khôi phục chữ gốc',async()=>{input.value=field.default;input.dispatchEvent(new Event('input',{bubbles:true}));});label.append(input,reset);grid.append(label);
    }
    container.append(group);
  }
  contentTabs();
}
/* Nội dung web dạng hai cột: bên trái chọn phần cần sửa (thông tin chung, màu, ảnh, từng trang),
   bên phải chỉ hiện các ô của phần đó. Khi gõ tìm kiếm thì hiện mọi phần có kết quả. */
let activeTab = 'basic';
function contentGroups() {
  const groups = [['basic', 'Thông tin chung', document.querySelector('.basic-settings')]];
  [...document.querySelectorAll('#customize-fields>details')].forEach((group, index) => groups.push(['group-' + index, group.querySelector('summary')?.textContent || 'Nhóm ' + (index + 1), group]));
  return groups;
}
function applyTabs() {
  const groups = contentGroups();
  if (!groups.some(([id]) => id === activeTab)) activeTab = 'basic';
  for (const [id, , element] of groups) { if (!element) continue; element.hidden = id !== activeTab; element.open = true; }
  $('#customize-form').hidden = activeTab === 'basic';
  for (const button of document.querySelectorAll('#content-tabs button')) button.setAttribute('aria-pressed', String(button.dataset.tab === activeTab));
}
function contentTabs() {
  const nav = $('#content-tabs');
  if (!nav || typeof nav.replaceChildren !== 'function') return;
  nav.replaceChildren(...contentGroups().map(([id, label]) => {
    const button = make('button', label); button.type = 'button'; button.dataset.tab = id;
    button.addEventListener('click', () => { activeTab = id; $('#customize-search').value = ''; for (const field of document.querySelectorAll('.custom-field')) field.hidden = false; applyTabs(); $('.content-panel')?.scrollIntoView({ block: 'nearest' }); });
    return button;
  }));
  applyTabs();
}
$('#refresh-analytics').addEventListener('click',loadAnalytics);
$('#editor-columns').addEventListener('change',event=>{
  if(['2','3','4'].includes(event.target.value)) $('#customize-fields').style.setProperty('--editor-columns',event.target.value);
});
$('#customize-search').addEventListener('input',event=>{
  const query=event.target.value.toLocaleLowerCase('vi-VN').trim();
  for(const label of document.querySelectorAll('.custom-field'))label.hidden=!!query && !(label.textContent+' '+(label.querySelector('textarea')?.value||'')).toLocaleLowerCase('vi-VN').includes(query);
  let first;
  for(const group of document.querySelectorAll('#customize-fields details')) {
    const fields=[...group.querySelectorAll('.custom-field')];
    group.hidden=!!query && !fields.some(field=>!field.hidden);
    if(query && !group.hidden && !first) first=group;
  }
  if(first) first.open=true;
});
$('#customize-search').addEventListener('input',event=>{
  if(event.target.value.trim()){$('.basic-settings').hidden=true;$('#customize-form').hidden=false;for(const button of document.querySelectorAll('#content-tabs button'))button.setAttribute('aria-pressed','false');}
  else applyTabs();
});
$('#posts-filter')?.addEventListener('input',event=>{
  const query=event.target.value.toLocaleLowerCase('vi-VN').trim();
  for(const entry of document.querySelectorAll('#posts-list .post-entry'))entry.hidden=!!query&&!entry.textContent.toLocaleLowerCase('vi-VN').includes(query);
});
$('#customize-form').addEventListener('submit',async event=>{
  event.preventDefault();const button=$('#save-customization');button.disabled=true;
  try {
    const pageTexts={},socials={},theme={},pageImages={};
    for(const input of document.querySelectorAll('[data-image-key]'))if(input.dataset.imageUrl)pageImages[input.dataset.imageKey]=input.dataset.imageUrl;
    for(const input of document.querySelectorAll('[data-text-key]'))if(input.value!==contentFields.find(field=>field.key===input.dataset.textKey).default)pageTexts[input.dataset.textKey]=input.value;
    for(const input of document.querySelectorAll('[data-social]'))socials[input.dataset.social]=input.value.trim();
    for(const input of document.querySelectorAll('[data-theme]'))theme[input.dataset.theme]=input.value;
    currentSettings=await api('/api/admin/site',{method:'PUT',body:JSON.stringify({...currentSettings,pageTexts,pageImages,socials,theme})});
    message($('#customize-status'),`Đã lưu lúc ${clock()} và cập nhật ngay trên web.`);
  }catch(error){message($('#customize-status'),error.message,true);}finally{button.disabled=false;}
});
/* ---------- Tự lưu ----------
   Sau khi ngừng gõ/chọn 1,5 giây, form được lưu như khi bấm nút Lưu: nội dung trang, màu, mạng xã hội, thông tin chung
   và bài viết. Máy chủ xóa cache ngay khi lưu nên trang công khai hiện nội dung mới ở lần tải tiếp theo.
   Bài mới chỉ tự lưu khi đã đủ các ô bắt buộc (mặc định là bản nháp, chưa hiện trên web cho tới khi chọn Xuất bản). */
function clock() { return new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
// Chỉ bật tự lưu khi trình duyệt có đủ API (bộ kiểm thử chạy app.js trong môi trường DOM rút gọn).
if (typeof MutationObserver === 'function') {
  const saveBadge = make('span', 'Tự lưu đang bật', 'save-badge');
  saveBadge.setAttribute('role', 'status'); saveBadge.dataset.state = 'idle';
  document.querySelector('.admin-page>header')?.insertBefore(saveBadge, $('#logout'));
  function badge(state, text) { saveBadge.dataset.state = state; saveBadge.textContent = text; }
  // Chấm trạng thái: xanh nhấp nháy khi tự lưu đang bật; đỏ khi tắt (chưa đăng nhập hoặc mất mạng) hay khi lưu lỗi.
  function syncPower() {
    const off = $('#workspace').hidden || navigator.onLine === false;
    if (off) badge('off', $('#workspace').hidden ? 'Tự lưu đang tắt' : 'Mất mạng · tự lưu tạm tắt');
    else if (saveBadge.dataset.state === 'off') badge('idle', 'Tự lưu đang bật');
  }
  new MutationObserver(syncPower).observe($('#workspace'), { attributes: true, attributeFilter: ['hidden'] });
  addEventListener('online', syncPower); addEventListener('offline', syncPower); syncPower();
  const autosaveForms = [['#customize-form', '#save-customization', '#customize-status'], ['#site-form', '#save-site', '#site-status'], ['#post-form', '#save-post', '#post-status']];
  const pending = new Map();
  function waitIdle(button) { return new Promise(resolve => { if (!button.disabled) return resolve(); const observer = new MutationObserver(() => { if (!button.disabled) { observer.disconnect(); resolve(); } }); observer.observe(button, { attributes: true, attributeFilter: ['disabled'] }); }); }
  async function autosave(form, button, status) {
    pending.delete(form);
    if ($('#workspace').hidden) return;
    if (!form.checkValidity()) { badge('warn', 'Chưa tự lưu: còn ô bắt buộc trống'); return; }
    await waitIdle(button);
    badge('saving', 'Đang lưu…');
    form.dataset.autosave = '1';
    form.requestSubmit(button);
    await new Promise(resolve => setTimeout(resolve, 0));
    await waitIdle(button);
    delete form.dataset.autosave;
    if ($(status).classList.contains('error')) badge('error', 'Lưu chưa được: ' + $(status).textContent);
    else if (!pending.size) badge('saved', `Đã lưu ${clock()} · đã lên web`);
  }
  for (const [formSelector, buttonSelector, statusSelector] of autosaveForms) {
    const form = $(formSelector), button = $(buttonSelector);
    const queue = event => {
      if (event.target.type === 'search' || event.target.id === 'editor-columns' || event.target.type === 'file') return;
      clearTimeout(pending.get(form)); badge('dirty', 'Có thay đổi, sắp tự lưu…');
      pending.set(form, setTimeout(() => autosave(form, button, statusSelector), 1500));
    };
    form.addEventListener('input', queue); form.addEventListener('change', queue);
    form.addEventListener('submit', () => { clearTimeout(pending.get(form)); pending.delete(form); });
  }
  window.addEventListener('beforeunload', event => { if (pending.size) { event.preventDefault(); event.returnValue = ''; } });
}
window.addEventListener('pagehide', showAuth);
window.addEventListener('pageshow', event => { if (event.persisted) initialize(); });
setInterval(async () => { if (!LOCAL && !session) return; try { const data = await api('/api/admin/session'); if (!data.authenticated) await initialize(); } catch { saveSession(null); showAuth(); } }, 60000);
initialize();

// Thanh trên cùng của trang quản trị: vuốt xuống thì ẩn, vuốt lên thì hiện lại (giống các trang công khai).
(() => {
  const bar = document.querySelector('.admin-page>header');
  if (!bar || typeof window.addEventListener !== 'function' || typeof requestAnimationFrame !== 'function') return;
  let lastY = window.scrollY || 0, ticking = false;
  const update = () => {
    ticking = false;
    const y = Math.max(0, window.scrollY || 0), delta = y - lastY;
    if (y < 80 || bar.contains(document.activeElement)) bar.classList.remove('is-hidden');
    else if (delta > 6) bar.classList.add('is-hidden');
    else if (delta < -6) bar.classList.remove('is-hidden');
    if (Math.abs(delta) > 6 || y < 80) lastY = y;
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, {passive: true});
  bar.addEventListener('focusin', () => bar.classList.remove('is-hidden'));
})();


// Ngách nội dung cho hệ thống đăng bài tự động (bảng ai_niches trên Supabase; chỉ có ở bản cloud).
let niches = [];
const NICHE_TYPES = { ai_news: 'Tin AI', tech_deep_dive: 'Công nghệ chuyên sâu', github_trending: 'Dự án GitHub', tips: 'Thủ thuật', guide: 'Hướng dẫn từ GitHub' };
const nicheBody = (niche, changes = {}) => ({ name: niche.name, slug: niche.slug, category_type: niche.categoryType, keywords: niche.keywords, rss_sources: niche.rssSources, system_tone: niche.systemTone, post_category: niche.postCategory, is_active: niche.isActive, ...changes });
function renderNiches() {
  const target = $('#niches-list');
  if (!target) return;
  const active = niches.filter(n => n.isActive).length, postsTotal = niches.reduce((a, n) => a + n.stats.posts, 0), words = niches.reduce((a, n) => a + n.stats.totalWords, 0);
  $('#niche-summary').textContent = `${active}/${niches.length} ngách đang bật · ${postsTotal} bài tự động · ${words.toLocaleString('vi-VN')} từ`;
  if (!niches.length) { empty(target, 'Chưa có ngách nào. Thêm ngách đầu tiên ở khung bên cạnh.'); return; }
  target.replaceChildren(...niches.map(niche => {
    const card = make('article', undefined, 'niche-card' + (niche.isActive ? '' : ' is-off'));
    const head = make('div', undefined, 'niche-head');
    head.append(make('h3', niche.name), make('span', niche.isActive ? 'Đang bật' : 'Đang tắt', 'niche-state'));
    const meta = make('p', `${NICHE_TYPES[niche.categoryType] || niche.categoryType} · ${niche.postCategory} · ${niche.keywords.length} từ khóa · ${niche.rssSources.length} nguồn RSS`);
    const stats = make('p', `${niche.stats.posts} bài (${niche.stats.published} đã đăng) · trung bình ${niche.stats.averageWords.toLocaleString('vi-VN')} từ · tổng ${niche.stats.totalWords.toLocaleString('vi-VN')} từ`, 'niche-stats');
    const used = make('small', niche.lastUsedAt ? `Dùng gần nhất: ${new Date(niche.lastUsedAt).toLocaleString('vi-VN')}` : 'Chưa dùng lần nào');
    const controls = make('div', undefined, 'item-actions');
    controls.append(
      action(niche.isActive ? 'Tắt' : 'Bật', async () => { await api(`/api/admin/niches/${niche.id}`, { method: 'PUT', body: JSON.stringify(nicheBody(niche, { is_active: !niche.isActive })) }); await loadNiches(); message($('#niche-status'), `Đã ${niche.isActive ? 'tắt' : 'bật'} ngách “${niche.name}”.`); }, 'outline'),
      action('Sửa', async () => { editNiche(niche); $('#niche-form').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 'outline'),
      action('Xóa', async () => { if (!confirm(`Xóa ngách “${niche.name}”? Các bài đã đăng vẫn giữ nguyên.`)) return; await api(`/api/admin/niches/${niche.id}`, { method: 'DELETE' }); await loadNiches(); message($('#niche-status'), 'Đã xóa ngách.'); }, 'outline danger')
    );
    card.append(head, meta, stats, used, controls);
    return card;
  }));
}
function editNiche(niche) {
  const form = $('#niche-form'); if (!form?.elements) return;
  form.reset();
  form.elements.namedItem('id').value = niche?.id || '';
  form.elements.namedItem('name').value = niche?.name || '';
  form.elements.namedItem('slug').value = niche?.slug || '';
  form.elements.namedItem('category_type').value = niche?.categoryType || 'ai_news';
  form.elements.namedItem('post_category').value = niche?.postCategory || 'Góc nhìn';
  form.elements.namedItem('keywords').value = (niche?.keywords || []).join('\n');
  form.elements.namedItem('rss_sources').value = (niche?.rssSources || []).join('\n');
  form.elements.namedItem('system_tone').value = niche?.systemTone || '';
  form.elements.namedItem('is_active').checked = niche ? niche.isActive : true;
  $('#niche-form-title').textContent = niche ? `Sửa ngách “${niche.name}”` : 'Thêm ngách mới';
  message($('#niche-status'));
}
async function loadNiches() {
  try { niches = (await api('/api/admin/niches')).niches || []; renderNiches(); }
  catch (error) { message($('#niche-status'), LOCAL ? 'Ngách nội dung chỉ có trên bản cloud (admin.hunghienhoa.com).' : error.message, true); }
}
$('#refresh-niches')?.addEventListener?.('click', () => loadNiches());
$('#new-niche')?.addEventListener?.('click', () => editNiche());
$('#niche-form')?.addEventListener?.('submit', async event => {
  event.preventDefault();
  const form = event.target, id = form.elements.namedItem('id').value, button = $('#save-niche');
  const body = { name: form.elements.namedItem('name').value, slug: form.elements.namedItem('slug').value.trim().toLowerCase(), category_type: form.elements.namedItem('category_type').value, post_category: form.elements.namedItem('post_category').value, keywords: form.elements.namedItem('keywords').value, rss_sources: form.elements.namedItem('rss_sources').value, system_tone: form.elements.namedItem('system_tone').value, is_active: form.elements.namedItem('is_active').checked };
  button.disabled = true;
  try {
    await api(id ? `/api/admin/niches/${id}` : '/api/admin/niches', { method: id ? 'PUT' : 'POST', body: JSON.stringify(body) });
    await loadNiches(); editNiche(); message($('#niche-status'), id ? 'Đã lưu thay đổi của ngách.' : 'Đã thêm ngách mới.');
  } catch (error) { message($('#niche-status'), error.message, true); }
  finally { button.disabled = false; }
});
document.querySelector('[data-panel="niches"]')?.addEventListener?.('click', () => { if (!niches.length) loadNiches(); });
