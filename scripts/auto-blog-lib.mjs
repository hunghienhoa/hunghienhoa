// Hàm thuần dùng cho pipeline đăng bài tự động (không gọi mạng, không cần SDK) để kiểm thử được trong npm run check.

export const MIN_WORDS_DEFAULT = 2500;

// Đếm từ phần chữ của bài: bỏ khối mã, mã trong dòng, URL và ký hiệu markdown; một "từ" là cụm có chữ hoặc số.
export function countWords(markdown) {
  const prose = String(markdown || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[#>*_|[\]-]+/g, ' ');
  return prose.split(/\s+/).filter(token => /[\p{L}\p{N}]/u.test(token)).length;
}

export function slugify(text, max = 80) {
  return String(text || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, max).replace(/-+$/g, '') || 'bai-viet';
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
export function decodeEntities(text) {
  return String(text || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, code) => {
      if (code[0] === '#') { const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10); return Number.isFinite(n) && n <= 0x10ffff ? String.fromCodePoint(n) : ''; }
      return ENTITIES[code.toLowerCase()] ?? match;
    })
    .replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// Đọc RSS 2.0 hoặc Atom bằng biểu thức chính quy đơn giản (không chạy mã từ nguồn).
export function parseFeed(xml, limit = 40) {
  const items = [];
  for (const [, block] of String(xml || '').matchAll(/<(?:item|entry)\b[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi)) {
    const tag = name => block.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, 'i'))?.[1];
    const title = decodeEntities(tag('title'));
    let url = decodeEntities(tag('link'));
    if (!/^https?:\/\//.test(url)) url = block.match(/<link\b[^>]*href="([^"]+)"/i)?.[1] || '';
    const date = Date.parse(decodeEntities(tag('pubDate') || tag('published') || tag('updated') || tag('dc:date') || ''));
    if (title && /^https?:\/\//.test(url)) items.push({ title: title.slice(0, 300), url: url.trim(), date: Number.isFinite(date) ? date : null });
    if (items.length >= limit) break;
  }
  return items;
}

const STOP = new Set('this that with from your have will what when where which their about into over more than they them been were just also only some such most very much many after before while today these those could would should there here new how why the and for are you our its'.split(' '));
export function significantTerms(text) {
  return new Set(String(text || '').toLowerCase().normalize('NFC').split(/[^\p{L}\p{N}.+#-]+/u)
    .map(t => t.replace(/^[.-]+|[.-]+$/g, '')).filter(t => t.length >= 4 && !STOP.has(t)));
}
export function overlap(a, b) {
  const left = significantTerms(a), right = significantTerms(b);
  let count = 0; for (const term of left) if (right.has(term)) count++;
  return count;
}
export function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}
export function matchesKeywords(text, keywords) {
  if (!keywords?.length) return true;
  const value = String(text || '').toLowerCase();
  return keywords.some(k => value.includes(String(k).toLowerCase()));
}

// Gom nguồn cho một ứng viên: các mục khác có tiêu đề trùng ít nhất 2 từ khóa và nằm ở tên miền khác.
export function corroborate(candidate, pool, { min = 2, max = 3 } = {}) {
  const chosen = [candidate], domains = new Set([domainOf(candidate.url)]);
  const ranked = pool.filter(item => item.url !== candidate.url && !domains.has(domainOf(item.url)))
    .map(item => ({ item, score: overlap(candidate.title, item.title) }))
    .filter(entry => entry.score >= 2).sort((a, b) => b.score - a.score);
  for (const { item } of ranked) {
    if (chosen.length >= max) break;
    if (domains.has(domainOf(item.url))) continue;
    chosen.push(item); domains.add(domainOf(item.url));
  }
  return chosen.length >= min ? chosen : null;
}

// Bỏ dòng "# Tiêu đề" (trang đọc đã hiển thị tiêu đề riêng) và khoảng trắng thừa.
export function cleanMarkdown(markdown) {
  return String(markdown || '').replace(/^\s*#\s+[^\n]*\n/, '').replace(/\n{3,}/g, '\n\n').trim();
}

export function assembleArticle({ sapo, parts, sources, disclosure = 'Bài viết được biên soạn với sự hỗ trợ của AI, tổng hợp và phân tích lại từ các nguồn công khai ở trên.' }) {
  const body = [String(sapo || '').trim(), ...parts.map(cleanMarkdown)].filter(Boolean).join('\n\n');
  const list = sources.map(s => `- [${String(s.title || domainOf(s.url)).replace(/[[\]]/g, '').slice(0, 200)}](${s.url})`).join('\n');
  return `${body}\n\n## Nguồn tham khảo & Tài liệu kỹ thuật\n\n${list}\n\n*${disclosure}*`;
}

export function trimSource(text, max = 12000) {
  const value = String(text || '').replace(/\n{3,}/g, '\n\n').trim();
  return value.length > max ? value.slice(0, max) + '\n[…phần còn lại của nguồn được lược bớt…]' : value;
}

// Thời điểm theo giờ Việt Nam, để chọn khung giờ và đặt hậu tố slug khi trùng.
export function vietnamDate(now = Date.now()) {
  return new Date(now + 7 * 3600_000).toISOString().slice(0, 10);
}
