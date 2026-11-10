export function coverCrop(sourceWidth, sourceHeight, targetWidth, targetHeight) {
  if (![sourceWidth, sourceHeight, targetWidth, targetHeight].every(value => Number.isFinite(value) && value > 0)) {
    throw new RangeError('Kích thước ảnh phải là số hữu hạn lớn hơn 0.');
  }
  const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const sw = targetWidth / scale;
  const sh = targetHeight / scale;
  return { sx: (sourceWidth - sw) / 2, sy: (sourceHeight - sh) / 2, sw, sh };
}

export function applyFilterPixels(pixels, filter) {
  const recipes = { original: [0, 1, 1, 1], mono: [0, 0, 1.08, 1], warm: [.24, 1.2, 1.04, 1], nostalgia: [.4, .72, .94, 1.05], clear:[0,1.04,.96,1.08], peach:[.08,1.06,.94,1.06], soft:[0,.98,.9,1.06] };
  if (typeof filter !== 'string' || !Object.hasOwn(recipes, filter)) throw new RangeError('Bộ lọc ảnh không hợp lệ.');
  if (!pixels || !Number.isSafeInteger(pixels.length) || pixels.length < 0 || pixels.length % 4 !== 0) {
    throw new TypeError('Dữ liệu ảnh phải gồm các nhóm RGBA.');
  }
  for (let i = 0; i < pixels.length; i++) {
    if (!Number.isInteger(pixels[i]) || pixels[i] < 0 || pixels[i] > 255) throw new RangeError('Kênh RGBA phải là số nguyên từ 0 đến 255.');
  }
  const output = Uint8ClampedArray.from(pixels);
  if (filter === 'original') return output;
  const [sepia, saturation, contrast, brightness] = recipes[filter];
  const clamp = value => Math.max(0, Math.min(255, value));
  for (let i = 0; i < output.length; i += 4) {
    let [r, g, b] = [output[i], output[i + 1], output[i + 2]];
    if (filter === 'mono') {
      r = g = b = .2126 * r + .7152 * g + .0722 * b;
    } else {
      [r, g, b] = [
        clamp((1 - .607 * sepia) * r + .769 * sepia * g + .189 * sepia * b),
        clamp(.349 * sepia * r + (1 - .314 * sepia) * g + .168 * sepia * b),
        clamp(.272 * sepia * r + .534 * sepia * g + (1 - .869 * sepia) * b)
      ];
      const luma = .213 * r + .715 * g + .072 * b;
      [r, g, b] = [r, g, b].map(value => clamp(luma + saturation * (value - luma)));
    }
    output[i] = clamp(((r - 127.5) * contrast + 127.5) * brightness);
    output[i + 1] = clamp(((g - 127.5) * contrast + 127.5) * brightness);
    output[i + 2] = clamp(((b - 127.5) * contrast + 127.5) * brightness);
    if(filter==='peach'){output[i]=clamp(output[i]+5);output[i+2]=clamp(output[i+2]+2);}
  }
  return output;
}
