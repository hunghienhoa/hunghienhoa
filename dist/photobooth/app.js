import { coverCrop, applyFilterPixels } from './core.mjs?v=3';
import { importedFrames } from './imported-frames.mjs';
import { DEFAULT_DESIGN, PHOTO_SESSION_MS, normalizeDesign, photoSessionExpired, drawFrameTemplate, drawFrameFooter, photoWindow } from './design.mjs?v=4';

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
const filters = { original: 'none', mono: 'grayscale(1) contrast(1.08)', warm: 'sepia(.24) saturate(1.2) contrast(1.04)', nostalgia: 'sepia(.4) saturate(.72) contrast(.94) brightness(1.05)', clear:'saturate(1.04) contrast(.96) brightness(1.08)', peach:'sepia(.08) saturate(1.06) contrast(.94) brightness(1.06)', soft:'saturate(.98) contrast(.9) brightness(1.06)' };
const frames = {
  cream: normalizeDesign({"background": "#d5efcf", "ink": "#24574e", "accent": "#8dbb8d", "pattern": "grid", "sticker": "cat", "title": "NHẬT KÝ BẠC HÀ", "footer": "Nhặt một ngày vui, ép vào trang nhỏ."}),
  blue: normalizeDesign({"background": "#16214d", "ink": "#fff4cb", "accent": "#e3baff", "pattern": "sparkles", "sticker": "star", "title": "ĐÊM THIÊN HÀ", "footer": "Mình là một vì sao, theo cách riêng."}),
  pink: normalizeDesign({"background": "#ffe5eb", "ink": "#92274d", "accent": "#ed9bb4", "pattern": "hearts", "sticker": "heart", "title": "TIỆM THƯ TÌNH", "footer": "Một chút thương, gửi vào đây nhé."}),
  yellow: normalizeDesign({"background": "#fff1a8", "ink": "#704029", "accent": "#f4a0aa", "pattern": "confetti", "sticker": "bow", "title": "TIỆC SINH NHẬT", "footer": "Thêm tuổi mới, thêm những nụ cười."}),
  film: normalizeDesign({"background": "#22222c", "ink": "#f7f4e8", "accent": "#aaa3c5", "pattern": "film", "sticker": "smile", "title": "BĂNG GHI HÌNH", "footer": "Bốn cảnh quay, một ngày đáng nhớ."}),
  polaroid: normalizeDesign({"background": "#f8f5e9", "ink": "#243e66", "accent": "#bad1e8", "pattern": "stripes", "sticker": "cloud", "title": "BÁO TƯỜNG TUỔI TRẺ", "footer": "Tin mới: hôm nay mình rất vui!"}),
  checker: normalizeDesign({"background": "#ff713d", "ink": "#281b35", "accent": "#ffdc38", "pattern": "checker", "sticker": "smile", "title": "TRUYỆN TRANH NỔI LOẠN", "footer": "Chuyện mình, mình vẽ tiếp."}),
  scrapbook: normalizeDesign({"background": "#e4d1ae", "ink": "#574033", "accent": "#fff3d9", "pattern": "grid", "sticker": "butterfly", "title": "VÉ TÀU THANH XUÂN", "footer": "Vé một chiều về miền kỷ niệm."}),
  birthday: normalizeDesign({"background": "#f7b6cc", "ink": "#8c294e", "accent": "#fff3c8", "pattern": "confetti", "sticker": "cherry", "title": "BÁNH KEM DÂU", "footer": "Ước một điều rồi cười thật tươi."}),
  together: normalizeDesign({"background": "#d3e9ef", "ink": "#31547a", "accent": "#faf1c2", "pattern": "doodles", "sticker": "bow", "title": "BẢN NHẠC CỦA MÌNH", "footer": "Bật bài mình thích, giữ người mình thương."}),
  coquette: normalizeDesign({"background": "#f9cfe1", "ink": "#833c65", "accent": "#fff6ec", "pattern": "lace", "sticker": "bow", "title": "NƠ HỒNG CÔNG CHÚA", "footer": "Điệu một chút, yêu đời một chút."}),
  neon: normalizeDesign({"background": "#261340", "ink": "#f5eeff", "accent": "#baff66", "pattern": "sparkles", "sticker": "star", "title": "SÂN KHẤU ÁNH SAO", "footer": "Đêm nay, cứ sáng theo cách mình."}),
  cherry: normalizeDesign({"background": "#ad173d", "ink": "#fff0ce", "accent": "#efaeae", "pattern": "hearts", "sticker": "heart", "title": "TIM ĐỎ ĐIỆN ẢNH", "footer": "Thước phim này có bạn ở trong."}),
  cats: normalizeDesign({"background": "#d1ead6", "ink": "#285e46", "accent": "#87ba89", "pattern": "doodles", "sticker": "cat", "title": "CÂU LẠC BỘ MÈO", "footer": "Meo một tiếng, vui cả ngày."}),
  sky: normalizeDesign({"background": "#a0e0f1", "ink": "#135b87", "accent": "#fff5b9", "pattern": "waves", "sticker": "cloud", "title": "BIỂN XANH GỌI TÊN", "footer": "Bỏ túi một mùa hè lấp lánh."}),
  dream: normalizeDesign({"background": "#d7c5f3", "ink": "#63418d", "accent": "#fff3ad", "pattern": "sparkles", "sticker": "butterfly", "title": "VƯỜN MƠ TÍM", "footer": "Hẹn gặp nhau ở một giấc mơ đẹp."}),
  pop: normalizeDesign({"background": "#623fac", "ink": "#fff0c7", "accent": "#ff91c8", "pattern": "sparkles", "sticker": "star", "title": "SÂN KHẤU NHẠC POP", "footer": "Bật nhạc lên, mình là nhân vật chính."}),
  pinktour: normalizeDesign({"background": "#ec9eba", "ink": "#713146", "accent": "#fff7e7", "pattern": "film", "sticker": "bow", "title": "VÉ DIỄN HỒNG", "footer": "Một đêm vui, cả cuộn kỷ niệm."}),
  roseparty: normalizeDesign({"background": "#fff8ef", "ink": "#835f6a", "accent": "#efbdc9", "pattern": "lace", "sticker": "cherry", "title": "SINH NHẬT HOA HỒNG", "footer": "Chúc mình thêm một năm rực rỡ."}),
  superstar: normalizeDesign({"background": "#153d29", "ink": "#f5ffe7", "accent": "#8bf145", "pattern": "checker", "sticker": "star", "title": "SIÊU SAO XANH LÁ", "footer": "Hôm nay đến lượt mình tỏa sáng."}),
  newspaper: normalizeDesign({"background": "#e1ddd2", "ink": "#393b3d", "accent": "#b7b1a5", "pattern": "stripes", "sticker": "butterfly", "title": "MẨU BÁO NGÀY CŨ", "footer": "Chuyện hôm nay, mai thành kỷ niệm."}),
  midnight: normalizeDesign({"background": "#11171f", "ink": "#fff2b8", "accent": "#d9c577", "pattern": "sparkles", "sticker": "star", "title": "ĐOM ĐÓM NỬA ĐÊM", "footer": "Có những ngày nhỏ mà sáng rất lâu."}),
  autumn: normalizeDesign({"background": "#e5d1a4", "ink": "#6b4932", "accent": "#d9914c", "pattern": "doodles", "sticker": "cat", "title": "KHU VƯỜN MÙA THU", "footer": "Đi chậm một chút, thương nhiều một chút."}),
  vietnam: normalizeDesign({"background": "#b51f32", "ink": "#fff5cd", "accent": "#ffda57", "pattern": "confetti", "sticker": "star", "title": "VIỆT NAM TRONG TIM", "footer": "Một dải ảnh nhỏ, một niềm tự hào lớn."}),
  postcard: normalizeDesign({"background": "#fff7df", "ink": "#a62932", "accent": "#edb64a", "pattern": "stripes", "sticker": "heart", "title": "BƯU THIẾP QUÊ NHÀ", "footer": "Mang theo một chút Việt Nam."}),
  melon: normalizeDesign({"background": "#d9f28d", "ink": "#365f37", "accent": "#f28d97", "pattern": "waves", "sticker": "cherry", "title": "DƯA HẤU MÙA HÈ", "footer": "Mát lành như một ngày không vội."}),
  bluehour: normalizeDesign({"background": "#bfd7ed", "ink": "#354f79", "accent": "#fff2cb", "pattern": "film", "sticker": "cloud", "title": "GIỜ XANH DỊU DÀNG", "footer": "Cất một khoảng trời ở trong túi."}),
  lavender: normalizeDesign({"background": "#e9d7ee", "ink": "#75518b", "accent": "#c59cdb", "pattern": "lace", "sticker": "butterfly", "title": "THƯ TÍM HOA OẢI HƯƠNG", "footer": "Gửi người một chút dịu dàng."}),
  blackcat: normalizeDesign({"background": "#e7d6ba", "ink": "#29282d", "accent": "#ae967c", "pattern": "doodles", "sticker": "cat", "title": "MÈO ĐEN TINH NGHỊCH", "footer": "Không cần hoàn hảo, chỉ cần meo."}),
  candy: normalizeDesign({"background": "#f8d9ed", "ink": "#875376", "accent": "#a6cde5", "pattern": "hearts", "sticker": "bow", "title": "KẸO NGỌT TAN CHẢY", "footer": "Ngọt vừa đủ, vui thật nhiều."}),
  minimal: normalizeDesign({"background": "#fffefa", "ink": "#33333d", "accent": "#d9dce2", "pattern": "plain", "sticker": "none", "title": "TRẮNG MỘT CHÚT THÔI", "footer": "Bốn tấm ảnh, chẳng cần thêm gì."}),
  sunset: normalizeDesign({"background": "#f6c4a9", "ink": "#8d443b", "accent": "#ffe4a2", "pattern": "waves", "sticker": "cloud", "title": "HOÀNG HÔN CAM ĐÀO", "footer": "Ngày khép lại, nụ cười còn đây."})
};
const stickers = {};
let selectedSlot = 0;
let frame = 'cream';
let activeDesign = frames.cream;
let selectedFrameLabel = 'Nhật ký bạc hà';
let communityFrameImage = null;
let importedFrame = null;
let frameSelection = 0;
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
  $('#capture-auto').textContent = count === 4 ? 'Chụp lại 4 tấm' : 'Chụp tự động 4 tấm';
  $('#capture-one').disabled = !stream || busy || (count === 4 && selectedSlot < 0);
  const captureLabel = selectedSlot >= 0 && photos[selectedSlot] ? `Chụp lại ảnh ${selectedSlot + 1}` : 'Chụp 1 tấm';
  if ($('#capture-one').dataset.compact) $('#capture-one').setAttribute('aria-label', captureLabel);
  else $('#capture-one').textContent = captureLabel;
  $('#mirror').disabled = busy;
  $('#upload').disabled = busy;
  $('.upload-button').classList.toggle('disabled', busy);
  $('#download').disabled = count !== 4 || busy;
  $('#download').firstChild.textContent = downloaded ? 'Tải lại dải ảnh JPEG ' : 'Tải dải ảnh JPEG ';
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

