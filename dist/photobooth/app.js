import { coverCrop, applyFilterPixels } from './core.mjs?v=2';
import { DEFAULT_DESIGN, PHOTO_SESSION_MS, normalizeDesign, photoSessionExpired, drawFrameTemplate, drawFrameFooter } from './design.mjs?v=2';

const $ = selector => document.querySelector(selector);
const video = $('#camera');
const strip = $('#strip');
const ctx = strip.getContext('2d');
const nativeCanvasFilters = 'filter' in ctx;
const frameFontsReady = Promise.all([
  document.fonts.load('700 20px "Be Vietnam Pro"', 'HỘP ẢNH CỦA BẠN'),
  document.fonts.load('800 24px "Be Vietnam Pro"', 'Kỷ niệm'),
  document.fonts.load('italic 600 46px "Playfair Display"', 'Một chút hôm nay'),
  document.fonts.ready
]);
let filteredPhotoCache = new WeakMap();
const status = $('#status');
const photos = Array(4).fill(null);
const filters = { original: 'none', mono: 'grayscale(1) contrast(1.08)', warm: 'sepia(.24) saturate(1.2) contrast(1.04)', nostalgia: 'sepia(.4) saturate(.72) contrast(.94) brightness(1.05)' };
const frames = {
  cream: normalizeDesign({}),
  blue: normalizeDesign({ background: '#303487', ink: '#fbf2e3', accent: '#ffdc38' }),
  pink: normalizeDesign({ background: '#efb9c4', pattern: 'dots', sticker: 'heart' }),
  yellow: normalizeDesign({ background: '#ffdc38', accent: '#e67f8f', pattern: 'grid', sticker: 'star' })
};
const stickers = {};
let selectedSlot = 0;
let frame = 'cream';
let activeDesign = frames.cream;
let selectedFrameLabel = 'Giấy kem';
let communityFrameImage = null;
let photoExpiresAt = 0;
let photoExpiryTimer;
let importToken = 0;
let submitting = false;
let submissionRequest;
const apiBase = String(window.HUNG_API_BASE || '').replace(/\/+$/, '');
let filter = 'original';
let stream = null;
let busy = false;
let startingCamera = false;
let cameraRequest = 0;
let shootToken = 0;
let downloaded = false;

function tell(message, error = false) {
  status.textContent = message;
  status.classList.toggle('error', error);
}

function updateUI() {
  if (checkPhotoExpiry()) return;
  const count = photos.filter(Boolean).length;
  $('#photo-count').textContent = `${count} / 4`;
  $('#camera-state').textContent = startingCamera ? 'Đang mở…' : stream ? 'Đang bật' : 'Đang tắt';
  $('#start-camera').disabled = !!stream || startingCamera || busy;
  $('#stop-camera').disabled = !stream && !startingCamera;
  $('#capture-auto').disabled = !stream || busy;
  $('#capture-auto').textContent = count === 4 ? 'Chụp lại 4 tấm' : 'Chụp 4 tấm';
  $('#capture-one').disabled = !stream || busy || (count === 4 && selectedSlot < 0);
  $('#capture-one').textContent = selectedSlot >= 0 && photos[selectedSlot] ? `Chụp lại ảnh ${selectedSlot + 1}` : 'Chụp 1 tấm';
  $('#mirror').disabled = busy;
  $('#upload').disabled = busy;
  $('.upload-button').classList.toggle('disabled', busy);
  $('#download').disabled = count !== 4 || busy;
  $('#download').firstChild.textContent = downloaded ? 'Tải lại dải ảnh WebP ' : 'Tải dải ảnh WebP ';
  $('#reset').disabled = count === 0 || busy;
  $('#step-capture').classList.toggle('current', count < 4);
  $('#step-frame').classList.toggle('current', count === 4 && !downloaded);
  $('#step-save').classList.toggle('current', downloaded);
  document.querySelectorAll('[data-slot]').forEach(button => {
    const index = Number(button.dataset.slot);
    const image = button.querySelector('img');
    button.disabled = busy;
    button.setAttribute('aria-pressed', String(index === selectedSlot));
    button.classList.toggle('selected', index === selectedSlot);
    button.classList.toggle('has-photo', !!photos[index]);
    button.setAttribute('aria-label', `Ảnh ${index + 1}, ${photos[index] ? 'chọn để thay ảnh' : 'chưa có ảnh'}`);
    image.hidden = !photos[index];
    if (photos[index]) image.src = photos[index].url;
    else image.removeAttribute('src');
    document.querySelector(`[data-remove="${index}"]`).disabled = busy || !photos[index];
  });
  video.classList.toggle('mirrored', $('#mirror').checked);
  video.style.filter = filters[filter];
  strip.setAttribute('aria-label', `Dải ảnh xem trước: ${count} trên 4 ảnh, khung ${selectedFrameLabel}.`);
  $('#session-note').textContent = photoExpiresAt ? `Ảnh chỉ ở bộ nhớ tạm và tự xóa lúc ${new Date(photoExpiresAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}, hoặc ngay khi rời trang.` : 'Ảnh chỉ ở bộ nhớ tạm, không tải lên máy chủ. Phiên ảnh tự xóa sau 1 giờ.';
  renderStrip();
}

