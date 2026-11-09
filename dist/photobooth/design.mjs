export const PHOTO_SESSION_MS = 60 * 60 * 1000;
export const DEFAULT_DESIGN = Object.freeze({
  background: '#fbf2e3', ink: '#303487', accent: '#ffdc38',
  title: 'HỘP ẢNH · MỘT CHÚT HÔM NAY', footer: 'Giữ lại một chút vui.', pattern: 'plain', sticker: 'flower'
});

export function normalizeDesign(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Thiết kế khung không hợp lệ.');
  const keys = Object.keys(DEFAULT_DESIGN);
  if (Object.keys(input).some(key => !keys.includes(key))) throw new TypeError('Khung có thông tin không được hỗ trợ.');
  const design = { ...DEFAULT_DESIGN, ...input };
  for (const key of ['background', 'ink', 'accent']) {
    if (typeof design[key] !== 'string' || !/^#[a-f\d]{6}$/i.test(design[key])) throw new TypeError('Màu khung cần đúng định dạng sáu ký tự.');
    design[key] = design[key].toLowerCase();
  }
  for (const key of ['title', 'footer']) {
    if (typeof design[key] !== 'string' || design[key].trim().length > 60) throw new TypeError('Chữ trên khung tối đa 60 ký tự.');
    design[key] = design[key].trim();
  }
  if (!['plain', 'grid', 'dots'].includes(design.pattern) || !['star', 'heart', 'flower', 'none'].includes(design.sticker)) throw new TypeError('Họa tiết hoặc nhãn dán không hợp lệ.');
  return design;
}

export function photoSessionExpired(expiresAt, now) {
  return Number.isFinite(expiresAt) && expiresAt > 0 && now >= expiresAt;
}

export function drawFrameFooter(ctx, rawDesign, assets = {}, caption, date = '') {
  const design = normalizeDesign(rawDesign);
  ctx.fillStyle = design.background;
  ctx.fillRect(0, 1970, 720, 210);
  ctx.fillStyle = design.ink;
  ctx.textAlign = 'center';
  let size = 37;
  do { ctx.font = `600 italic ${size--}px Playfair, Georgia, serif`; } while (ctx.measureText(caption ?? design.footer).width > 620 && size > 20);
  ctx.fillText(caption ?? design.footer, 360, 2028, 620);
  ctx.font = '700 20px Gilroy, sans-serif';
  ctx.fillText(date, 360, 2071, 440);
  ctx.font = '800 20px Gilroy, sans-serif';
  ctx.fillText('HỘP ẢNH CỦA HÙNG', 360, 2130, 450);
  const sticker = assets[design.sticker];
  if (sticker) {
    ctx.drawImage(sticker, 42, 2057, 75, 75);
    ctx.drawImage(sticker, 605, 2060, 70, 70);
  }
}

// This renderer receives design and static stickers only; it cannot read session photos.
export function drawFrameTemplate(ctx, rawDesign, assets = {}) {
  const design = normalizeDesign(rawDesign);
  ctx.clearRect(0, 0, 720, 2180);
  ctx.fillStyle = design.background;
  ctx.fillRect(0, 0, 720, 2180);
  ctx.save();
  ctx.globalAlpha = .2;
  ctx.strokeStyle = design.accent;
  ctx.fillStyle = design.accent;
  ctx.lineWidth = 2;
  if (design.pattern === 'grid') {
    for (let x = 0; x <= 720; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 2180); ctx.stroke(); }
    for (let y = 0; y <= 2180; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(720, y); ctx.stroke(); }
  } else if (design.pattern === 'dots') {
    for (let y = 18; y < 2180; y += 38) for (let x = 18; x < 720; x += 38) { ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
  ctx.fillStyle = design.ink;
  ctx.textAlign = 'center';
  ctx.font = '800 24px Gilroy, sans-serif';
  ctx.fillText(design.title, 360, 57, 640);
  for (let index = 0; index < 4; index++) {
    const y = 100 + index * 470;
    ctx.fillStyle = '#eee7df';
    ctx.fillRect(40, y, 640, 450);
    ctx.fillStyle = design.ink;
    ctx.globalAlpha = .4;
    ctx.font = '800 74px Gilroy, sans-serif';
    ctx.fillText(`0${index + 1}`, 360, y + 250);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = design.ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(40, y, 640, 450);
  }
  drawFrameFooter(ctx, design, assets);
}