function drawPhoto(photo, x, y, width, height, target = ctx, resolution = 1) {
  const crop = coverCrop(photo.image.width, photo.image.height, width, height);
  if ((nativeCanvasFilters && !['clear','peach','soft'].includes(filter)) || filter === 'original') {
    target.save();
    if (nativeCanvasFilters) target.filter = filters[filter];
    target.drawImage(photo.image, crop.sx, crop.sy, crop.sw, crop.sh, x, y, width, height);
    target.restore();
    return;
  }
  let cache = filteredPhotoCache.get(photo);
  if (!cache) { cache = new Map(); filteredPhotoCache.set(photo, cache); }
  let filtered = cache.get(filter + resolution);
  if (!filtered) {
    filtered = document.createElement('canvas');
    filtered.width = width * resolution;
    filtered.height = height * resolution;
    const context = filtered.getContext('2d');
    context.drawImage(photo.image, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, filtered.width, filtered.height);
    const pixels = context.getImageData(0, 0, filtered.width, filtered.height);
    pixels.data.set(applyFilterPixels(pixels.data, filter));
    context.putImageData(pixels, 0, 0);
    cache.set(filter + resolution, filtered);
  }
  target.drawImage(filtered, x, y, width, height);
}

function frameAssets(design = activeDesign) {
  return { ...stickers, flower: stickers[design.ink === '#fbf2e3' ? 'yellow' : 'blue'] };
}