function drawPhoto(photo, x, y, width, height) {
  const crop = coverCrop(photo.image.width, photo.image.height, width, height);
  if (nativeCanvasFilters || filter === 'original') {
    ctx.save();
    if (nativeCanvasFilters) ctx.filter = filters[filter];
    ctx.drawImage(photo.image, crop.sx, crop.sy, crop.sw, crop.sh, x, y, width, height);
    ctx.restore();
    return;
  }
  let cache = filteredPhotoCache.get(photo);
  if (!cache) { cache = new Map(); filteredPhotoCache.set(photo, cache); }
  let filtered = cache.get(filter);
  if (!filtered) {
    filtered = document.createElement('canvas');
    filtered.width = width;
    filtered.height = height;
    const context = filtered.getContext('2d');
    context.drawImage(photo.image, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height);
    pixels.data.set(applyFilterPixels(pixels.data, filter));
    context.putImageData(pixels, 0, 0);
    cache.set(filter, filtered);
  }
  ctx.drawImage(filtered, x, y, width, height);
}

function frameAssets(design = activeDesign) {
  return { flower: stickers[design.ink === '#fbf2e3' ? 'yellow' : 'blue'], star: stickers.star, heart: stickers.heart };
}

function renderStrip() {
  if (communityFrameImage) {
    ctx.clearRect(0, 0, 720, 2180);
    ctx.drawImage(communityFrameImage, 0, 0, 720, 2180);
  } else drawFrameTemplate(ctx, activeDesign, frameAssets());
  photos.forEach((photo, index) => {
    if (photo) drawPhoto(photo, 40, 100 + index * 470, 640, 450);
  });
  drawFrameFooter(ctx, activeDesign, frameAssets(), $('#caption').value.trim() || activeDesign.footer, new Date().toLocaleDateString('vi-VN'));
}

function disposePhoto(photo) {
  if (!photo) return;
  filteredPhotoCache.get(photo)?.forEach(canvas => { canvas.width = canvas.height = 1; });
  filteredPhotoCache.delete(photo);
  photo.image.width = photo.image.height = 1;
  photo.url = '';
}

function clearPhotoSession(message = '', stopStream = false) {
  importToken++;
  photos.forEach(disposePhoto);
  photos.fill(null);
  filteredPhotoCache = new WeakMap();
  clearTimeout(photoExpiryTimer);
  photoExpiresAt = 0;
  selectedSlot = 0;
  downloaded = false;
  $('#caption').value = '';
  if (stopStream) stopCamera(false);
  else updateUI();
  if (message) tell(message);
}

