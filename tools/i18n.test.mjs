import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Mọi chữ tiếng Việt nhìn thấy trong trang công khai phải có bản English (trừ tên riêng giữ nguyên).
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync('dist/i18n-en.js', 'utf8').replace(/^export default /m, 'window.HH_I18N_EN='), sandbox);
const dict = sandbox.window.HH_I18N_EN;
assert.ok(dict && Object.keys(dict).length > 900, 'Từ điển English phải có đủ câu');
for (const [vi, en] of Object.entries(dict)) assert.ok(typeof en === 'string' && en.trim() && !/[À-ÖØ-öø-ỹ]/.test(en.replace(/Hùng|Hiền Hòa|HÙNG|HIỀN HÒA|Ô|ô|Đ/g, '')), `Bản dịch lỗi: ${vi}`);
const SAME = new Set(['Hùng Hiền Hòa', 'HÙNG HIỀN HÒA · 2026', 'Hùng.', 'HÙNG HIỀN HÒA', 'Hùng Hiền Hòa — #BQHTIT', '4×', '×', '1×', '1.5×', '2×']);
const viet = /[À-ÖØ-öø-ỹĐđ]/;
const decode = value => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
const pages = ['dist/index.html', 'dist/blog/index.html', 'dist/photobooth/index.html', 'dist/photobooth/shoot.html', 'dist/snaptik/index.html', 'dist/lamnet/index.html', 'dist/cotuong/index.html', 'dist/game/index.html', 'dist/game/do-vui/index.html', 'dist/chinh-sach-rieng-tu.html', 'dist/dieu-khoan-su-dung.html', 'dist/cookie-va-quang-cao.html', 'dist/bao-cao-ban-quyen.html', 'dist/404.html'];
for (const page of pages) {
  const raw0 = fs.readFileSync(page, 'utf8'), html = raw0.replace(/<(script|style)\b[\s\S]*?<\/\1>/g, '');
  const found = [...html.matchAll(/>([^<>]+)</g)].map(m => m[1]).concat([...html.matchAll(/\b(?:aria-label|title|placeholder|alt|content)="([^"]*)"/g)].map(m => m[1]));
  for (const raw of found) {
    const text = decode(raw);
    if (viet.test(text)) assert.ok(text in dict || SAME.has(text), `${page}: thiếu bản English cho “${text}”`);
  }
  if (page !== 'dist/404.html') assert.match(raw0, /i18n\.js\?v=\d+/, `${page} phải nạp i18n.js`);
}
// Trang quản trị không có nút chuyển ngôn ngữ.
for (const file of fs.readdirSync('dist/admin').filter(name => name.endsWith('.html'))) assert.ok(!fs.readFileSync(`dist/admin/${file}`, 'utf8').includes('i18n.js'), `dist/admin/${file} không được nạp i18n.js`);
console.log('PASS: bản English phủ mọi chữ trên trang công khai, trang quản trị không có nút ngôn ngữ.');
