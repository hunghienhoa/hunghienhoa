import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ADSENSE_CLIENT,adsenseHtml} from '../server/adsense.mjs';
for(const page of ['dist','dist/blog','dist/photobooth']) {
  const html=readFileSync(page+'/index.html','utf8');
  const head=html.split('</head>')[0];
  assert.equal((head.match(/adsbygoogle\.js\?client=/g)||[]).length,0);
  assert.ok(head.includes('name="google-adsense-account"'));
  assert.ok(head.includes(ADSENSE_CLIENT));
  const result=adsenseHtml(html,'synthetic-test-nonce');
  assert.ok(result.csp.includes("'nonce-synthetic-test-nonce' 'strict-dynamic'"));
  assert.equal((result.body.match(/<script\b/g)||[]).length,(result.body.match(/<script nonce="synthetic-test-nonce"/g)||[]).length);
  assert.notEqual(adsenseHtml(html,'another-nonce').csp,result.csp);
  assert.ok(result.csp.includes("base-uri 'self'"));
}
const admin=readFileSync('dist/admin/index.html','utf8');
assert.ok(!admin.includes('adsbygoogle')&&!admin.includes(ADSENSE_CLIENT));
assert.equal(adsenseHtml(admin,'nonce'),null);
const main=readFileSync('dist/index.html','utf8');
for(const id of ['photobooth-project','blog-project']) {
  const tag=main.match(new RegExp('<a[^>]+id="'+id+'"[^>]*>'))[0];
  assert.ok(tag.includes('target="_blank"')&&tag.includes('noopener noreferrer'));
}
assert.ok(!main.includes('project-window.js'));
console.log('PASS: AdSense publisher/code on three public heads only; nonce CSP covers scripts; admin untouched; native new-tab links retained.');

const policies=['chinh-sach-rieng-tu','dieu-khoan-su-dung','bao-cao-ban-quyen','cookie-va-quang-cao'];
for(const page of ['dist/index.html','dist/blog/index.html','dist/photobooth/index.html','dist/photobooth/shoot.html',...policies.map(name=>`dist/${name}.html`)]) {
  const html=readFileSync(page,'utf8');
  for(const name of policies) assert.ok(html.includes(`https://hunghienhoa.com/${name}`));
  assert.ok(html.indexOf('aria-label="Chính sách website"')>html.indexOf('<p class="footer-wish"'));
  assert.ok(!html.includes('pagead2.googlesyndication.com'));
}
for(const name of policies) {
 const html=readFileSync(`dist/${name}.html`,'utf8');
 assert.ok(html.includes('<html lang="vi">')&&html.includes('hunghienhoa2110@gmail.com'));
 assert.ok(!/<script\b/.test(html));
 for(const href of [...html.matchAll(/href="([^"#]+)"/g)].map(m=>m[1]).filter(h=>!/^https?:|^mailto:|^\//.test(h)))assert.doesNotThrow(()=>readFileSync('dist/'+href.split(/[?#]/)[0]));
}
const booth=readFileSync('dist/photobooth/index.html','utf8');
assert.match(booth,/<input id="contribution-consent" type="checkbox" required>/);
assert.ok(booth.includes('Tôi xác nhận có quyền sử dụng thiết kế'));
console.log('PASS: privacy/terms/copyright/cookie pages linked below footer wish on all eight public pages; ads disabled; submission consent retained.');