function checkPhotoExpiry() {
  if (!photoSessionExpired(photoExpiresAt, Date.now())) return false;
  clearPhotoSession('Phiên ảnh đã hết 1 giờ và được xóa. Bạn có thể bắt đầu một bộ ảnh mới.', true);
  return true;
}

function beginPhotoSession() {
  if (photoExpiresAt) return;
  photoExpiresAt = Date.now() + PHOTO_SESSION_MS;
  photoExpiryTimer = setTimeout(checkPhotoExpiry, PHOTO_SESSION_MS);
}

function photoFromImage(image, mirrored = false) {
  const width = image.videoWidth || image.naturalWidth || image.width;
  const height = image.videoHeight || image.naturalHeight || image.height;
  if (!width || !height) throw new Error('Chưa nhận được hình ảnh. Vui lòng thử lại.');
  if (width * height > 45000000) throw new Error('Ảnh quá lớn. Hãy chọn ảnh dưới 45 triệu điểm ảnh.');
  const scale = Math.min(1, 1280 / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d');
  if (mirrored) { context.translate(canvas.width, 0); context.scale(-1, 1); }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL('image/webp', .92);
  if (!url.startsWith('data:image/webp;')) throw new Error('Trình duyệt chưa hỗ trợ xuất WebP. Hãy thử trình duyệt mới hơn.');
  return { image: canvas, url };
}

function loadPhoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      try { resolve(photoFromImage(image)); } catch (error) { reject(error); }
      finally { URL.revokeObjectURL(url); image.onload = image.onerror = null; image.src = ''; }
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Không đọc được ảnh này. Hãy chọn ảnh PNG, JPEG hoặc WebP khác.')); };
    image.src = url;
  });
}

function stopCamera(announce = true) {
  cameraRequest++;
  shootToken++;
  if (stream) stream.getTracks().forEach(track => track.stop());
  stream = null;
  startingCamera = false;
  busy = false;
  video.pause();
  video.srcObject = null;
  video.hidden = true;
  $('#camera-empty').hidden = false;
  $('#live-label').hidden = true;
  $('#countdown').textContent = '';
  updateUI();
  if (announce) tell('Máy ảnh đã tắt. Những ảnh đã chụp vẫn ở đây để bạn chọn khung và lưu.');
}

$('#start-camera').addEventListener('click', async () => {
  const request = ++cameraRequest;
  startingCamera = true;
  updateUI();
  tell('Hãy cho phép dùng máy ảnh trong thông báo của trình duyệt.');
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Máy ảnh chưa dùng được trên trang này. Bạn vẫn có thể chọn ảnh từ máy.');
    const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
    if (request !== cameraRequest) { media.getTracks().forEach(track => track.stop()); return; }
    stream = media;
    video.srcObject = stream;
    await video.play();
    if (request !== cameraRequest) return;
    video.hidden = false;
    $('#camera-empty').hidden = true;
    $('#live-label').hidden = false;
    tell('Máy ảnh đã sẵn sàng. Cứ tự nhiên tạo dáng nhé!');
  } catch (error) {
    if (request !== cameraRequest) return;
    if (stream) stream.getTracks().forEach(track => track.stop());
    stream = null;
    const messages = { NotAllowedError: 'Chưa được cấp quyền máy ảnh. Bạn có thể cho phép trong trình duyệt hoặc chọn ảnh từ máy.', NotFoundError: 'Không tìm thấy máy ảnh. Hãy kết nối máy ảnh hoặc chọn ảnh từ máy.', NotReadableError: 'Máy ảnh đang bận. Hãy đóng ứng dụng khác đang dùng máy ảnh rồi thử lại.' };
    tell(messages[error.name] || error.message || 'Không mở được máy ảnh. Hãy thử chọn ảnh từ máy.', true);
  } finally {
    if (request === cameraRequest) { startingCamera = false; updateUI(); }
  }
});
$('#stop-camera').addEventListener('click', () => stopCamera());
$('#mirror').addEventListener('change', updateUI);
window.addEventListener('pagehide', () => {
  clearPhotoSession('', true);
  submissionRequest?.abort();
  $('#contribution-form').reset();
  $('#contribution-status').textContent = '';
  if ($('#frame-creator').open) $('#frame-creator').close();
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkPhotoExpiry(); });