function renderStrip(target = ctx, resolution = 1) {
  if (importedFrame) {
    target.clearRect(0,0,720,2180); target.fillStyle='#fbf2e3';target.fillRect(0,0,720,2180);
    importedFrame.slots.forEach(([x,y,w,h],index)=>{
      const photo=photos[index%4];
      if(photo) drawPhoto(photo,x,y,w,h,target,resolution);
      else {target.fillStyle='#eee7df';target.fillRect(x,y,w,h);}
    });
    target.drawImage(importedFrame.image,0,0,720,2180);
    return;
  }
  if (communityFrameImage) {
    target.clearRect(0, 0, 720, 2180);
    target.drawImage(communityFrameImage, 0, 0, 720, 2180);
  } else drawFrameTemplate(target, activeDesign, frameAssets());
  photos.forEach((photo, index) => {
    if (photo) {
      target.save();
      if (!communityFrameImage) { photoWindow(target, activeDesign, index); target.clip(); }
      drawPhoto(photo, 40, 100 + index * 470, 640, 450, target, resolution);
      target.restore();
    }
  });
  drawFrameFooter(target, activeDesign, frameAssets(), $('#caption').value.trim() || activeDesign.footer, new Date().toLocaleDateString('vi-VN'));
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
  const scale = Math.min(1, 2560 / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d');
  if (mirrored) { context.translate(canvas.width, 0); context.scale(-1, 1); }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  let url = canvas.toDataURL('image/webp', .92);
  // Safari can decode WebP without encoding it; this fallback stays in session memory only.
  if (!url.startsWith('data:image/webp;')) url = canvas.toDataURL('image/jpeg', .92);
  if (!url.startsWith('data:image/webp;') && !url.startsWith('data:image/jpeg;')) throw new Error('Chưa xử lý được ảnh. Hãy thử chụp lại hoặc chọn ảnh khác.');
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
    const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 2560 }, height: { ideal: 1920 } }, audio: false });
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
    tell(photos.every(Boolean) ? '' : 'Đã chụp xong. Bạn có thể chọn ô khác để chụp tiếp.');
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
    tell(photos.every(Boolean) ? '' : `Đã thêm ${incoming.length} ảnh. Chọn thêm hoặc bật máy ảnh để chụp tiếp.`);
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
function renderFramePreviews() {
  document.querySelectorAll('[data-frame]').forEach(button => {
    const preview = document.createElement('canvas');
    preview.width = 144; preview.height = 436;
    const previewContext = preview.getContext('2d');
    previewContext.scale(.2, .2);
    drawFrameTemplate(previewContext, frames[button.dataset.frame], frameAssets(frames[button.dataset.frame]));
    button.querySelector('i').replaceChildren(preview);
  });
  document.querySelectorAll('[data-showcase]').forEach(button => {
    const preview = document.createElement('canvas');
    preview.width = 216; preview.height = 654;
    const context = preview.getContext('2d'); context.scale(.3, .3);
    const design = frames[button.dataset.showcase];
    drawFrameTemplate(context, design, frameAssets(design));
    button.querySelector('i').replaceChildren(preview);
  });
}
document.querySelectorAll('[data-showcase]').forEach(button => button.addEventListener('click', () => {
  selectDesign(frames[button.dataset.showcase], button.textContent.trim());
}));
frameFontsReady.then(renderFramePreviews);

