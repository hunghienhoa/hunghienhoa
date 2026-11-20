// Làm Nét: Real-ESRGAN x4 chạy trong trình duyệt bằng ONNX Runtime Web (WebGPU, hoặc WebAssembly trong luồng phụ),
// hoặc Gemini qua /api/lamnet/ai khi người dùng chọn và đồng ý gửi ảnh.
// Ảnh chỉ nằm trong bộ nhớ trang: không lưu vào trình duyệt; xóa khi rời trang hoặc sau một giờ.
import { SCALE, LIMITS, MAX_FILE, HALO, fitSize, tiles, toTensor, fromTensor, unsharp, outputName } from './core.mjs?v=2';

const $ = selector => document.querySelector(selector);
const ORT_DIR = new URL('vendor/ort-1.22.0/', import.meta.url);
const MODEL_URL = new URL('models/realesr-general-x4v3.onnx?v=2', import.meta.url); // tệp cache vĩnh viễn: đổi mô hình thì tăng v
const SIZES = { wasm: 21872216, model: 4860375 }; // byte sau giải nén, để tính tiến độ khi máy chủ không gửi Content-Length
const HOUR = 3600000;
const BAND = 256; // số hàng mỗi lượt làm nét thêm, để không phải đọc cả ảnh 4096px vào bộ nhớ một lúc
const AI_URL = '/api/lamnet/ai';
const CLOUD = { side: 2048, area: 2048 * 2048 }; // ảnh gửi Gemini: đủ chi tiết mà dưới 3 MB
const NAMES = { gemini: 'Gemini' }, ORG = { gemini: 'Google' };
const ui = {
  picker: $('#picker'), input: $('#file'), drop: $('#dropzone'), working: $('#working'), result: $('#result'),
  bar: $('#progress-bar'), progress: $('#progress'), step: $('#step'), status: $('#status'), cancel: $('#cancel'),
  compare: $('#compare'), slider: $('#slider'), info: $('#result-info'), download: $('#download'), again: $('#again'),
  sharpness: $('#sharpness'), task: $('#task'), engines: $('#engines'), cloudNote: $('#cloud-note'), consentRow: $('#consent-row'),
  consent: $('#consent'), consentOrg: $('#consent-org'), quota: $('#quota'), enhancePanel: $('#enhance-panel'),
  generatePanel: $('#generate-panel'), prompt: $('#prompt'), generate: $('#generate')
};
// before: ảnh gốc đã thu; upscaled: kết quả AI chưa làm nét thêm (không gắn vào trang); after: ảnh hiển thị và tải về.
let ai, cloud, run = 0, pass = 0, before, upscaled, after, downloadName = '', expireTimer;

const userError = message => Object.assign(new Error(message), { user: true });
const checked = group => group.querySelector('input:checked')?.value;
function say(message, error = false) { ui.status.textContent = message; ui.status.dataset.error = String(error); }
function show(state) { for (const name of ['picker', 'working', 'result']) ui[name].hidden = name !== state; }
function setProgress(fraction, text) {
  const percent = Math.max(0, Math.min(100, Math.round(fraction * 100)));
  ui.bar.style.width = percent + '%';
  ui.progress.setAttribute('aria-valuenow', String(percent));
  if (text) ui.step.textContent = text;
}
// Gemini không báo tiến độ: thanh chạy chậm dần tới 92% trong lúc chờ.
function crawl(token, text) {
  let fraction = 0.12;
  setProgress(fraction, text);
  const timer = setInterval(() => { if (token !== run) return clearInterval(timer); fraction += (0.92 - fraction) * 0.04; setProgress(fraction); }, 500);
  return () => clearInterval(timer);
}

// Xóa mọi ảnh khỏi bộ nhớ: canvas về 0x0, bỏ tham chiếu, hủy hẹn giờ.
function clearImages() {
  run++;
  for (const canvas of [before, upscaled, after]) if (canvas) { canvas.width = 0; canvas.height = 0; canvas.remove(); }
  before = upscaled = after = undefined;
  downloadName = '';
  ui.input.value = '';
  clearTimeout(expireTimer);
}

async function fetchBytes(url, expected, onBytes) {
  const response = await fetch(url);
  if (!response.ok || !response.body) throw userError('Không tải được tệp AI (' + response.status + ').');
  const total = Number(response.headers.get('content-length')) || expected, reader = response.body.getReader(), chunks = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    onBytes(Math.min(loaded, total));
  }
  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

