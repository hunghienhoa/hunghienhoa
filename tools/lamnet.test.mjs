import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { SCALE, LIMITS, MAX_FILE, HALO, fitSize, tiles, toTensor, fromTensor, unsharp, outputName } from '../dist/lamnet/core.mjs';

test('thu nhỏ ảnh lớn về giới hạn, không phóng to ảnh nhỏ', () => {
  assert.deepEqual(fitSize(4000, 3000, LIMITS.gpu), { width: 1024, height: 768, scaled: true });
  assert.deepEqual(fitSize(4000, 3000, LIMITS.cpu), { width: 1024, height: 768, scaled: true });
  assert.deepEqual(fitSize(300, 200, LIMITS.gpu), { width: 300, height: 200, scaled: false });
  const square = fitSize(2000, 2000, LIMITS.cpu);
  assert.ok(square.width <= 1024 && square.width * square.height <= LIMITS.cpu.area && square.scaled);
  const tall = fitSize(4000, 10, LIMITS.cpu);
  assert.equal(tall.width, 1024);
  assert.ok(tall.height >= 1);
  // Kết quả x4 luôn nằm trong giới hạn canvas 4096px / 16,7 triệu điểm ảnh.
  for (const limit of [LIMITS.gpu, LIMITS.cpu]) for (const [w, h] of [[5000, 5000], [8000, 1200], [999, 1001]]) {
    const fit = fitSize(w, h, limit);
    assert.ok(Math.max(fit.width, fit.height) * SCALE <= 4096 && fit.width * fit.height * SCALE * SCALE <= 16777216);
  }
});

test('làm nét thêm: giữ vùng phẳng, tăng tương phản mép, xử lý theo dải cho kết quả như cả ảnh', () => {
  const width = 23, height = 37, rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) rgba.set([x < 11 ? 60 : 190, (x * 13 + y * 7) % 256, y < 18 ? 30 : 220, 200], (y * width + x) * 4);
  assert.deepEqual(unsharp(rgba, width, height, 0), rgba);
  const flat = new Uint8ClampedArray(9 * 9 * 4).fill(128);
  assert.deepEqual(unsharp(flat, 9, 9, 1.2), flat);
  const out = unsharp(rgba, width, height, 0.6);
  const at = (x, y, c) => out[(y * width + x) * 4 + c];
  assert.ok(at(10, 5, 0) < 60 && at(11, 5, 0) > 190, 'hai bên mép tối hơn/sáng hơn ảnh gốc');
  assert.equal(at(2, 5, 0), 60, 'xa mép thì giữ nguyên');
  assert.equal(at(4, 4, 3), 200, 'giữ kênh alpha');
  // Ghép các dải 8 hàng (kèm HALO hàng đệm) như app.js phải ra đúng kết quả xử lý cả ảnh một lần.
  const banded = new Uint8ClampedArray(out.length), band = 8;
  for (let y = 0; y < height; y += band) {
    const top = Math.max(0, y - HALO), rows = Math.min(height, y + band + HALO) - top;
    const part = unsharp(rgba.subarray(top * width * 4, (top + rows) * width * 4), width, rows, 0.6);
    banded.set(part.subarray((y - top) * width * 4, (y - top + Math.min(band, height - y)) * width * 4), y * width * 4);
  }
  assert.deepEqual(banded, out);
});

test('các ô phủ kín ảnh đúng một lần, viền nằm trong ảnh', () => {
  for (const [w, h, size] of [[300, 200, 128], [256, 256, 256], [1, 1, 128], [513, 130, 128]]) {
    const covered = new Uint8Array(w * h);
    for (const t of tiles(w, h, size, 12)) {
      assert.ok(t.x0 >= 0 && t.y0 >= 0 && t.x0 + t.tw <= w && t.y0 + t.th <= h);
      assert.ok(t.x0 <= t.x && t.y0 <= t.y && t.x + t.w <= t.x0 + t.tw && t.y + t.h <= t.y0 + t.th);
      for (let y = t.y; y < t.y + t.h; y++) for (let x = t.x; x < t.x + t.w; x++) covered[y * w + x]++;
    }
    assert.ok(covered.every(v => v === 1), `${w}x${h}`);
  }
});

test('đổi ảnh sang tensor và ngược lại giữ đúng vị trí, màu và bỏ viền', () => {
  const width = 5, height = 4, rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) rgba.set([i, 100 + i, 200 + i, 255], i * 4);
  const tile = tiles(width, height, 2, 1).find(t => t.x === 2 && t.y === 2);
  const tensor = toTensor(rgba, width, tile);
  const plane = tile.tw * tile.th;
  assert.equal(tensor.length, 3 * plane);
  assert.equal(Math.round(tensor[0] * 255), (tile.y0 * width + tile.x0));
  assert.equal(Math.round(tensor[plane] * 255), 100 + (tile.y0 * width + tile.x0));
  // Giả lập mô hình phóng to nearest x4 để kiểm tra phần cắt bỏ viền.
  const W = tile.tw * SCALE, H = tile.th * SCALE, up = new Float32Array(3 * W * H);
  for (let c = 0; c < 3; c++) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) up[c * W * H + y * W + x] = tensor[c * plane + Math.floor(y / SCALE) * tile.tw + Math.floor(x / SCALE)];
  const out = fromTensor(up, tile);
  assert.equal(out.length, tile.w * SCALE * tile.h * SCALE * 4);
  assert.deepEqual([...out.slice(0, 4)], [tile.y * width + tile.x, 100 + tile.y * width + tile.x, 200 + tile.y * width + tile.x, 255]);
  const clamped = fromTensor(new Float32Array(3 * W * H).fill(1.7), tile);
  assert.equal(clamped[0], 255);
  assert.equal(fromTensor(new Float32Array(3 * W * H).fill(-0.3), tile)[0], 0);
});

test('tên file tải về là JPEG, không dấu, không ký tự lạ', () => {
  assert.equal(outputName('Ảnh đẹp nhất.PNG'), 'Anh-dep-nhat-lam-net.jpg');
  assert.equal(outputName('../../x?.webp'), 'x-lam-net.jpg');
  assert.equal(outputName(''), 'anh-lam-net.jpg');
  assert.ok(MAX_FILE === 25 * 1024 * 1024);
});

test('trang Làm Nét: ảnh chỉ xử lý trên máy, xóa khi rời trang và sau một giờ', () => {
  const app = fs.readFileSync('dist/lamnet/app.js', 'utf8'), html = fs.readFileSync('dist/lamnet/index.html', 'utf8');
  assert.ok(!/\bfetch\([^)]*(?:blob|file|canvas)/i.test(app) && !/XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB/.test(app), 'Không gửi hoặc lưu ảnh');
  assert.ok(app.includes("addEventListener('pagehide'") && app.includes('HOUR'), 'Xóa ảnh khi rời trang và sau một giờ');
  assert.ok(app.includes("'image/jpeg'"), 'Tải về JPEG');
  assert.ok(!html.includes('google-adsense-account'), 'Không gắn mã quảng cáo vào trang xử lý ảnh');
  assert.equal(fs.readFileSync('dist/lamnet/models/realesr-general-x4v3.onnx').subarray(0, 2).length, 2);
  assert.ok(fs.statSync('dist/lamnet/vendor/ort-1.22.0/ort-wasm-simd-threaded.jsep.wasm').size < 25 * 1024 * 1024, 'Dưới giới hạn 25 MiB mỗi file của Cloudflare');
});
