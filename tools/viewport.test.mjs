import assert from 'node:assert/strict';
import fs from 'node:fs';
// Người dùng phải phóng to được (WCAG 1.4.4): không khóa trong viewport meta, CSS hay JavaScript.
const pages = fs.readdirSync('dist', { recursive: true }).filter(file => file.endsWith('.html')).map(file => `dist/${file}`);
for (const page of pages) {
  const html = fs.readFileSync(page, 'utf8');
  assert.ok(!/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:\.0)?\b/i.test(html), `${page} khóa phóng to`);
  assert.ok(!html.includes('viewport.js'), `${page} còn nạp script chặn phóng to`);
}
const ui = fs.readFileSync('dist/ui.css', 'utf8');
assert.ok(!/touch-action:\s*pan-x pan-y/.test(ui), 'ui.css chặn pinch');
assert.match(ui, /input\[type=text\][^{]*\{[^}]*font-size:16px/, 'Ô nhập 16px để iOS không tự phóng to');
console.log('PASS: pinch and browser zoom allowed on every page; inputs stay 16px so iOS does not auto-zoom.');

// Giao diện 2026: một tên miền, một bộ giao diện dùng chung /ui.css, thanh điều hướng và footer sinh từ tools/site-chrome.py.
const publicPages = ['dist/index.html', 'dist/blog/index.html', 'dist/photobooth/index.html', 'dist/photobooth/shoot.html', 'dist/snaptik/index.html', 'dist/lamnet/index.html', 'dist/chinh-sach-rieng-tu.html', 'dist/dieu-khoan-su-dung.html', 'dist/bao-cao-ban-quyen.html', 'dist/cookie-va-quang-cao.html'];
for (const page of publicPages) {
  const html = fs.readFileSync(page, 'utf8');
  assert.match(html, /<link rel="stylesheet" href="\/ui\.css\?v=\d+">/, `${page} phải nạp /ui.css`);
  assert.equal((html.match(/<header class="sitebar">/g) || []).length, 1, `${page} cần đúng một thanh điều hướng`);
  assert.equal((html.match(/<footer\b/g) || []).length, 1, `${page} cần đúng một footer`);
  assert.match(html, /<footer class="site-footer">.*<p class="footer-wish"[^>]*>[^<]+<\/p><nav class="policy-links"[^>]*>.*?<\/nav><div class="footer-bottom">.*?<\/footer>/s, `${page} footer sai thứ tự`);
  assert.ok(html.includes('id="contact"') && html.includes('id="wechat-copy"'), `${page} thiếu phần liên hệ`);
  for (const old of ['sitebar.css', 'footer.css', 'readability.css', 'mobile-compact.css', 'viewport.css', 'decorative-stickers.css', 'theme.css']) assert.ok(!html.includes(old), `${page} còn nạp ${old}`);
}
const admin = fs.readFileSync('dist/admin/index.html', 'utf8');
assert.ok(admin.indexOf('footer-meta') > admin.indexOf('<footer') && !admin.includes('class="footer-wish"'));
// Một tên miền nên không còn bản sao giao diện trong từng thư mục.
for (const folder of ['dist/blog', 'dist/photobooth', 'dist/admin']) for (const file of ['sitebar.css', 'sitebar.js', 'i18n.js', 'i18n-en.js', 'footer.css', 'contact.css', 'page-customization.js', 'fonts']) assert.ok(!fs.existsSync(`${folder}/${file}`), `${folder}/${file} là bản sao cũ`);
console.log('PASS: shared /ui.css, one generated nav and footer per public page, no per-folder copies.');
