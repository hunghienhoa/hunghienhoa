const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const html = fs.readFileSync('dist/index.html', 'utf8');
const css = fs.readFileSync('dist/style.css', 'utf8');
new vm.Script(fs.readFileSync('dist/app.js', 'utf8'));
for (const [, file] of html.matchAll(/(?:src|href)="([^"#][^"]*)"/g)) assert.ok(fs.existsSync('dist/' + file), `Missing asset ${file}`);
for (const file of fs.readdirSync('dist').filter(file => file.endsWith('.css'))) {
  for (const [, asset] of fs.readFileSync('dist/' + file, 'utf8').matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)) {
    assert.ok(fs.existsSync('dist/' + asset), `Missing CSS asset ${asset}`);
  }
}
for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(html.includes(`id="${id}"`), `Missing anchor ${id}`);
assert.equal((html.match(/data-project="/g) || []).length, 6);
assert.equal((html.match(/<h1\b/g) || []).length, 1);
assert.ok(html.includes('concept-disclaimer'));
assert.ok(css.includes('prefers-reduced-motion'));
assert.ok(html.includes('<dialog'));
console.log('PASS: assets, anchors, six concepts, JS syntax, dialog and reduced-motion support.');
