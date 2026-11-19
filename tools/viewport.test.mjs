import assert from 'node:assert/strict';
import fs from 'node:fs';
// Người dùng phải phóng to được (WCAG 1.4.4): không khóa trong viewport meta, CSS hay JavaScript.
const pages = fs.readdirSync('dist', { recursive: true }).filter(file => file.endsWith('.html')).map(file => `dist/${file}`);
for (const page of pages) {
  const html = fs.readFileSync(page, 'utf8');
  assert.ok(!/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:\.0)?\b/i.test(html), `${page} khóa phóng to`);
  assert.ok(!html.includes('viewport.js'), `${page} còn nạp script chặn phóng to`);
}
for (const path of ['dist','dist/blog','dist/photobooth','dist/admin']) {
  assert.ok(!fs.existsSync(`${path}/viewport.js`));
  const css = fs.readFileSync(`${path}/viewport.css`,'utf8');
  assert.ok(!/touch-action:\s*pan-x pan-y/.test(css), `${path}/viewport.css chặn pinch`);
  assert.match(css, /input,textarea,select\{font-size:16px!important\}/);
  assert.equal(css, fs.readFileSync('dist/viewport.css','utf8'));
  assert.match(fs.readFileSync(`${path}/index.html`,'utf8'), /viewport\.css\?v=3/);
}
console.log('PASS: pinch and browser zoom allowed on every page; inputs stay 16px so iOS does not auto-zoom.');

for(const folder of ['dist','dist/blog','dist/photobooth','dist/admin']) {
 const html=fs.readFileSync(`${folder}/index.html`,'utf8');
 assert.equal((html.match(/<footer\b/g)||[]).length,1);
 if(folder!=='dist/admin') assert.match(html,/<p class="footer-wish"[^>]*>[^<]+<\/p><nav class="policy-links"[^>]*>.*?<\/nav><\/footer><\/body>/);
 if(folder!=='dist/admin') assert.ok(!html.includes('footer-meta'));
 else {assert.ok(html.indexOf('footer-meta')>html.indexOf('<footer'));assert.ok(!html.includes('class="footer-wish"'));}
 assert.equal(fs.readFileSync(`${folder}/footer.css`,'utf8'),fs.readFileSync('dist/footer.css','utf8'));
}

const compact=fs.readFileSync('dist/mobile-compact.css','utf8');
for(const folder of ['dist','dist/blog','dist/photobooth','dist/admin']){
 assert.equal(fs.readFileSync(`${folder}/mobile-compact.css`,'utf8'),compact);
 assert.match(fs.readFileSync(`${folder}/index.html`,'utf8'),/mobile-compact.css\?v=1/);
}
assert.match(fs.readFileSync('dist/photobooth/shoot.html','utf8'),/mobile-compact.css\?v=1/);
assert.ok(compact.includes('@media(max-width:760px)') && compact.includes('min-height:44px'));

// Mức sàn cỡ chữ: một bản readability.css dùng chung, nạp sau cùng ở mọi trang công khai.
const readability=fs.readFileSync('dist/readability.css','utf8');
for(const folder of ['dist/blog','dist/photobooth'])assert.equal(fs.readFileSync(`${folder}/readability.css`,'utf8'),readability);
for(const page of ['dist/index.html','dist/blog/index.html','dist/photobooth/index.html','dist/photobooth/shoot.html','dist/snaptik/index.html','dist/chinh-sach-rieng-tu.html','dist/dieu-khoan-su-dung.html','dist/bao-cao-ban-quyen.html','dist/cookie-va-quang-cao.html']){
 const head=fs.readFileSync(page,'utf8').split('</head>')[0];
 assert.match(head,/readability\.css\?v=\d+"><\/head>|readability\.css\?v=\d+">$/,`${page} phải nạp readability.css sau cùng`);
}
assert.ok(!readability.includes('.parcel')&&!readability.includes('.carton')&&!readability.includes('.id-card'),'Không đổi cỡ chữ trong hình minh họa');
console.log('PASS: readability floor stylesheet shared, loaded last on nine public pages, illustrations untouched.');