const importedGallery = $('#imported-frame-options');
if (importedGallery) {
  const categories=['Tất cả','Bộ Hộp Ảnh',...new Set(importedFrames.map(item=>item.category))];
  const selectImported=async item=>{
    const selection=++frameSelection;
    const image=new Image();
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=item.src;});
    if(selection!==frameSelection) return;
    importedFrame={...item,image};communityFrameImage=null;selectedFrameLabel=item.name;downloaded=false;
    document.querySelectorAll('[data-frame]').forEach(button=>button.setAttribute('aria-pressed','false'));
    document.querySelectorAll('[data-imported]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.imported===item.id)));
    tell(item.slots.length===4?'Đã chọn khung.':`Khung có ${item.slots.length} ô: dùng ảnh theo thứ tự; từ ô thứ 5 sẽ lặp lại ảnh đầu.`);
    updateUI();document.dispatchEvent(new Event('frame-selected'));
  };
  for(const item of importedFrames) {
    const button=document.createElement('button');button.type='button';button.className='frame-option';button.dataset.imported=item.id;button.dataset.category=item.category;button.setAttribute('aria-pressed','false');
    const image=document.createElement('img');image.src=item.thumb;image.loading='lazy';image.alt='';image.width=144;image.height=436;
    const title=document.createElement('span');title.textContent=item.name;
    const note=document.createElement('small');note.textContent=`${item.slots.length} ô ảnh`;
    button.append(image,title,note);button.addEventListener('click',()=>selectImported(item).catch(()=>tell('Chưa tải được khung. Hãy thử lại.',true)));importedGallery.append(button);
  }
  for(const category of categories) {
    const button=document.createElement('button');button.type='button';button.textContent=category;button.setAttribute('aria-pressed',String(category==='Tất cả'));
    button.addEventListener('click',()=>{
      document.querySelectorAll('#frame-categories button').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
      document.querySelectorAll('[data-imported]').forEach(item=>{item.hidden=category!=='Tất cả'&&item.dataset.category!==category;});
      $('#builtin-frame-options').hidden=!['Tất cả','Bộ Hộp Ảnh'].includes(category);
    });$('#frame-categories').append(button);
  }
}
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

