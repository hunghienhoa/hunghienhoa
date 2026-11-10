export const PHOTO_SESSION_MS = 60 * 60 * 1000;
export const FRAME_CATEGORIES = ['Tối giản','Dễ thương & thiên nhiên','Sinh nhật & lễ hội','Việt Nam','Nhạc pop & Y2K','Nhật ký & vintage'];
export const DEFAULT_DESIGN = Object.freeze({
  background: '#fbf2e3', ink: '#303487', accent: '#ffdc38',
  title: 'HỘP ẢNH · MỘT CHÚT HÔM NAY', footer: 'Giữ lại một chút vui.', pattern: 'plain', sticker: 'flower'
});

export function normalizeDesign(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Thiết kế khung không hợp lệ.');
  const keys = Object.keys(DEFAULT_DESIGN);
  if (Object.keys(input).some(key => ![...keys,'category'].includes(key))) throw new TypeError('Khung có thông tin không được hỗ trợ.');
  if(input.category!==undefined && !FRAME_CATEGORIES.includes(input.category)) throw new TypeError('Phân loại khung không hợp lệ.');
  const design = { ...DEFAULT_DESIGN, ...input };
  for (const key of ['background', 'ink', 'accent']) {
    if (typeof design[key] !== 'string' || !/^#[a-f\d]{6}$/i.test(design[key])) throw new TypeError('Màu khung cần đúng định dạng sáu ký tự.');
    design[key] = design[key].toLowerCase();
  }
  for (const key of ['title', 'footer']) {
    if (typeof design[key] !== 'string' || design[key].trim().length > 60) throw new TypeError('Chữ trên khung tối đa 60 ký tự.');
    design[key] = design[key].trim();
  }
  if (!['plain', 'grid', 'dots', 'film', 'checker', 'stripes', 'confetti', 'hearts', 'waves', 'sparkles', 'lace', 'doodles'].includes(design.pattern) || !['star', 'heart', 'flower', 'bow', 'cat', 'cherry', 'cloud', 'butterfly', 'smile', 'none'].includes(design.sticker)) throw new TypeError('Họa tiết hoặc nhãn dán không hợp lệ.');
  return design;
}

export function photoSessionExpired(expiresAt, now) {
  return Number.isFinite(expiresAt) && expiresAt > 0 && now >= expiresAt;
}

// One path for the preview, personal photo clipping and blank contribution poster.
export function photoWindow(ctx, design, index) {
  const y = 100 + index * 470;
  ctx.beginPath();
  if (design.pattern === 'hearts' && index % 2 === 0) {
    ctx.moveTo(360, y + 445);
    ctx.bezierCurveTo(-170, y + 150, 110, y - 120, 360, y + 75);
    ctx.bezierCurveTo(610, y - 120, 890, y + 150, 360, y + 445);
  } else if (design.pattern === 'waves' || design.pattern === 'sparkles') {
    ctx.ellipse(360, y + 225, 315, 220, 0, 0, Math.PI * 2);
  } else if (design.pattern === 'doodles' || design.pattern === 'lace') {
    ctx.roundRect(40, y, 640, 450, [80, 25, 80, 25]);
  } else {
    ctx.rect(40, y, 640, 450);
  }
  ctx.closePath();
}

function frameCollage(ctx, design, assets) {
  ctx.save();
  const labels = design.pattern === 'film' ? ['REC · 01', 'CHUYỆN MÌNH', 'MỘT THƯỚC PHIM', 'CẤT GIỮ HÔM NAY']
    : design.pattern === 'waves' ? ['BIỂN GỌI', 'NẮNG VÀ GIÓ', 'MÌNH ĐI CHƠI', 'MÙA HÈ TRONG TÚI']
    : design.pattern === 'hearts' || design.pattern === 'lace' ? ['XINH THEO CÁCH MÌNH', 'MỘT CHÚT THƯƠNG', 'GỬI BẠN MỘT TIM', 'HÔM NAY ĐÁNG YÊU']
    : ['MỘT NGÀY RẤT MÌNH', 'GIỮ LẠI NỤ CƯỜI', 'CHUYỆN NHỎ · VUI TO', 'KỶ NIỆM ĐANG LỚN'];
  for (let i = 0; i < 4; i++) {
    const y = 100 + i * 470;
    ctx.save();
    ctx.translate(i % 2 ? 455 : 180, y + 438);
    ctx.rotate((i % 2 ? 1 : -1) * .06);
    ctx.fillStyle = design.accent;
    ctx.fillRect(-145, -23, 290, 42);
    ctx.strokeStyle = design.ink; ctx.lineWidth = 2;
    ctx.strokeRect(-145, -23, 290, 42);
    ctx.fillStyle = '#242338'; ctx.font = '800 15px "Be Vietnam Pro", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(labels[i], 0, 3, 270);
    ctx.restore();
    const sticker = assets[design.sticker];
    if (sticker) {
      ctx.save(); ctx.translate(i % 2 ? 60 : 660, y + 35); ctx.rotate(i % 2 ? -.22 : .22);
      ctx.drawImage(sticker, -44, -44, 88, 88); ctx.restore();
    }
    ctx.strokeStyle = design.accent; ctx.lineWidth = 4;
    for (const [x, dy] of [[20, 170], [700, 320]]) {
      ctx.beginPath(); ctx.moveTo(x - 12, y + dy); ctx.lineTo(x + 12, y + dy);
      ctx.moveTo(x, y + dy - 16); ctx.lineTo(x, y + dy + 16); ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawFrameFooter(ctx, rawDesign, assets = {}, caption, date = '') {
  const design = normalizeDesign(rawDesign);
  ctx.fillStyle = design.background;
  ctx.fillRect(0, 1970, 720, 210);
  ctx.fillStyle = design.ink;
  ctx.textAlign = 'center';
  let size = 37;
  do { ctx.font = `italic 600 ${size--}px "Playfair Display", Georgia, serif`; } while (ctx.measureText(caption ?? design.footer).width > 620 && size > 20);
  ctx.fillText(caption ?? design.footer, 360, 2028, 620);
  ctx.font = '700 20px "Be Vietnam Pro", sans-serif';
  ctx.fillText(date, 360, 2071, 440);
  ctx.font = '800 20px "Be Vietnam Pro", sans-serif';
  ctx.fillText('HỘP ẢNH CỦA HÙNG', 360, 2130, 450);
  const sticker = assets[design.sticker];
  if (sticker) {
    ctx.drawImage(sticker, 42, 2057, 75, 75);
    ctx.drawImage(sticker, 605, 2060, 70, 70);
    for (const y of [510, 980, 1450]) {
      ctx.drawImage(sticker, 2, y, 36, 36);
      ctx.drawImage(sticker, 682, y - 30, 36, 36);
    }
  }
  frameCollage(ctx, design, assets);
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
  } else if (design.pattern === 'film') {
    ctx.globalAlpha = .85;
    for (let y = 100; y < 1970; y += 55) for (const x of [8, 692]) ctx.fillRect(x, y, 20, 30);
  } else if (design.pattern === 'checker') {
    for (let y = 0; y < 2180; y += 24) for (let x = 0; x < 720; x += 24) if ((x / 24 + y / 24) % 2 === 0) ctx.fillRect(x, y, 24, 24);
  } else if (design.pattern === 'stripes') {
    for (let x = -2180; x < 720; x += 65) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 2180, 2180); ctx.stroke(); }
  } else if (design.pattern === 'confetti') {
    ctx.globalAlpha = .65;
    for (let y = 20; y < 2180; y += 75) for (let x = 12; x < 720; x += 85) { ctx.fillRect(x + (y % 3) * 6, y, 7, 16); ctx.beginPath(); ctx.arc(x + 35, y + 30, 4, 0, Math.PI * 2); ctx.fill(); }
  } else if (design.pattern === 'hearts') {
    ctx.globalAlpha = .5;
    for (let y = 30; y < 2180; y += 70) for (let x = 18; x < 720; x += 70) {
      ctx.beginPath(); ctx.moveTo(x, y + 9); ctx.bezierCurveTo(x - 22, y - 5, x - 8, y - 22, x, y - 10); ctx.bezierCurveTo(x + 8, y - 22, x + 22, y - 5, x, y + 9); ctx.fill();
    }
  } else if (design.pattern === 'waves') {
    ctx.globalAlpha = .5; ctx.lineWidth = 4;
    for (let y = 0; y < 2180; y += 45) { ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x < 720; x += 60) ctx.bezierCurveTo(x + 15, y - 20, x + 45, y + 20, x + 60, y); ctx.stroke(); }
  } else if (design.pattern === 'sparkles') {
    ctx.globalAlpha = .75;
    for (let y = 25; y < 2180; y += 85) for (let x = 20; x < 720; x += 85) { ctx.beginPath(); ctx.moveTo(x, y - 16); ctx.lineTo(x + 5, y - 4); ctx.lineTo(x + 16, y); ctx.lineTo(x + 5, y + 4); ctx.lineTo(x, y + 16); ctx.lineTo(x - 5, y + 4); ctx.lineTo(x - 16, y); ctx.lineTo(x - 5, y - 4); ctx.closePath(); ctx.fill(); }
  } else if (design.pattern === 'lace') {
    ctx.globalAlpha = .8; ctx.lineWidth = 3;
    for (let y = 0; y < 2180; y += 26) for (const x of [15, 705]) { ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.stroke(); }
    ctx.strokeRect(30, 75, 660, 1890);
  } else if (design.pattern === 'doodles') {
    ctx.globalAlpha = .65; ctx.lineWidth = 3;
    for (let y = 40; y < 2180; y += 75) for (const x of [18, 702]) { ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - 10, y + 26); ctx.lineTo(x + 9, y + 38); ctx.lineTo(x - 6, y + 51); ctx.stroke(); }
  }
  ctx.restore();
  ctx.fillStyle = design.ink;
  ctx.textAlign = 'center';
  ctx.font = '800 24px "Be Vietnam Pro", sans-serif';
  ctx.fillText(design.title, 360, 57, 640);
  for (let index = 0; index < 4; index++) {
    const y = 100 + index * 470;
    ctx.fillStyle = '#eee7df';
    photoWindow(ctx, design, index);
    ctx.fill();
    ctx.fillStyle = design.ink;
    ctx.globalAlpha = .4;
    ctx.font = '800 74px "Be Vietnam Pro", sans-serif';
    ctx.fillText(`0${index + 1}`, 360, y + 250);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = design.ink;
    ctx.lineWidth = 2;
    photoWindow(ctx, design, index);
    ctx.stroke();
  }
  drawFrameFooter(ctx, design, assets);
}
