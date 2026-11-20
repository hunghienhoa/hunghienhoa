// Làm Nét: Real-ESRGAN x4 chạy trong trình duyệt bằng ONNX Runtime Web (WebGPU, hoặc WebAssembly trong luồng phụ).
// Ảnh chỉ nằm trong bộ nhớ trang: không gửi đi, không lưu vào trình duyệt; xóa khi rời trang hoặc sau một giờ.
import { SCALE, LIMITS, MAX_FILE, HALO, fitSize, tiles, toTensor, fromTensor, unsharp, outputName } from './core.mjs?v=2';

const $ = selector => document.querySelector(selector);
const ORT_DIR = new URL('vendor/ort-1.22.0/', import.meta.url);
const MODEL_URL = new URL('models/realesr-general-x4v3.onnx?v=2', import.meta.url); // tệp cache vĩnh viễn: đổi mô hình thì tăng v
const SIZES = { wasm: 21872216, model: 4860375 }; // byte sau giải nén, để tính tiến độ khi máy chủ không gửi Content-Length
const HOUR = 3600000;
const BAND = 256; // số hàng mỗi lượt làm nét thêm, để không phải đọc cả ảnh 4096px vào bộ nhớ một lúc
const ui = {
  picker: $('#picker'), input: $('#file'), drop: $('#dropzone'), working: $('#working'), result: $('#result'),
  bar: $('#progress-bar'), progress: $('#progress'), step: $('#step'), status: $('#status'), cancel: $('#cancel'),
  compare: $('#compare'), slider: $('#slider'), info: $('#result-info'), download: $('#download'), again: $('#again'),
  sharpness: $('#sharpness')
};
// before: ảnh gốc đã thu; upscaled: kết quả AI chưa làm nét thêm (không gắn vào trang); after: ảnh hiển thị và tải về.
let ai, run = 0, pass = 0, before, upscaled, after, fileName = '', expireTimer;

function say(message, error = false) { ui.status.textContent = message; ui.status.dataset.error = String(error); }
function show(state) { for (const name of ['picker', 'working', 'result']) ui[name].hidden = name !== state; }
function setProgress(fraction, text) {
  const percent = Math.max(0, Math.min(100, Math.round(fraction * 100)));
  ui.bar.style.width = percent + '%';
  ui.progress.setAttribute('aria-valuenow', String(percent));
  if (text) ui.step.textContent = text;
}

// Xóa mọi ảnh khỏi bộ nhớ: canvas về 0x0, bỏ tham chiếu, hủy hẹn giờ.
function clearImages() {
  run++;
  for (const canvas of [before, upscaled, after]) if (canvas) { canvas.width = 0; canvas.height = 0; canvas.remove(); }
  before = upscaled = after = undefined;
  fileName = '';
  ui.input.value = '';
  clearTimeout(expireTimer);
}

