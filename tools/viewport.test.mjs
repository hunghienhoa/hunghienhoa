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
