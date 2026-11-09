import assert from 'node:assert/strict';
import { fold, readingMinutes, filterPosts, articleBlocks, safeCoverURL } from './core.mjs';

assert.equal(fold('Điều thú vị Ở ĐÂY'), 'dieu thu vi o day');
assert.equal(readingMinutes(''), 1);
assert.equal(readingMinutes(Array(181).fill('chữ').join(' ')), 2);
const posts = [
  { slug: 'anh', title: 'Ảnh giữ kỷ niệm', content: 'Một tấm ảnh đẹp', category: 'Hình ảnh', tags: ['Kỷ niệm'] },
  { slug: 'mau', title: 'Bảng màu quanh mình', content: 'Nhặt sắc màu', category: 'Sáng tạo', tags: [] },
  { slug: 'nhap', title: 'Bản nháp ảnh', status: 'draft', category: 'Hình ảnh' }
];
assert.deepEqual(filterPosts(posts, 'anh ky niem').map(p => p.slug), ['anh']);
assert.deepEqual(filterPosts(posts, '', 'Sáng tạo').map(p => p.slug), ['mau']);
assert.equal(filterPosts(posts, 'không tìm thấy').length, 0);
assert.equal(filterPosts(posts).length, 2);
assert.deepEqual(articleBlocks('# Mở đầu\n\nDòng một\nDòng hai\n\n- Ý nhỏ\n- Ý khác\n\n> Chút nhớ\n### Kết'), [
  { type: 'h2', text: 'Mở đầu' }, { type: 'p', text: 'Dòng một Dòng hai' }, { type: 'li', text: 'Ý nhỏ' }, { type: 'li', text: 'Ý khác' }, { type: 'quote', text: 'Chút nhớ' }, { type: 'h3', text: 'Kết' }
]);
assert.deepEqual(articleBlocks('<img src=x onerror=alert(1)>'), [{ type: 'p', text: '<img src=x onerror=alert(1)>' }]);
assert.equal(safeCoverURL('/api/posts/1/cover.webp', '', 'http://localhost:4180'), 'http://localhost:4180/api/posts/1/cover.webp');
assert.equal(safeCoverURL('/api/cover.webp', 'https://api.example.test', 'https://blog.example.test'), 'https://api.example.test/api/cover.webp');
for (const url of ['javascript:alert(1)', 'data:image/svg+xml,x', 'https://tracker.example/a.webp', 'http://user:pass@localhost:4180/x']) {
  assert.equal(safeCoverURL(url, '', 'http://localhost:4180'), '');
}
console.log('PASS: Vietnamese search, reading time, published-post filtering, safe article blocks and cover origin.');