async function fetchBytes(url, expected, onBytes) {
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error('Không tải được tệp AI (' + response.status + ').');
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

async function enhance(file) {
  if (!file) return;
  if (!/^image\//.test(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) return say('Hãy chọn một tấm ảnh JPG, PNG hoặc WebP.', true);
  if (file.size > MAX_FILE) return say('Ảnh lớn hơn 25 MB. Hãy chọn ảnh nhỏ hơn.', true);
  clearImages();
  const token = run;
  fileName = file.name;
  show('working');
  say('');
  setProgress(0, 'Đang chuẩn bị AI…');
  // Canvas nằm trong biến cục bộ tới khi xong; lượt bị hủy hoặc lỗi thì finally xóa, không để ảnh sót lại hay đè lượt mới.
  let image, original, sharp;
  try {
    const engine = await loadAI(token);
    try { image = await decode(file); } catch { throw new Error('Không đọc được ảnh này. Hãy thử JPG, PNG hoặc WebP.'); }
    if (token !== run) return;
    const source = { width: image.naturalWidth || image.width, height: image.naturalHeight || image.height };
    const fit = fitSize(source.width, source.height, engine.limit);
    original = document.createElement('canvas');
    original.width = fit.width; original.height = fit.height;
    const bctx = original.getContext('2d', { willReadFrequently: true });
    bctx.fillStyle = '#fff';
    bctx.fillRect(0, 0, fit.width, fit.height);
    bctx.imageSmoothingQuality = 'high';
    bctx.drawImage(image, 0, 0, fit.width, fit.height);
    image.close?.(); image = undefined; // ảnh giải mã đủ độ phân giải có thể hàng trăm MB: nhả ngay, không giữ suốt lúc AI chạy
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
    setProgress(1, 'Đang làm rõ chi tiết…');
    const shown = document.createElement('canvas');
    shown.width = sharp.width; shown.height = sharp.height;
    before = original; upscaled = sharp; after = shown; original = sharp = undefined;
    await applySharpness();
    if (token !== run) return;
    showResult(source, fit, engine.provider);
  } catch (error) {
    if (token !== run || error?.message === 'cancelled') return;
    clearImages();
    show('picker');
    say(error?.message?.startsWith('Không') || error?.message?.startsWith('Hãy') ? error.message : 'Máy này chưa chạy được AI làm nét. Hãy thử trình duyệt Chrome, Edge hoặc Safari bản mới.', true);
    console.error(error);
  } finally {
    image?.close?.();
    for (const canvas of [original, sharp]) if (canvas) { canvas.width = 0; canvas.height = 0; }
  }
}

// Chép kết quả AI sang ảnh hiển thị với độ nét đang chọn, từng dải BAND hàng (kèm HALO hàng đệm để mép dải không lộ).
// Đổi độ nét giữa chừng thì lượt cũ dừng; nút tải về khóa tới khi xong để không tải ảnh dở.
async function applySharpness() {
  const token = run, mine = ++pass, amount = Number(ui.sharpness.querySelector('input:checked')?.value) || 0;
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

function showResult(source, fit, provider) {
  for (const [canvas, label] of [[after, 'Ảnh sau khi làm nét'], [before, 'Ảnh gốc']]) {
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', label);
  }
  before.className = 'before';
  after.className = 'after';
  ui.compare.style.aspectRatio = `${fit.width} / ${fit.height}`;
  ui.compare.prepend(after, before);
  ui.slider.value = '50';
  ui.compare.style.setProperty('--pos', '50%');
  const resized = fit.scaled ? `Ảnh gốc ${source.width}×${source.height} được thu về ${fit.width}×${fit.height} trước khi làm nét. ` : '';
  ui.info.textContent = `${resized}Kết quả ${after.width}×${after.height} điểm ảnh${provider === 'webgpu' ? '' : ' (máy chưa hỗ trợ WebGPU nên AI chạy bằng CPU)'}.`;
  show('result');
  say('Đã làm nét xong. Kéo thanh giữa ảnh để so sánh, hoặc chọn độ nét khác.');
  ui.download.focus();
  clearTimeout(expireTimer);
  expireTimer = setTimeout(() => { clearImages(); show('picker'); say('Đã quá một giờ nên ảnh được xóa khỏi trang. Bạn có thể chọn lại ảnh.'); }, HOUR);
}

ui.input.addEventListener('change', () => enhance(ui.input.files?.[0]));
for (const type of ['dragenter', 'dragover']) ui.drop.addEventListener(type, event => { event.preventDefault(); ui.drop.classList.add('dragging'); });
for (const type of ['dragleave', 'drop']) ui.drop.addEventListener(type, () => ui.drop.classList.remove('dragging'));
ui.drop.addEventListener('drop', event => { event.preventDefault(); enhance(event.dataTransfer?.files?.[0]); });
ui.cancel.addEventListener('click', () => { clearImages(); show('picker'); say('Đã dừng. Bạn có thể chọn ảnh khác.'); ui.input.focus(); });
ui.again.addEventListener('click', () => { clearImages(); show('picker'); say(''); ui.input.focus(); });
ui.slider.addEventListener('input', () => ui.compare.style.setProperty('--pos', ui.slider.value + '%'));
ui.sharpness.addEventListener('change', () => { if (upscaled && after) applySharpness(); });
ui.download.addEventListener('click', () => {
  if (!after) return;
  after.toBlob(blob => {
    if (!blob) return say('Không tạo được file JPEG. Hãy thử lại.', true);
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = outputName(fileName);
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/jpeg', 0.92);
});
addEventListener('pagehide', clearImages);
