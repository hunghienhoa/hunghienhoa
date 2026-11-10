import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ADSENSE_CLIENT,adsenseHtml} from '../server/adsense.mjs';
for(const page of ['dist','dist/blog','dist/photobooth']) {
  const html=readFileSync(page+'/index.html','utf8');
  const head=html.split('</head>')[0];
  assert.equal((head.match(/adsbygoogle\.js\?client=/g)||[]).length,1);
  assert.ok(head.includes(ADSENSE_CLIENT));
  const result=adsenseHtml(html,'synthetic-test-nonce');
  assert.ok(result.csp.includes("'nonce-synthetic-test-nonce' 'strict-dynamic'"));
  assert.equal((result.body.match(/<script\b/g)||[]).length,(result.body.match(/<script nonce="synthetic-test-nonce"/g)||[]).length);
  assert.notEqual(adsenseHtml(html,'another-nonce').csp,result.csp);
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
