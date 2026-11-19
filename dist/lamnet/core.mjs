// Phần tính toán của Làm Nét (không đụng DOM): giới hạn kích thước, chia ô và đổi ảnh <-> tensor của Real-ESRGAN x4.
export const SCALE = 4;
// WebGPU xử lý tới 1024px (kết quả 4096px, vừa giới hạn canvas của iPhone); CPU chậm hơn nhiều nên giữ 512px.
export const LIMITS = { gpu: { side: 1024, area: 1024 * 1024, tile: 256 }, cpu: { side: 512, area: 512 * 512, tile: 128 } };
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

// Tên file tải về: giữ tên gốc (bỏ dấu và ký tự lạ), đuôi .jpg.
export function outputName(name) {
  const base = String(name || 'anh').replace(/\.[^.]*$/, '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'anh';
  return `${base}-lam-net.jpg`;
}