function frameImageDataUrl(canvas) {
  let url = canvas.toDataURL('image/webp', .92);
  if (!/^data:image\/(webp|png|jpeg);base64,/.test(url) || url.length > 1350000) url = canvas.toDataURL('image/jpeg', .92);
  if (!/^data:image\/(webp|png|jpeg);base64,/.test(url) || url.length > 1350000) throw new Error('Chưa tạo được ảnh khung dưới 1 MB. Hãy giảm bớt chi tiết rồi thử lại.');
  return url;
}

async function jpegBlob(canvas) {
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .98));
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
    const exported = document.createElement('canvas');
    exported.width = 1440; exported.height = 4360;
    const output = exported.getContext('2d');
    output.scale(2, 2);
    output.imageSmoothingEnabled = true; output.imageSmoothingQuality = 'high';
    try {
      renderStrip(output, 2);
      downloadBlob(await jpegBlob(exported), `hop-anh-hung-${new Date().toLocaleDateString('sv-SE')}.jpg`);
    } finally { exported.width = exported.height = 1; }
    downloaded = true;
    tell('Đã tạo dải ảnh JPEG. Hãy xem tệp tải về của trình duyệt nhé!');
  } catch { tell('Chưa tải được JPEG. Kiểm tra trình duyệt và kết nối thư viện khung rồi thử lại.', true); }
  finally { updateUI(); }
});

function selectDesign(design, label, image = null, id = 'custom') {
  frameSelection++;
  importedFrame = null;
  if (document.body?.classList.contains('booth-landing')) {
    const next = new URL('shoot', window.location.href);
    next.searchParams.set('thietke', JSON.stringify(normalizeDesign(design)));
    window.location.assign(next.href);
    return;
  }
  activeDesign = normalizeDesign(design);
  selectedFrameLabel = label;
  communityFrameImage = image;
  frame = id;
  document.querySelectorAll('[data-frame]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.frame === id)));
  document.querySelectorAll('[data-imported]').forEach(button => button.setAttribute('aria-pressed','false'));
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
  } catch { $('#design-status').textContent = 'Chưa tải được khung JPEG. Hãy thử lại trên trình duyệt mới hơn.'; }
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
    const imageDataUrl = frameImageDataUrl(frameOnlyCanvas(design));
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
    $('#community-status').textContent = feedback.textContent;
    $('#frame-creator').close();
    $('#khung-cong-dong').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  } catch (error) {
    if (error.name !== 'AbortError') feedback.textContent = error instanceof TypeError ? 'Chưa kết nối được máy chủ nhận khung. Bạn vẫn có thể tải khung về để giữ riêng.' : error.message;
  } finally {
    submitting = false;
    $('#submit-frame').disabled = false;
    submissionRequest = null;
  }
});

for (const name of ['blue', 'yellow', 'purple', 'coral', 'heart', 'star', 'bow', 'cat', 'cherry', 'cloud', 'butterfly', 'smile']) {
  const image = new Image();
  image.onload = () => { stickers[name] = image; renderStrip(); renderDesignPreview(); frameFontsReady.then(renderFramePreviews); };
  image.src = ['blue', 'yellow', 'purple', 'coral'].includes(name) ? `assets/asterisk-${name}-face.svg` : `assets/${name}.svg`;
}
frameFontsReady.then(() => { renderStrip(); renderDesignPreview(); }).catch(() => tell('Chưa tải được phông chữ. Kiểm tra kết nối trước khi tải ảnh hoặc gửi khung.', true));
updateUI();
renderDesignPreview();
if (window.location?.search) {
  try {
    const shared = new URLSearchParams(window.location.search).get('thietke');
    if (shared && shared.length < 1500) {
      const design = normalizeDesign(JSON.parse(shared));
      selectDesign(design, design.title);
    }
  } catch { tell('Khung trong liên kết chưa hợp lệ. Bạn vẫn có thể chọn một khung khác.', true); }
}
loadCommunityFrames();
