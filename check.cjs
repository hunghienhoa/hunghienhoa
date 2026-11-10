const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync('dist/index.html', 'utf8');
const css = fs.readFileSync('dist/style.css', 'utf8');
new vm.Script(fs.readFileSync('dist/app.js', 'utf8'));
const sourceFiles = fs.readdirSync('dist', { recursive: true }).map(file => path.join('dist', file));
assert.ok(!sourceFiles.some(file => /\.png$/i.test(file)), 'Convert served PNG assets with python tools/convert-webp.py');
for (const sourceFile of sourceFiles.filter(file => /\.(html|css)$/.test(file))) {
  const source = fs.readFileSync(sourceFile, 'utf8');
  assert.ok(!/Gilroy/i.test(source), `Use Be Vietnam Pro and Playfair Display in ${sourceFile}`);
  const references = sourceFile.endsWith('.html') ? /(?:src|href)="([^"#][^"]*)"/g : /url\(['"]?([^'"\)]+)['"]?\)/g;
  for (const [, reference] of source.matchAll(references)) {
    if (/^(https?:|mailto:|tel:|data:)/.test(reference)) continue;
    const file = reference.split(/[?#]/)[0];
    const resolved = file.startsWith('/') ? path.resolve('dist', file.slice(1)) : path.resolve(path.dirname(sourceFile), file);
    assert.ok(fs.existsSync(resolved), `Missing asset ${reference} in ${sourceFile}`);
  }
  if (sourceFile.endsWith('.html')) {
    for (const [, id] of source.matchAll(/href="#([^"]+)"/g)) assert.ok(source.includes(`id="${id}"`), `Missing anchor ${id} in ${sourceFile}`);
  }
}
assert.equal((html.match(/data-project="/g) || []).length, 6);
for (const page of ['', 'blog/', 'photobooth/', 'admin/']) {
  const typography = fs.readFileSync(`dist/${page}style.css`, 'utf8');
  assert.ok(typography.includes("font-family:'Be Vietnam Pro'"));
  assert.ok(typography.includes("font-family:'Playfair Display'"));
  for (const name of ['Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold', 'Black']) {
    assert.equal(fs.readFileSync(`dist/${page}fonts/BeVietnamPro-${name}.woff2`).subarray(0, 4).toString(), 'wOF2');
  }
}
assert.equal((html.match(/<h1\b/g) || []).length, 1);
assert.ok(html.includes('concept-disclaimer'));
assert.ok(css.includes('prefers-reduced-motion'));
assert.ok(html.includes('<dialog'));
console.log('PASS: assets, anchors, six concepts, JS syntax, dialog and reduced-motion support.');
for (const id of ['photobooth-project','blog-project']) {
  const link = html.match(new RegExp('<a[^>]+id="'+id+'"[^>]*>'))[0];
  assert.ok(!link.includes('target=') && !link.includes('data-project-window'));
}
assert.ok(!html.includes('project-window.js'));
console.log('PASS: project links use normal same-tab navigation.');
(async () => {
  for (const clipboardWorks of [true, false]) {
    let click, copied, clearFeedback, feedbackDelay;
    const status = { textContent: '' };
    const button = { dataset: { wechatId: 'test-wechat-id' }, addEventListener: (_, handler) => { click = handler; } };
    vm.runInNewContext(fs.readFileSync('dist/contact.js', 'utf8'), {
      document: { querySelector: selector => selector === '#wechat-copy' ? button : status },
      navigator: { clipboard: { writeText: async text => { if (!clipboardWorks) throw new Error('denied'); copied = text; } } },
      setTimeout: (callback, delay) => { clearFeedback = callback; feedbackDelay = delay; return 1; },
      clearTimeout: () => { clearFeedback = undefined; }
    });
    assert.equal(status.textContent, '');
    assert.equal(copied, undefined);
    await click();
    if (clipboardWorks) assert.equal(copied, button.dataset.wechatId);
    assert.ok(status.textContent.includes(button.dataset.wechatId));
    assert.ok(status.textContent.includes(clipboardWorks ? 'Đã sao chép' : 'Bạn có thể chọn'));
    if (clipboardWorks) {
      assert.equal(feedbackDelay, 3000);
      clearFeedback();
      assert.equal(status.textContent, '');
    } else {
      assert.equal(clearFeedback, undefined);
    }
  }
  console.log('PASS: WeChat starts empty, success clears after 3s, denied-copy fallback stays visible.');
})().catch(error => { console.error(error); process.exitCode = 1; });
