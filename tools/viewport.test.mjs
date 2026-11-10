import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync('dist/viewport.js','utf8');
const listeners = {};
vm.runInNewContext(source, { document: { addEventListener: (name, fn) => { listeners[name] = fn; } } });
function blocked(name, props) { let prevented = false; listeners[name]({ ...props, preventDefault() { prevented = true; } }); return prevented; }
assert.equal(blocked('wheel', { ctrlKey:true }),true);
assert.equal(blocked('wheel', {}),false);
assert.equal(blocked('keydown', { metaKey:true,key:'+' }),true);
assert.equal(blocked('keydown', { ctrlKey:true,key:'c' }),false);
assert.equal(blocked('keydown', { key:'-' }),false);
assert.equal(blocked('gesturestart', {}),true);
for (const path of ['dist','dist/blog','dist/photobooth','dist/admin']) {
  assert.equal(fs.readFileSync(`${path}/viewport.js`,'utf8'),source);
  assert.match(fs.readFileSync(`${path}/index.html`,'utf8'),/maximum-scale=1,user-scalable=no/);
}
console.log('PASS: zoom shortcuts blocked; normal scroll, typing, copy preserved on all pages.');

for(const folder of ['dist','dist/blog','dist/photobooth','dist/admin']) {
 const html=fs.readFileSync(`${folder}/index.html`,'utf8');
 assert.equal((html.match(/<footer\b/g)||[]).length,1);
 assert.match(html,/<p class="footer-wish"[^>]*>[^<]+<\/p><\/footer><\/body>/);
 assert.ok(html.indexOf('footer-meta')>html.indexOf('<footer'));
 assert.equal(fs.readFileSync(`${folder}/footer.css`,'utf8'),fs.readFileSync('dist/footer.css','utf8'));
}
