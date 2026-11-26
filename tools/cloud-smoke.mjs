import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';

// Một tên miền: mỗi mục là một đường dẫn; tài nguyên nằm đúng vị trí trong dist.
const sections = ['', 'admin/', 'blog/', 'photobooth/', 'snaptik/', 'lamnet/'];
const files = readdirSync('dist', { recursive: true, withFileTypes: true }).filter(file => file.isFile() && /\.(css|js|mjs|webp|svg|woff2)$/.test(file.name) && !file.name.endsWith('.test.mjs') && !/\/(?:models|vendor)(?:\/|$)/.test(file.parentPath.replaceAll('\\', '/')));
const checks = sections.map(section => ({ url: `https://hunghienhoa.com/${section}`, type: /text\/html/ }));
for (const file of files) {
  const relative = `${file.parentPath}/${file.name}`.replaceAll('\\', '/').replace(/^dist\//, '');
  const type = /\.(js|mjs)$/.test(file.name) ? /javascript/ : /\.css$/.test(file.name) ? /text\/css/ : /\.(svg|webp)$/.test(file.name) ? /image\// : /font\//;
  checks.push({ url: `https://hunghienhoa.com/${relative}`, type });
}
for (const path of ['health', 'site', 'posts', 'frames']) checks.push({ url: `https://hunghienhoa.com/api/${path}`, type: /application\/json/, api: true });
let passed = 0;
for (let start = 0; start < checks.length; start += 6) {
  await Promise.all(checks.slice(start, start + 6).map(async ({ url, type, api }) => {
    const response = await fetch(url, { signal: AbortSignal.timeout(20000), redirect: 'manual' });
    assert.equal(response.status, 200, url);
    assert.match(response.headers.get('content-type') || '', type, url);
    if (api) assert.equal(response.headers.get('cache-control'), 'no-store', url);
    else assert.ok(response.headers.get('content-security-policy'), url);
    await response.body?.cancel(); passed++;
  }));
}
for (const [url, target] of [
  ['https://www.hunghienhoa.com/', 'https://hunghienhoa.com/'],
  ['https://hunghienhoa.com/blog', 'https://hunghienhoa.com/blog/'],
  ['https://hunghienhoa.com/photobooth/shoot/', 'https://hunghienhoa.com/photobooth/shoot'],
  ['https://hunghienhoa.com/blog/index.html', 'https://hunghienhoa.com/blog/'],
  ['https://hunghienhoa.com/snap/', 'https://hunghienhoa.com/snaptik/'],
  ['https://hunghienhoa.com/lamnet', 'https://hunghienhoa.com/lamnet/']
]) {
  const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 308, url); assert.equal(response.headers.get('location'), target, url); await response.body?.cancel();
}
for (const path of ['session', 'site', 'posts', 'submissions', 'submissions/test/image.webp']) {
  const response = await fetch(`https://hunghienhoa.com/api/admin/${path}`, { signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 401, path); assert.equal(response.headers.get('cache-control'), 'no-store'); await response.body?.cancel();
}
console.log(`PASS: ${passed} trang/tài nguyên/API HTTPS; 6 chuyển hướng đường dẫn; 5 API quản trị chặn truy cập chưa đăng nhập.`);