// Nạp bộ chạy và mô hình một lần; WebGPU nếu máy có, không thì WebAssembly trong luồng phụ để trang không bị đơ.
async function loadAI(token) {
  if (ai) return ai;
  const adapter = await navigator.gpu?.requestAdapter?.().catch(() => null);
  // GPU giả lập bằng phần mềm (SwiftShader...) chậm hơn WebAssembly nhiều luồng nên không dùng.
  const provider = adapter && !(adapter.info?.isFallbackAdapter || adapter.isFallbackAdapter) ? 'webgpu' : 'wasm';
  const ort = await import(new URL('ort.webgpu.min.mjs', ORT_DIR).href);
  const loaded = { wasm: 0, model: 0 }, total = SIZES.wasm + SIZES.model;
  const report = () => setProgress((loaded.wasm + loaded.model) / total, `Đang tải AI lần đầu: ${((loaded.wasm + loaded.model) / 1048576).toFixed(1)} / ${(total / 1048576).toFixed(0)} MB`);
  const [wasm, model] = await Promise.all([
    fetchBytes(new URL('ort-wasm-simd-threaded.jsep.wasm', ORT_DIR), SIZES.wasm, n => { loaded.wasm = n; report(); }),
    fetchBytes(MODEL_URL, SIZES.model, n => { loaded.model = n; report(); })
  ]);
  if (token !== run) throw new Error('cancelled');
  ort.env.logLevel = 'error';
  ort.env.wasm.wasmPaths = ORT_DIR.href;
  ort.env.wasm.wasmBinary = wasm;
  ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1)) : 1;
  ort.env.wasm.proxy = provider === 'wasm';
  setProgress(1, 'Đang khởi động AI…');
  const session = await ort.InferenceSession.create(model, { executionProviders: [provider], graphOptimizationLevel: 'all' });
  ai = { ort, session, provider, limit: LIMITS[provider === 'webgpu' ? 'gpu' : 'cpu'] };
  return ai;
}

async function decode(file) {
  try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch {
    const url = URL.createObjectURL(file);
    try { const image = new Image(); image.src = url; await image.decode(); return image; }
    finally { URL.revokeObjectURL(url); }
  }
}

// Số lượt Gemini còn lại hôm nay và Gemini đã bật chưa; chỉ hỏi khi người dùng chọn AI đám mây.
async function refreshQuota(force = false) {
  try {
    if (force || !cloud) cloud = await (await fetch(AI_URL)).json();
    for (const name of Object.keys(NAMES)) ui.engines.querySelector(`input[value=${name}]`).disabled = !cloud.providers?.[name];
    const name = checked(ui.engines);
    ui.quota.textContent = !cloud.providers?.[name] ? `${NAMES[name]} chưa được bật trên website này.`
      : cloud.remaining > 0 ? `Còn ${cloud.remaining} lượt Gemini hôm nay.` : 'Hôm nay bạn đã dùng hết lượt Gemini. Làm nét trên máy vẫn dùng được.';
  } catch { ui.quota.textContent = 'Chưa kiểm tra được số lượt còn lại.'; }
}

function syncChoices() {
  const generating = checked(ui.task) === 'generate', local = ui.engines.querySelector('input[value=local]');
  local.closest('label').hidden = generating;
  if (generating && local.checked) ui.engines.querySelector('input[value=gemini]').checked = true;
  const name = checked(ui.engines), remote = name !== 'local';
  ui.enhancePanel.hidden = generating;
  ui.generatePanel.hidden = !generating;
  ui.cloudNote.hidden = !remote;
  ui.consentRow.hidden = generating;
  if (remote) { ui.consentOrg.textContent = ORG[name]; refreshQuota(); }
}

async function askCloud(body) {
  let response;
  try { response = await fetch(AI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
  catch { throw userError('Không kết nối được tới máy chủ. Hãy kiểm tra mạng rồi thử lại.'); }
  if (!response.ok) throw userError((await response.json().catch(() => null))?.error || 'Không kết nối được AI. Hãy thử lại sau.');
  const remaining = Number(response.headers.get('x-lamnet-remaining'));
  if (cloud && Number.isFinite(remaining)) cloud.remaining = remaining;
  return response.blob();
}

async function jpegData(canvas) {
  for (const quality of [0.9, 0.8, 0.7]) {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (blob && blob.size <= 3 * 1024 * 1024) return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); });
  }
  throw userError('Ảnh quá lớn để gửi. Hãy chọn ảnh nhỏ hơn.');
}

async function canvasFrom(blob) {
  let bitmap;
  try { bitmap = await createImageBitmap(blob); } catch { throw userError('AI trả về ảnh không đọc được. Hãy thử lại.'); }
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width; canvas.height = bitmap.height;
  canvas.getContext('2d', { willReadFrequently: true }).drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas;
}

function failed(token, error) {
  if (token !== run || error?.message === 'cancelled') return;
  clearImages();
  show('picker');
  say(error?.user ? error.message : 'Máy này chưa chạy được AI làm nét. Hãy thử trình duyệt Chrome, Edge hoặc Safari bản mới.', true);
  if (!error?.user) console.error(error);
  if (/lượt/.test(error?.message || '')) refreshQuota(true);
}

