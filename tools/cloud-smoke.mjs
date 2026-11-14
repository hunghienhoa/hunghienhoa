import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';

const hosts = ['hunghienhoa.com', 'admin.hunghienhoa.com', 'blog.hunghienhoa.com', 'photobooth.hunghienhoa.com', 'snaptik.hunghienhoa.com'];
const files = readdirSync('dist', { recursive: true, withFileTypes: true }).filter(file => file.isFile() && /\.(css|js|mjs|webp|svg|woff2)$/.test(file.name) && !file.name.endsWith('.test.mjs'));
const checks = hosts.map(host => ({ url: `https://${host}/`, type: /text\/html/ }));
for (const file of files) {
  const relative = `${file.parentPath}/${file.name}`.replaceAll('\\', '/').replace(/^dist\//, '');
  const section = relative.match(/^(admin|blog|photobooth|snaptik)\//)?.[1];
  const path = section ? relative.slice(section.length + 1) : relative;
  const type = /\.(js|mjs)$/.test(file.name) ? /javascript/ : /\.css$/.test(file.name) ? /text\/css/ : /\.(svg|webp)$/.test(file.name) ? /image\// : /font\//;
  checks.push({ url: `https://${section ? section + '.' : ''}hunghienhoa.com/${path}`, type });
}
for (const host of hosts) for (const path of ['health', 'site', 'posts', 'frames']) checks.push({ url: `https://${host}/api/${path}`, type: /application\/json/, api: true });
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
  ['https://hunghienhoa.com/blog/?bai=vui', 'https://blog.hunghienhoa.com/?bai=vui'],
  ['https://hunghienhoa.com/photobooth/', 'https://photobooth.hunghienhoa.com/'],
  ['https://hunghienhoa.com/admin/', 'https://admin.hunghienhoa.com/']
]) {
  const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 308, url); assert.equal(response.headers.get('location'), target, url); await response.body?.cancel();
}
for (const path of ['session', 'site', 'posts', 'submissions', 'submissions/test/image.webp']) {
  const response = await fetch(`https://admin.hunghienhoa.com/api/admin/${path}`, { signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 401, path); assert.equal(response.headers.get('cache-control'), 'no-store'); await response.body?.cancel();
}
console.log(`PASS: ${passed} trang/tài nguyên/API HTTPS; 4 chuyển hướng tên miền; 5 API quản trị chặn truy cập chưa đăng nhập.`);
