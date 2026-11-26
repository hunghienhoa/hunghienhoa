import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';

// Một tên miền: mỗi mục là một đường dẫn; tài nguyên nằm đúng vị trí trong dist.
const sections = ['', 'blog/', 'photobooth/', 'snaptik/', 'lamnet/'];
const ADMIN = 'https://admin.hunghienhoa.com';
const files = readdirSync('dist', { recursive: true, withFileTypes: true }).filter(file => file.isFile() && /\.(css|js|mjs|webp|svg|woff2)$/.test(file.name) && !file.name.endsWith('.test.mjs') && !/\/(?:models|vendor)(?:\/|$)/.test(file.parentPath.replaceAll('\\', '/')));
const checks = [...sections.map(section => ({ url: `https://hunghienhoa.com/${section}`, type: /text\/html/ })), { url: `${ADMIN}/`, type: /text\/html/ }];
for (const file of files) {
  const relative = `${file.parentPath}/${file.name}`.replaceAll('\\', '/').replace(/^dist\//, '');
  const type = /\.(js|mjs)$/.test(file.name) ? /javascript/ : /\.css$/.test(file.name) ? /text\/css/ : /\.(svg|webp)$/.test(file.name) ? /image\// : /font\//;
  // Tệp của trang quản trị phục vụ ở gốc admin.hunghienhoa.com; /admin/... trên tên miền chính chuyển hướng sang đó.
  checks.push({ url: relative.startsWith('admin/') ? `${ADMIN}/${relative.slice(6)}` : `https://hunghienhoa.com/${relative}`, type });
}
for (const path of ['health', 'site', 'posts', 'frames']) checks.push({ url: `https://hunghienhoa.com/api/${path}`, type: /application\/json/, api: true }, { url: `${ADMIN}/api/${path}`, type: /application\/json/, api: true });
// Subdomain admin mới gắn có thể cần vài phút để Cloudflare cấp chứng chỉ: thử lại tới khoảng 5 phút.
async function fetchRetry(url, options) {
  const retry = url.startsWith(ADMIN);
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(20000) });
      if (!retry || attempt >= 30 || ![522, 525, 526].includes(response.status)) return response;
      await response.body?.cancel();
    } catch (error) { if (!retry || attempt >= 30) throw error; }
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
}
let passed = 0;
for (let start = 0; start < checks.length; start += 6) {
  await Promise.all(checks.slice(start, start + 6).map(async ({ url, type, api }) => {
    const response = await fetchRetry(url, { redirect: 'manual' });
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
  ['https://hunghienhoa.com/lamnet', 'https://hunghienhoa.com/lamnet/'],
  ['https://hunghienhoa.com/admin/', 'https://admin.hunghienhoa.com/']
]) {
  const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 308, url); assert.equal(response.headers.get('location'), target, url); await response.body?.cancel();
}
for (const path of ['session', 'site', 'posts', 'submissions', 'submissions/test/image.webp']) {
  const response = await fetch(`https://hunghienhoa.com/api/admin/${path}`, { signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 401, path); assert.equal(response.headers.get('cache-control'), 'no-store'); await response.body?.cancel();
}
console.log(`PASS: ${passed} trang/tài nguyên/API HTTPS; 7 chuyển hướng đường dẫn; 5 API quản trị chặn truy cập chưa đăng nhập.`);