async function enhance(file) {
  if (!file) return;
  if (!/^image\//.test(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) return say('Hãy chọn một tấm ảnh JPG, PNG hoặc WebP.', true);
  if (file.size > MAX_FILE) return say('Ảnh lớn hơn 25 MB. Hãy chọn ảnh nhỏ hơn.', true);
  const provider = checked(ui.engines);
  if (provider !== 'local' && !ui.consent.checked) { ui.input.value = ''; ui.consent.focus(); return say(`Hãy tích ô đồng ý gửi ảnh tới ${ORG[provider]} trước khi chọn ảnh.`, true); }
  clearImages();
  const token = run;
  downloadName = outputName(file.name);
  show('working');
  say('');
  setProgress(0, provider === 'local' ? 'Đang chuẩn bị AI…' : 'Đang đọc ảnh…');
  // Canvas nằm trong biến cục bộ tới khi xong; lượt bị hủy hoặc lỗi thì finally xóa, không để ảnh sót lại hay đè lượt mới.
  let image, original, sharp, stop;
  try {
    const engine = provider === 'local' ? await loadAI(token) : null;
    try { image = await decode(file); } catch { throw userError('Không đọc được ảnh này. Hãy thử JPG, PNG hoặc WebP.'); }
    if (token !== run) return;
    const source = { width: image.naturalWidth || image.width, height: image.naturalHeight || image.height };
    const fit = fitSize(source.width, source.height, engine ? engine.limit : CLOUD);
    original = document.createElement('canvas');
    original.width = fit.width; original.height = fit.height;
    const bctx = original.getContext('2d', { willReadFrequently: true });
    bctx.fillStyle = '#fff';
    bctx.fillRect(0, 0, fit.width, fit.height);
    bctx.imageSmoothingQuality = 'high';
    bctx.drawImage(image, 0, 0, fit.width, fit.height);
    image.close?.(); image = undefined; // ảnh giải mã đủ độ phân giải có thể hàng trăm MB: nhả ngay, không giữ suốt lúc AI chạy
    if (engine) {
      const rgba = bctx.getImageData(0, 0, fit.width, fit.height).data;
      sharp = document.createElement('canvas');
      sharp.width = fit.width * SCALE; sharp.height = fit.height * SCALE;
      const actx = sharp.getContext('2d', { willReadFrequently: true });
      const list = tiles(fit.width, fit.height, engine.limit.tile);
      for (let i = 0; i < list.length; i++) {
        if (token !== run) return;
        const tile = list[i];
        setProgress(i / list.length, `Đang làm nét: ${Math.round((i / list.length) * 100)}% (phần ${i + 1}/${list.length})`);
        await new Promise(requestAnimationFrame);
        const input = new engine.ort.Tensor('float32', toTensor(rgba, fit.width, tile), [1, 3, tile.th, tile.tw]);
        const output = (await engine.session.run({ input })).output;
        if (token !== run) return;
        const pixels = fromTensor(await output.getData(), tile);
        actx.putImageData(new ImageData(pixels, tile.w * SCALE, tile.h * SCALE), tile.x * SCALE, tile.y * SCALE);
        output.dispose?.();
      }
    } else {
      const data = await jpegData(original);
      if (token !== run) return;
      stop = crawl(token, `${NAMES[provider]} đang làm nét… thường mất 10–60 giây`);
      const blob = await askCloud({ provider, mode: 'enhance', consent: true, image: data });
      if (token !== run) return;
      sharp = await canvasFrom(blob);
      ui.sharpness.querySelector('input[value="0"]').checked = true; // ảnh của Gemini đã nét, không làm nét thêm mặc định
    }
    setProgress(1, 'Đang làm rõ chi tiết…');
    const shown = document.createElement('canvas');
    shown.width = sharp.width; shown.height = sharp.height;
    before = original; upscaled = sharp; after = shown; original = sharp = undefined;
    await applySharpness();
    if (token !== run) return;
    const resized = fit.scaled ? `Ảnh gốc ${source.width}×${source.height} được thu về ${fit.width}×${fit.height} trước khi làm nét. ` : '';
    showResult(`${resized}Kết quả ${after.width}×${after.height} điểm ảnh${engine ? '' : `, làm nét bởi ${NAMES[provider]}`}.`);
  } catch (error) {
    failed(token, error);
  } finally {
    stop?.();
    image?.close?.();
    for (const canvas of [original, sharp]) if (canvas) { canvas.width = 0; canvas.height = 0; }
  }
}

async function generate() {
  const provider = checked(ui.engines), prompt = ui.prompt.value.trim();
  if (!NAMES[provider]) return;
  if (!prompt) { ui.prompt.focus(); return say('Hãy mô tả ảnh muốn tạo.', true); }
  clearImages();
  const token = run;
  downloadName = 'anh-ai-gemini.jpg';
  show('working');
  say('');
  let sharp, stop;
  try {
    stop = crawl(token, `${NAMES[provider]} đang tạo ảnh… thường mất 10–60 giây`);
    const blob = await askCloud({ provider, mode: 'generate', prompt });
    if (token !== run) return;
    sharp = await canvasFrom(blob);
    ui.sharpness.querySelector('input[value="0"]').checked = true;
    const shown = document.createElement('canvas');
    shown.width = sharp.width; shown.height = sharp.height;
    upscaled = sharp; after = shown; sharp = undefined;
    await applySharpness();
    if (token !== run) return;
    showResult(`Ảnh ${after.width}×${after.height} điểm ảnh, tạo bởi ${NAMES[provider]}.`, true);
  } catch (error) {
    failed(token, error);
  } finally {
    stop?.();
    if (sharp) { sharp.width = 0; sharp.height = 0; }
  }
}

// Chép kết quả AI sang ảnh hiển thị với độ nét đang chọn, từng dải BAND hàng (kèm HALO hàng đệm để mép dải không lộ).
// Đổi độ nét giữa chừng thì lượt cũ dừng; nút tải về khóa tới khi xong để không tải ảnh dở.
async function applySharpness() {
  const token = run, mine = ++pass, amount = Number(checked(ui.sharpness)) || 0;
  const { width, height } = upscaled, source = upscaled.getContext('2d', { willReadFrequently: true }), target = after.getContext('2d');
  ui.download.disabled = true;
  for (let y = 0; y < height; y += BAND) {
    const top = Math.max(0, y - HALO), rows = Math.min(height, y + BAND + HALO) - top;
    const pixels = unsharp(source.getImageData(0, top, width, rows).data, width, rows, amount);
    target.putImageData(new ImageData(pixels, width, rows), 0, top, 0, y - top, width, Math.min(BAND, height - y));
    await new Promise(resolve => setTimeout(resolve));
    if (token !== run || mine !== pass) return;
  }
  ui.download.disabled = false;
}

function showResult(text, single = false) {
  for (const [canvas, label, name] of [[after, single ? 'Ảnh do AI tạo' : 'Ảnh sau khi làm nét', 'after'], [before, 'Ảnh gốc', 'before']]) {
    if (!canvas) continue;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', label);
    canvas.className = name;
  }
  ui.compare.classList.toggle('single', single);
  ui.compare.style.aspectRatio = `${after.width} / ${after.height}`;
  ui.compare.prepend(...[after, before].filter(Boolean));
  ui.slider.value = '50';
  ui.compare.style.setProperty('--pos', '50%');
  ui.info.textContent = text;
  show('result');
  say(single ? 'Đã tạo ảnh xong.' : 'Đã làm nét xong. Kéo thanh giữa ảnh để so sánh, hoặc chọn độ nét khác.');
  ui.download.focus();
  clearTimeout(expireTimer);
  expireTimer = setTimeout(() => { clearImages(); show('picker'); say('Đã quá một giờ nên ảnh được xóa khỏi trang. Bạn có thể chọn lại ảnh.'); }, HOUR);
}

ui.input.addEventListener('change', () => enhance(ui.input.files?.[0]));
for (const type of ['dragenter', 'dragover']) ui.drop.addEventListener(type, event => { event.preventDefault(); ui.drop.classList.add('dragging'); });
for (const type of ['dragleave', 'drop']) ui.drop.addEventListener(type, () => ui.drop.classList.remove('dragging'));
ui.drop.addEventListener('drop', event => { event.preventDefault(); enhance(event.dataTransfer?.files?.[0]); });
ui.task.addEventListener('change', syncChoices);
ui.engines.addEventListener('change', syncChoices);
ui.generate.addEventListener('click', generate);
ui.cancel.addEventListener('click', () => { clearImages(); show('picker'); say('Đã dừng. Bạn có thể chọn ảnh khác.'); });
ui.again.addEventListener('click', () => { clearImages(); show('picker'); say(''); });
ui.slider.addEventListener('input', () => ui.compare.style.setProperty('--pos', ui.slider.value + '%'));
ui.sharpness.addEventListener('change', () => { if (upscaled && after) applySharpness(); });
ui.download.addEventListener('click', () => {
  if (!after) return;
  after.toBlob(blob => {
    if (!blob) return say('Không tạo được file JPEG. Hãy thử lại.', true);
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = downloadName || 'anh-lam-net.jpg';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/jpeg', 0.92);
});
addEventListener('pagehide', clearImages);
syncChoices();