async function capture(automatic) {
  if (checkPhotoExpiry() || !stream || busy) return;
  const targets = automatic ? [0, 1, 2, 3] : [selectedSlot >= 0 ? selectedSlot : photos.findIndex(photo => !photo)];
  if (targets[0] < 0) { tell('Hãy chọn một ô ảnh để chụp lại.'); return; }
  const token = ++shootToken;
  busy = true;
  downloaded = false;
  updateUI();
  try {
    for (const index of targets) {
      tell(`Chuẩn bị ảnh ${index + 1} trên 4. Cười lên nào!`);
      for (let second = 3; second > 0; second--) {
        if (token !== shootToken) return;
        $('#countdown').textContent = String(second);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      if (token !== shootToken || !stream) return;
      const photo = photoFromImage(video, $('#mirror').checked);
      disposePhoto(photos[index]);
      photos[index] = photo;
      beginPhotoSession();
      $('#camera-stage').classList.remove('flash');
      requestAnimationFrame(() => $('#camera-stage').classList.add('flash'));
      selectedSlot = photos.findIndex(photo => !photo);
      $('#countdown').textContent = '';
      updateUI();
    }
    tell(photos.every(Boolean) ? 'Đủ bốn khoảnh khắc rồi! Chọn khung, thêm lời nhắn và tải ảnh về nhé.' : 'Đã chụp xong. Bạn có thể chọn ô khác để chụp tiếp.');
  } catch (error) { tell(error.message || 'Chưa chụp được ảnh. Hãy thử lại.', true); }
  finally { if (token === shootToken) { busy = false; $('#countdown').textContent = ''; updateUI(); } }
}
$('#capture-auto').addEventListener('click', () => capture(true));
$('#capture-one').addEventListener('click', () => capture(false));

$('#upload').addEventListener('change', async event => {
  const files = Array.from(event.target.files || []);
  event.target.value = '';
  if (!files.length || busy) return;
  if (startingCamera) stopCamera(false);
  if (files.length > 4) { tell('Mỗi lần chọn tối đa bốn ảnh nhé.', true); return; }
  if (files.some(file => !['image/png', 'image/jpeg', 'image/webp'].includes(file.type))) { tell('Hãy chọn ảnh PNG, JPEG hoặc WebP.', true); return; }
  if (files.some(file => file.size > 12 * 1024 * 1024)) { tell('Mỗi ảnh cần nhỏ hơn 12 MB. Hãy chọn ảnh nhẹ hơn nhé.', true); return; }
  const token = ++importToken;
  busy = true;
  updateUI();
  tell('Đang đọc ảnh ngay trên máy bạn…');
  try {
    const incoming = [];
    for (const file of files) incoming.push(await loadPhoto(file));
    if (token !== importToken) { incoming.forEach(disposePhoto); return; }
    const start = selectedSlot >= 0 ? selectedSlot : 0;
    incoming.forEach((photo, index) => { const slot = (start + index) % 4; disposePhoto(photos[slot]); photos[slot] = photo; });
    beginPhotoSession();
    selectedSlot = photos.findIndex(photo => !photo);
    downloaded = false;
    tell(photos.every(Boolean) ? 'Đủ bốn ảnh rồi! Thử một khung và tải kỷ niệm về nhé.' : `Đã thêm ${incoming.length} ảnh. Chọn thêm hoặc bật máy ảnh để chụp tiếp.`);
  } catch (error) { tell(error.message || 'Không đọc được ảnh. Hãy thử ảnh khác.', true); }
  finally { if (token === importToken) { busy = false; updateUI(); } }
});

document.querySelectorAll('[data-slot]').forEach(button => button.addEventListener('click', () => {
  if (busy) return;
  selectedSlot = Number(button.dataset.slot);
  tell(`Đã chọn ô ảnh ${selectedSlot + 1}. Chụp một tấm hoặc chọn ảnh từ máy để thay ô này.`);
  updateUI();
}));
document.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => {
  if (busy) return;
  const index = Number(button.dataset.remove);
  disposePhoto(photos[index]);
  photos[index] = null;
  if (photos.every(photo => !photo)) { clearTimeout(photoExpiryTimer); photoExpiresAt = 0; }
  selectedSlot = index;
  downloaded = false;
  tell(`Đã xóa ảnh ${index + 1}. Bạn có thể thêm một khoảnh khắc khác vào ô này.`);
  updateUI();
}));
document.querySelectorAll('[data-frame]').forEach(button => button.addEventListener('click', () => {
  selectDesign(frames[button.dataset.frame], button.textContent.trim(), null, button.dataset.frame);
}));
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  filter = button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  downloaded = false;
  updateUI();
}));
$('#caption').addEventListener('input', () => { downloaded = false; updateUI(); });
$('#reset').addEventListener('click', () => {
  if (!busy) clearPhotoSession('Đã làm trống dải ảnh. Một bộ kỷ niệm mới đang chờ bạn.');
});

