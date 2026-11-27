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

// Trendshift (https://trendshift.io): bảng xếp hạng repo GitHub đang lên theo ngày/tuần. Trang công khai có sẵn
// JSON-LD ItemList (robots.txt cho phép đọc trang, chặn /api/ nên không gọi API). Trả về [{rank, name, github,
// trendshift, description, language, keywords}] theo thứ hạng; bỏ mục không có link github.com/owner/repo.
export function parseTrendshift(html) {
  const out = [];
  for (const match of String(html || '').matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let data;
    try { data = JSON.parse(match[1]); } catch { continue; }
    if (data?.['@type'] !== 'ItemList' || !Array.isArray(data.itemListElement)) continue;
    for (const entry of data.itemListElement) {
      const item = entry?.item || {}, github = String(item.codeRepository || item.url || '');
      const repo = /^https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/?$/.exec(github)?.[1];
      if (!repo || !/^https:\/\/trendshift\.io\/repositories\/\d+$/.test(String(entry.url || ''))) continue;
      out.push({ rank: Number(entry.position) || out.length + 1, name: repo, github: `https://github.com/${repo}`, trendshift: entry.url,
        description: String(item.description || '').trim(), language: String(item.programmingLanguage || ''), keywords: Array.isArray(item.keywords) ? item.keywords.map(String) : [] });
    }
  }
  return out.sort((a, b) => a.rank - b.rank);
}

// Repo không nên viết bài: công cụ gian lận/bẻ khóa/tấn công, phần mềm độc hại, lách bản quyền.
const RISKY_REPO = /\b(cheat|aimbot|wallhack|crack(ed|er)?|keygen|bypass|exploit|0day|hack(ing|tool)?|bughunt(er)?|pentest|red.?team|c2|rat|stealer|malware|ransom|spoof(er)?|injector|jailbreak|unlock(er)?|carding|phish(ing)?|ddos|botnet|piracy|warez|torrent|free.?(robux|vbucks))\b/i;
export function riskyRepo(text) { return RISKY_REPO.test(String(text || '').replace(/[_-]+/g, ' ')); }


// ---------- Ảnh minh họa trong bài ----------
// Bài gửi lên dùng chỗ đặt "![Chú thích](image:1)" trên một dòng riêng; hàm agent_publish_post lưu ảnh và thay
// bằng /api/media/<uuid>.webp. Ảnh đặt sau chương đầu tiên (trước tiêu đề "## " thứ hai), hoặc cuối bài nếu không có.
export function placeIllustration(content, caption, key = 1) {
  const alt = String(caption || 'Minh họa').replace(/[\[\]\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180) || 'Minh họa';
  const line = `![${alt}](image:${key})`;
  const text = String(content || '');
  const headings = [...text.matchAll(/^## .+$/gm)];
  if (headings.length < 2) return `${text.replace(/\s+$/, '')}\n\n${line}\n`;
  const at = headings[1].index;
  return `${text.slice(0, at).replace(/\s+$/, '')}\n\n${line}\n\n${text.slice(at)}`;
}

// SVG do Claude vẽ chỉ được là hình vẽ thuần: không script, không liên kết/tải tài nguyên ngoài, không ảnh nhúng.
export function safeSvg(svg) {
  const text = String(svg || '').trim();
  if (!/^<svg[\s>]/i.test(text) || !/<\/svg>\s*$/i.test(text) || text.length > 60000) return '';
  if (/<(script|foreignObject|image|iframe|use|a|style)\b|\bon\w+\s*=|(?:xlink:)?href\s*=|url\(\s*['"]?(?!#)|@import|javascript:|<!ENTITY|<!DOCTYPE/i.test(text)) return '';
  return text;
}

const escapeXml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
// Ảnh dự phòng luôn tạo được: thẻ "Bài này có gì" liệt kê các chương chính, tông kem/xanh tím/vàng của website.
export function outlineSvg(title, content) {
  const chapters = [...String(content || '').matchAll(/^## (.+)$/gm)].map(m => m[1].trim()).filter(h => !/^(Câu hỏi thường gặp|Kết luận|Nguồn tham khảo)/i.test(h)).slice(0, 6);
  const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
  const rows = chapters.map((h, i) => `<g transform="translate(90 ${250 + i * 66})"><circle cx="22" cy="-8" r="22" fill="#ffdc38"/><text x="22" y="0" font-size="22" font-weight="700" text-anchor="middle" fill="#303487">${i + 1}</text><text x="64" y="0" font-size="26" fill="#303487">${escapeXml(clip(h, 62))}</text></g>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${Math.max(675, 300 + chapters.length * 66)}" viewBox="0 0 1200 ${Math.max(675, 300 + chapters.length * 66)}" font-family="DejaVu Sans, Arial, sans-serif"><rect width="100%" height="100%" fill="#fbf2e3"/><rect x="24" y="24" width="1152" height="${Math.max(627, 252 + chapters.length * 66)}" rx="36" fill="none" stroke="#303487" stroke-width="4"/><text x="90" y="120" font-size="22" font-weight="700" letter-spacing="3" fill="#f0b400">BÀI NÀY CÓ GÌ</text><text x="90" y="178" font-size="38" font-weight="700" fill="#303487">${escapeXml(clip(String(title || ''), 52))}</text>${rows}</svg>`;
}
