// Tệp có ?v= được trình duyệt cache một năm (worker/index.mjs). Kiểm tra này ghi lại mã băm của từng
// cặp "tệp?v=" để báo lỗi khi nội dung đổi mà quên tăng v. Sau khi tăng v: node tools/asset-versions.mjs --write
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const manifestPath = path.resolve('tools/asset-versions.json');
const pattern = /(?:(?:src|href)="|from\s+['"]|import\s*\(\s*['"])([^"'#:]+?\.(?:css|m?js))\?v=([^"'&#]+)/g;

function collect() {
  const entries = {};
  for (const name of fs.readdirSync(dist, { recursive: true })) {
    const file = path.join(dist, name);
    if (!/\.(?:html|m?js)$/.test(file) || /\.test\.mjs$/.test(file) || !fs.statSync(file).isFile()) continue;
    const source = fs.readFileSync(file, 'utf8');
    for (const [, reference, version] of source.matchAll(pattern)) {
      const target = reference.startsWith('/') ? path.join(dist, reference) : path.resolve(path.dirname(file), reference);
      if (!fs.existsSync(target)) continue;
      const key = `${path.relative(dist, target).split(path.sep).join('/')}?v=${version}`;
      entries[key] = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex').slice(0, 16);
    }
  }
  return Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b)));
}

const current = collect();
if (process.argv.includes('--write')) {
  fs.writeFileSync(manifestPath, JSON.stringify(current, null, 2) + '\n');
  console.log(`Đã ghi ${Object.keys(current).length} phiên bản tệp vào tools/asset-versions.json.`);
} else {
  const saved = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
  const problems = [];
  for (const [key, hash] of Object.entries(current)) {
    if (!saved[key]) problems.push(`Chưa ghi nhận ${key}: chạy node tools/asset-versions.mjs --write`);
    else if (saved[key] !== hash) problems.push(`${key.split('?')[0]} đã đổi nội dung nhưng vẫn dùng ?v=${key.split('?v=')[1]}: tăng v ở mọi chỗ tham chiếu rồi chạy node tools/asset-versions.mjs --write`);
  }
  if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
  console.log(`PASS: ${Object.keys(current).length} tệp có ?v= khớp phiên bản đã ghi nhận.`);
}
