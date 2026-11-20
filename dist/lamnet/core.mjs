// Phần tính toán của Làm Nét (không đụng DOM): giới hạn kích thước, chia ô và đổi ảnh <-> tensor của Real-ESRGAN x4.
export const SCALE = 4;
// WebGPU xử lý tới 1024px (kết quả 4096px, vừa giới hạn canvas của iPhone). CPU tới 1024×768 (~30 giây với 3 luồng):
// 512px làm ảnh điện thoại mất quá nhiều chi tiết. Ô 256px nhanh hơn ô 128px ~15% vì ít phần viền phải tính lại.
export const LIMITS = { gpu: { side: 1024, area: 1024 * 1024, tile: 256 }, cpu: { side: 1024, area: 1024 * 768, tile: 256 } };
export const PAD = 12;
export const MAX_FILE = 25 * 1024 * 1024;

// Thu nhỏ (không bao giờ phóng to) để cạnh dài và diện tích nằm trong giới hạn.
export function fitSize(width, height, limit) {
  const ratio = Math.min(1, limit.side / Math.max(width, height), Math.sqrt(limit.area / (width * height)));
  return { width: Math.max(1, Math.floor(width * ratio)), height: Math.max(1, Math.floor(height * ratio)), scaled: ratio < 1 };
}

// Chia ảnh thành các ô size x size; mỗi ô kèm viền pad lấy từ ảnh xung quanh để mép ô không lộ đường nối.
export function tiles(width, height, size, pad = PAD) {
  const list = [];
  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      const w = Math.min(size, width - x), h = Math.min(size, height - y);
      const x0 = Math.max(0, x - pad), y0 = Math.max(0, y - pad);
      list.push({ x, y, w, h, x0, y0, tw: Math.min(width, x + w + pad) - x0, th: Math.min(height, y + h + pad) - y0 });
    }
  }
  return list;
}

// RGBA (cả ảnh) -> Float32 CHW 0..1 của một ô kèm viền.
export function toTensor(rgba, width, tile) {
  const { x0, y0, tw, th } = tile, plane = tw * th, out = new Float32Array(3 * plane);
  for (let j = 0; j < th; j++) {
    for (let i = 0; i < tw; i++) {
      const s = ((y0 + j) * width + x0 + i) * 4, d = j * tw + i;
      out[d] = rgba[s] / 255;
      out[plane + d] = rgba[s + 1] / 255;
      out[2 * plane + d] = rgba[s + 2] / 255;
    }
  }
  return out;
}

// Kết quả CHW (đã x4) -> RGBA của phần lõi ô, bỏ viền; Uint8ClampedArray tự kẹp 0..255.
export function fromTensor(data, tile, target = new Uint8ClampedArray(tile.w * SCALE * tile.h * SCALE * 4)) {
  const width = tile.tw * SCALE, plane = width * tile.th * SCALE;
  const ox = (tile.x - tile.x0) * SCALE, oy = (tile.y - tile.y0) * SCALE, w = tile.w * SCALE, h = tile.h * SCALE;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const s = (oy + j) * width + ox + i, d = (j * w + i) * 4;
      target[d] = data[s] * 255;
      target[d + 1] = data[plane + s] * 255;
      target[d + 2] = data[2 * plane + s] * 255;
      target[d + 3] = 255;
    }
  }
  return target;
}

// Làm nét thêm sau AI (unsharp mask): out = ảnh + amount × (ảnh − ảnh_mờ). Ảnh mờ dùng lọc tam giác 9 điểm
// (= hai lần lọc hộp 5 điểm, độ lệch chuẩn 2px) theo hai chiều, mép ảnh lặp điểm biên. Mỗi điểm chỉ phụ thuộc
// HALO hàng trên/dưới, nên có thể xử lý từng dải hàng (kèm HALO hàng đệm) để không phải giữ cả ảnh lớn trong bộ nhớ.
export const HALO = 4;
const WEIGHTS = [1, 2, 3, 4, 5, 4, 3, 2, 1].map(w => w / 25);
export function unsharp(rgba, width, height, amount) {
  const out = new Uint8ClampedArray(rgba.length);
  if (!amount) { out.set(rgba); return out; }
  const row = new Float32Array(width * 3 * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0;
      for (let k = -HALO; k <= HALO; k++) {
        const s = (y * width + Math.min(width - 1, Math.max(0, x + k))) * 4, w = WEIGHTS[k + HALO];
        r += rgba[s] * w; g += rgba[s + 1] * w; b += rgba[s + 2] * w;
      }
      const d = (y * width + x) * 3;
      row[d] = r; row[d + 1] = g; row[d + 2] = b;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0;
      for (let k = -HALO; k <= HALO; k++) {
        const s = (Math.min(height - 1, Math.max(0, y + k)) * width + x) * 3, w = WEIGHTS[k + HALO];
        r += row[s] * w; g += row[s + 1] * w; b += row[s + 2] * w;
      }
      const i = (y * width + x) * 4;
      out[i] = rgba[i] + amount * (rgba[i] - r);
      out[i + 1] = rgba[i + 1] + amount * (rgba[i + 1] - g);
      out[i + 2] = rgba[i + 2] + amount * (rgba[i + 2] - b);
      out[i + 3] = rgba[i + 3];
    }
  }
  return out;
}

// Tên file tải về: giữ tên gốc (bỏ dấu và ký tự lạ), đuôi .jpg.
export function outputName(name) {
  const base = String(name || 'anh').replace(/\.[^.]*$/, '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'anh';
  return `${base}-lam-net.jpg`;
}
