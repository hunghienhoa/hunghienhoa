export function fold(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLocaleLowerCase('vi-VN');
}

export function readingMinutes(content) {
  const words = String(content ?? '').trim().split(/\s+/u).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

export function filterPosts(posts, query = '', category = '') {
  const terms = fold(query).trim().split(/\s+/).filter(Boolean);
  return posts.filter(post => {
    if (!post || post.status === 'draft' || typeof post.slug !== 'string' || !post.slug || typeof post.title !== 'string') return false;
    if (category && post.category !== category) return false;
    const text = fold([post.title, post.excerpt, post.content, post.category, ...(Array.isArray(post.tags) ? post.tags : [])].join(' '));
    return terms.every(term => text.includes(term));
  });
}

export function articleBlocks(content) {
  const blocks = [];
  let paragraph = [];
  const flush = () => { if (paragraph.length) blocks.push({ type: 'p', text: paragraph.join(' ') }); paragraph = []; };
  for (const raw of String(content ?? '').slice(0, 100000).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) { flush(); blocks.push({ type: heading[1].length === 3 ? 'h3' : 'h2', text: heading[2] }); continue; }
    if (/^[-*]\s+/.test(line)) { flush(); blocks.push({ type: 'li', text: line.replace(/^[-*]\s+/, '') }); continue; }
    if (/^>\s?/.test(line)) { flush(); blocks.push({ type: 'quote', text: line.replace(/^>\s?/, '') }); continue; }
    paragraph.push(line);
  }
  flush();
  return blocks;
}

export function safeCoverURL(value, apiBase, pageOrigin) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const trustedOrigin = new URL(apiBase || pageOrigin).origin;
    const url = new URL(value, apiBase || pageOrigin);
    return ['http:', 'https:'].includes(url.protocol) && url.origin === trustedOrigin && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}