async function webpBlob(canvas) {
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .94));
  if (!blob || blob.type !== 'image/webp') throw new Error('Chưa xuất được WebP. Hãy thử trình duyệt mới hơn.');
  return blob;
}

async function jpegBlob(canvas) {
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .95));
  if (!blob || blob.type !== 'image/jpeg') throw new Error('Chưa xuất được JPEG. Hãy thử lại.');
  return blob;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

$('#download').addEventListener('click', async () => {
  if (checkPhotoExpiry() || !photos.every(Boolean) || busy) return;
  $('#download').disabled = true;
  try {
    await frameFontsReady;
    if (checkPhotoExpiry() || !photos.every(Boolean)) return;
    renderStrip();
    downloadBlob(await jpegBlob(strip), `hop-anh-hung-${new Date().toLocaleDateString('sv-SE')}.jpg`);
    downloaded = true;
    tell('Đã tạo dải ảnh JPEG. Hãy xem tệp tải về của trình duyệt nhé!');
  } catch { tell('Chưa tải được WebP. Kiểm tra trình duyệt và kết nối thư viện khung rồi thử lại.', true); }
  finally { updateUI(); }
});

function selectDesign(design, label, image = null, id = 'custom') {
  activeDesign = normalizeDesign(design);
  selectedFrameLabel = label;
  communityFrameImage = image;
  frame = id;
  document.querySelectorAll('[data-frame]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.frame === id)));
  document.querySelectorAll('.community-card').forEach(card => card.classList.toggle('selected', card.dataset.frameId === id));
  downloaded = false;
  const preview = $('.print-preview');
  preview.classList.remove('updated');
  requestAnimationFrame(() => preview.classList.add('updated'));
  updateUI();
}

function readDesignForm() {
  return normalizeDesign(Object.fromEntries(Object.keys(DEFAULT_DESIGN).map(key => [key, $(`#design-${key}`).value])));
}

function renderDesignPreview() {
  try {
    const design = readDesignForm();
    drawFrameTemplate($('#design-preview').getContext('2d'), design, frameAssets(design));
    $('#design-status').textContent = '';
  } catch (error) { $('#design-status').textContent = error.message; }
}

function frameOnlyCanvas(design) {
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 2180;
  drawFrameTemplate(canvas.getContext('2d'), design, frameAssets(design));
  return canvas;
}

function openCreator() {
  Object.entries(activeDesign).forEach(([key, value]) => { $(`#design-${key}`).value = value; });
  if (!$('#frame-name').value) $('#frame-name').value = 'Khung của mình';
  renderDesignPreview();
  $('#frame-creator').showModal();
  $('#frame-creator').scrollTop = 0;
}

$('#open-creator').addEventListener('click', openCreator);
$('#contribute-frame').addEventListener('click', openCreator);
$('#close-creator').addEventListener('click', () => $('#frame-creator').close());
$('#frame-creator').addEventListener('click', event => {
  if (event.target !== $('#frame-creator')) return;
  const rect = event.target.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.target.close();
});
$('#design-form').addEventListener('submit', event => event.preventDefault());
$('#design-form').addEventListener('input', renderDesignPreview);
$('#design-form').addEventListener('change', renderDesignPreview);
$('#apply-design').addEventListener('click', () => {
  try {
    selectDesign(readDesignForm(), 'Khung tự tạo');
    $('#frame-creator').close();
    tell('Đã dùng khung bạn vừa tạo. Ảnh vẫn chỉ ở bộ nhớ tạm trên máy bạn.');
  } catch (error) { $('#design-status').textContent = error.message; }
});
$('#download-template').addEventListener('click', async () => {
  try {
    await frameFontsReady;
    downloadBlob(await jpegBlob(frameOnlyCanvas(readDesignForm())), 'khung-hop-anh-cua-minh.jpg');
    $('#design-status').textContent = 'Đã tải khung JPEG trống, không có ảnh chụp của bạn.';
  } catch { $('#design-status').textContent = 'Chưa tải được khung WebP. Hãy thử lại trên trình duyệt mới hơn.'; }
});

function publicImageURL(value) {
  const url = new URL(value, apiBase ? `${apiBase}/` : `${location.origin}/`);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Liên kết ảnh khung không hợp lệ.');
  return url.href;
}

async function loadCommunityFrames() {
  $('#refresh-frames').disabled = true;
  $('#community-status').textContent = 'Đang kết nối thư viện khung…';
  try {
    const response = await fetch(`${apiBase}/api/frames`, { credentials: 'omit', cache: 'no-store' });
    if (!response.ok) throw new Error('Không kết nối được thư viện.');
    const data = await response.json();
    if (!Array.isArray(data.frames)) throw new Error('Thư viện chưa sẵn sàng.');
    $('#community-grid').replaceChildren();
    for (const item of data.frames) {
      try {
        const design = normalizeDesign(item.design);
        if (!/^[a-z\d_-]{1,100}$/i.test(String(item.id))) continue;
        const imageURL = publicImageURL(item.imageUrl);
        const card = document.createElement('article');
        card.className = 'community-card';
        card.dataset.frameId = String(item.id);
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('aria-label', `Dùng khung ${String(item.name)}`);
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.alt = `Khung ${String(item.name)}`;
        image.loading = 'lazy';
        image.src = imageURL;
        const title = document.createElement('b');
        title.textContent = String(item.name);
        button.append(image, title);
        button.addEventListener('click', () => {
          if (!image.complete || !image.naturalWidth) { tell('Khung đang tải. Hãy thử lại sau một chút.', true); return; }
          selectDesign(design, String(item.name), image, String(item.id));
          tell(`Đã chọn khung “${String(item.name)}”.`);
          $('#phong-chup').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        });
        const author = document.createElement('p');
        author.textContent = `Bởi ${String(item.authorName)}`;
        if (item.authorLink) {
          try {
            const url = new URL(item.authorLink);
            if (['http:', 'https:'].includes(url.protocol)) {
              const link = document.createElement('a');
              link.href = url.href;
              link.target = '_blank';
              link.rel = 'noopener noreferrer';
              link.textContent = String(item.authorName);
              author.replaceChildren(document.createTextNode('Bởi '), link);
            }
          } catch { /* Keep the public author name if a link is invalid. */ }
        }
        card.append(button, author);
        $('#community-grid').append(card);
      } catch { /* Ignore malformed public entries; do not render untrusted markup. */ }
    }
    $('#community-status').textContent = $('#community-grid').children.length ? 'Chỉ hiển thị khung đã được duyệt. Bấm để dùng trong dải ảnh của bạn.' : 'Thư viện đang đợi những khung đầu tiên. Bạn có thể tạo và góp một khung ở bên dưới.';
  } catch {
    $('#community-status').textContent = 'Chưa kết nối được thư viện khung. Bạn vẫn có thể tự tạo, dùng và tải khung trên máy mình.';
  } finally { $('#refresh-frames').disabled = false; }
}
$('#refresh-frames').addEventListener('click', loadCommunityFrames);

$('#contribution-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (submitting || !event.currentTarget.reportValidity()) return;
  const feedback = $('#contribution-status');
  submitting = true;
  $('#submit-frame').disabled = true;
  submissionRequest = new AbortController();
  try {
    const authorLink = $('#author-link').value.trim();
    if (authorLink && !['http:', 'https:'].includes(new URL(authorLink).protocol)) throw new Error('Liên kết công khai cần bắt đầu bằng http hoặc https.');
    const design = readDesignForm();
    await frameFontsReady;
    // The submitted canvas is created from design only, never from the photo strip.
    const imageDataUrl = frameOnlyCanvas(design).toDataURL('image/webp', .92);
    if (!imageDataUrl.startsWith('data:image/webp;')) throw new Error('Trình duyệt chưa xuất được WebP. Hãy thử trình duyệt mới hơn.');
    if (imageDataUrl.length > 1398150) throw new Error('Thiết kế khung quá nặng. Hãy giảm họa tiết rồi gửi lại.');
    feedback.textContent = 'Đang gửi riêng thiết kế khung để xét duyệt…';
    const response = await fetch(`${apiBase}/api/frame-submissions`, {
      method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, signal: submissionRequest.signal,
      body: JSON.stringify({ name: $('#frame-name').value.trim(), authorName: $('#author-name').value.trim(), authorContact: $('#author-contact').value.trim(), authorLink, consent: $('#contribution-consent').checked, design, imageDataUrl })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Chưa gửi được khung. Bạn có thể tải khung về và thử lại sau.');
    if (data.status !== 'pending' || !data.id || !Number.isFinite(new Date(data.expiresAt).getTime())) throw new Error('Máy chủ chưa xác nhận bản chờ. Hãy kiểm tra lại sau.');
    feedback.textContent = `Đã gửi khung chờ duyệt. Nếu chưa được duyệt, bản chờ và thông tin liên hệ sẽ tự xóa lúc ${new Date(data.expiresAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}. Ảnh chụp không được gửi.`;
    $('#author-contact').value = '';
    $('#contribution-consent').checked = false;
  } catch (error) {
    if (error.name !== 'AbortError') feedback.textContent = error instanceof TypeError ? 'Chưa kết nối được máy chủ nhận khung. Bạn vẫn có thể tải khung về để giữ riêng.' : error.message;
  } finally {
    submitting = false;
    $('#submit-frame').disabled = false;
    submissionRequest = null;
  }
});

for (const name of ['blue', 'yellow', 'purple', 'coral', 'heart', 'star']) {
  const image = new Image();
  image.onload = () => { stickers[name] = image; renderStrip(); renderDesignPreview(); };
  image.src = ['heart', 'star'].includes(name) ? `assets/${name}.svg` : `assets/asterisk-${name}-face.svg`;
}
frameFontsReady.then(() => { renderStrip(); renderDesignPreview(); }).catch(() => tell('Chưa tải được phông chữ. Kiểm tra kết nối trước khi tải ảnh hoặc gửi khung.', true));
updateUI();
renderDesignPreview();
loadCommunityFrames();
