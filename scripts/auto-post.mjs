#!/usr/bin/env node
// Pipeline đăng bài tự động cho hunghienhoa.com (chạy trên GitHub Actions, 08:30 và 20:15 giờ Việt Nam).
//
// 1. Hỏi Worker (POST /api/agent/context, cần mã đăng bài): ngách đang bật có last_used_at cũ nhất, số bài hôm nay.
// 2. Gom ứng viên theo loại ngách: Trendshift (repo GitHub đang lên theo ngày/tuần) + GitHub Search (repo tạo trong
//    7 ngày, nhiều sao), Hacker News, RSS của ngách.
//    Mỗi chủ đề cần 2–3 nguồn độc lập (khác tên miền); URL đã dùng bị loại qua bảng crawled_sources.
// 3. Đọc nội dung nguồn qua Jina Reader (https://r.jina.ai/), rồi gọi Claude 3 lượt nối tiếp:
//    lượt 1 tiêu đề/meta/sapo + 3 chương đầu (JSON có cấu trúc), lượt 2 bốn chương chuyên sâu kèm bảng so sánh
//    và ví dụ kỹ thuật, lượt 3 ứng dụng thực tế + 5 câu hỏi thường gặp + kết luận. Thiếu số từ thì viết bù Case Study.
// 4. Ảnh bìa: Workers AI của website (/api/lamnet/ai) → WebP 1024x576; lỗi thì vẽ ảnh trừu tượng bằng SVG (không chữ).
//    Ảnh minh họa trong bài (bắt buộc ≥ 1): sơ đồ SVG Claude vẽ theo nội dung bài, dự phòng là thẻ tóm tắt các chương.
// 5. Đăng qua POST /api/agent/publish: Supabase kiểm tra mã, giới hạn 2 bài/ngày, chống trùng nguồn,
//    ghi crawled_sources, cập nhật last_used_at; Worker tự xóa cache trang blog.
//
// Biến môi trường: xem scripts/.env.example. DRY_RUN=1 làm mọi bước trừ đăng, ghi bài ra scripts/out/.
import Anthropic from '@anthropic-ai/sdk';
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import {
  MIN_WORDS_DEFAULT, countWords, slugify, parseFeed, corroborate, domainOf, matchesKeywords,
  assembleArticle, trimSource, vietnamDate, significantTerms, parseTrendshift, riskyRepo,
  placeIllustration, safeSvg, outlineSvg
} from './auto-blog-lib.mjs';

const SITE = (process.env.SITE_URL || 'https://hunghienhoa.com').replace(/\/$/, '');
const TOKEN = process.env.AGENT_PUBLISH_TOKEN || '';
const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-5-5';
const EFFORT = process.env.CLAUDE_EFFORT || 'medium';
const MIN_WORDS = Number(process.env.MIN_WORDS) || MIN_WORDS_DEFAULT;
const DRY_RUN = /^(1|true|yes)$/i.test(process.env.DRY_RUN || '');
const UA = 'hunghienhoa-auto-blog/1.0 (+https://hunghienhoa.com/blog/)';
const log = (...args) => console.log(new Date().toISOString(), ...args);

class Skip extends Error {}

async function getText(url, { headers = {}, timeout = 25000 } = {}) {
  const response = await fetch(url, { headers: { 'User-Agent': UA, ...headers }, signal: AbortSignal.timeout(timeout), redirect: 'follow' });
  if (!response.ok) throw new Error(`${url} → HTTP ${response.status}`);
  return response.text();
}
async function getJson(url, options) { return JSON.parse(await getText(url, options)); }

async function siteApi(path, body) {
  const response = await fetch(SITE + path, {
    method: 'POST', signal: AbortSignal.timeout(60000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}`, 'User-Agent': UA },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(`${path} → HTTP ${response.status}: ${data?.error || ''}`), { status: response.status, data });
  return data;
}

// ---------- 2. Thu thập ứng viên ----------
async function hackerNews(query = '', days = 3) {
  const since = Math.floor(Date.now() / 1000) - days * 86400;
  const url = query
    ? `https://hn.algolia.com/api/v1/search?tags=story&hitsPerPage=20&numericFilters=created_at_i>${since}&query=${encodeURIComponent(query)}`
    : `https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=40`;
  const data = await getJson(url).catch(error => { log('HN lỗi:', error.message); return { hits: [] }; });
  return (data.hits || []).filter(h => h.title).map(h => ({
    title: h.title, url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
    discussion: `https://news.ycombinator.com/item?id=${h.objectID}`, points: h.points || 0, date: (h.created_at_i || 0) * 1000
  }));
}

async function feeds(urls) {
  const all = await Promise.all((urls || []).map(async url => {
    try { return parseFeed(await getText(url)); } catch (error) { log('RSS lỗi:', url, error.message); return []; }
  }));
  return all.flat();
}

// Repo đang hot lấy từ Trendshift (bảng xếp hạng theo ngày + theo tuần), xếp trước; GitHub Search (repo mới
// trong 7 ngày, nhiều sao) làm nguồn dự phòng. Mỗi repo cần ≥ 2 nguồn khác tên miền: GitHub + trang Trendshift của
// repo (hoặc trang chủ dự án / thảo luận Hacker News).
async function trendshiftRepos() {
  const lists = await Promise.all(['https://trendshift.io/', 'https://trendshift.io/weekly'].map(url =>
    getText(url, { headers: { Accept: 'text/html' } }).then(parseTrendshift).catch(error => { log('Trendshift lỗi:', url, error.message); return []; })));
  const seen = new Set(), out = [];
  for (const item of lists.flat().sort((a, b) => a.rank - b.rank)) if (!seen.has(item.name.toLowerCase())) { seen.add(item.name.toLowerCase()); out.push(item); }
  log(`Trendshift: ${out.length} repo đang lên.`);
  return out;
}

async function githubCandidates(niche) {
  const headers = { Accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) };
  const since = vietnamDate(Date.now() - 7 * 86400_000);
  const search = await getJson(`https://api.github.com/search/repositories?q=${encodeURIComponent(`created:>=${since} stars:>=40 archived:false`)}&sort=stars&order=desc&per_page=40`, { headers })
    .catch(error => { log('GitHub Search lỗi:', error.message); return { items: [] }; });
  const trending = (await trendshiftRepos()).filter(t => t.description && !riskyRepo(`${t.name} ${t.description}`));
  const byName = new Map((search.items || []).map(r => [r.full_name.toLowerCase(), r]));
  const picks = [];
  for (const t of trending.slice(0, 15)) {
    const repo = byName.get(t.name.toLowerCase()) || await getJson(`https://api.github.com/repos/${t.name}`, { headers }).catch(() => null);
    if (repo) picks.push({ repo, trend: t });
  }
  for (const repo of search.items || []) if (!picks.some(p => p.repo.full_name.toLowerCase() === repo.full_name.toLowerCase())) picks.push({ repo, trend: null });
  const out = [];
  for (const { repo, trend } of picks) {
    if (out.length >= 12) break;
    const text = `${repo.full_name} ${repo.description || ''} ${(repo.topics || []).join(' ')} ${(trend?.keywords || []).join(' ')}`;
    if (repo.fork || repo.archived || (trend ? repo.stargazers_count < 100 : false) || riskyRepo(text) || !matchesKeywords(text, niche.keywords)) continue;
    const sources = [{ title: `${repo.full_name} trên GitHub (${repo.stargazers_count} sao)`, url: repo.html_url }];
    if (trend) sources.push({ title: `${repo.full_name} trên Trendshift (hạng ${trend.rank} repo đang lên)`, url: trend.trendshift });
    if (repo.homepage && /^https?:\/\//.test(repo.homepage) && !['github.com', 'trendshift.io'].includes(domainOf(repo.homepage))) sources.push({ title: `Trang chủ ${repo.name}`, url: repo.homepage });
    if (sources.length < 3) {
      const hn = (await hackerNews(repo.full_name, 10)).find(h => h.url.includes(repo.full_name) || h.title.toLowerCase().includes(repo.name.toLowerCase()));
      if (hn) sources.push({ title: `Thảo luận trên Hacker News: ${hn.title}`, url: hn.discussion });
    }
    if (sources.length >= 2) out.push({ topic: `${repo.full_name}${trend ? ` (Trendshift hạng ${trend.rank})` : ''}: ${repo.description || ''}`.slice(0, 300), sources: sources.slice(0, 3), extra: { readme: repo.full_name } });
  }
  return out;
}

async function newsCandidates(niche) {
  const fresh = Date.now() - 4 * 86400_000;
  const pool = [...await feeds(niche.rss_sources), ...await hackerNews()].filter(item => !item.date || item.date >= fresh);
  const relevant = pool.filter(item => matchesKeywords(item.title, niche.keywords));
  const out = [];
  for (const candidate of relevant.slice(0, 25)) {
    let group = corroborate(candidate, pool);
    if (!group) {
      // Tìm thêm bài cùng chủ đề trên Hacker News theo các từ khóa nổi bật của tiêu đề.
      const terms = [...significantTerms(candidate.title)].slice(0, 5).join(' ');
      if (terms) group = corroborate(candidate, [...pool, ...await hackerNews(terms, 4)]);
    }
    if (group) out.push({ topic: candidate.title, sources: group.map(item => ({ title: item.title, url: item.url })) });
    if (out.length >= 6) break;
  }
  return out;
}

async function readSource(source) {
  const headers = { Accept: 'text/plain', 'X-Return-Format': 'markdown', ...(process.env.JINA_API_KEY ? { Authorization: `Bearer ${process.env.JINA_API_KEY}` } : {}) };
  try { return trimSource(await getText(`https://r.jina.ai/${source.url}`, { headers, timeout: 45000 })); }
  catch (error) { log('Không đọc được nguồn:', source.url, error.message); return ''; }
}

async function readme(fullName) {
  try { return trimSource(await getText(`https://api.github.com/repos/${fullName}/readme`, { headers: { Accept: 'application/vnd.github.raw', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) } }), 15000); }
  catch { return ''; }
}

// ---------- 3. Viết bài với Claude ----------
const client = new Anthropic({ maxRetries: 4, timeout: 15 * 60 * 1000 });

async function ask(messages, system, extra = {}) {
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    thinking: { type: 'adaptive' },
    system,
    messages,
    ...extra,
    output_config: { effort: EFFORT, ...(extra.output_config || {}) }
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === 'refusal') throw new Skip(`Claude từ chối viết chủ đề này (${message.stop_details?.category || 'không rõ'}).`);
  if (message.stop_reason === 'max_tokens') throw new Error('Claude dừng vì hết max_tokens.');
  messages.push({ role: 'assistant', content: message.content });
  const text = message.content.filter(block => block.type === 'text').map(block => block.text).join('\n').trim();
  log(`Claude: ${message.usage.output_tokens} token ra, model ${message.model}`);
  return text;
}

const META_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['title', 'slug', 'excerpt', 'tags', 'sapo', 'chapters_markdown', 'cover_prompt'],
  properties: {
    title: { type: 'string', description: 'Tiêu đề tiếng Việt 40–110 ký tự, cụ thể, không giật tít' },
    slug: { type: 'string', description: 'chữ thường không dấu, nối bằng gạch ngang, tối đa 80 ký tự' },
    excerpt: { type: 'string', description: 'Meta description 140–280 ký tự, trung thực' },
    tags: { type: 'array', items: { type: 'string' }, description: '3–5 nhãn ngắn' },
    sapo: { type: 'string', description: 'Đoạn mở đầu 80–140 từ: vì sao chủ đề đáng quan tâm lúc này, kèm dữ kiện từ nguồn' },
    chapters_markdown: { type: 'string', description: 'Ba chương đầu, mỗi chương bắt đầu bằng "## Tiêu đề chương"' },
    cover_prompt: { type: 'string', description: 'Một câu tiếng Anh mô tả ảnh minh họa editorial, ấm áp, không chữ, không logo, không người thật' }
  }
};

function systemPrompt(niche) {
  return [
    'Bạn là chuyên gia phân tích công nghệ người Việt, viết cho blog "Góc tò mò của Hùng" (hunghienhoa.com).',
    `Giọng văn của ngách "${niche.name}": ${niche.system_tone || 'rõ ràng, thực tế, có góc nhìn riêng.'}`,
    'Nguyên tắc bắt buộc:',
    '- Tổng hợp và phân tích lại từ TẤT CẢ các nguồn được cung cấp, viết hoàn toàn bằng lời của bạn. Không dịch hay chép lại một nguồn; trích nguyên văn tối đa một câu ngắn kèm tên nguồn.',
    '- Chỉ dùng dữ kiện có trong nguồn. Không bịa số liệu, trích dẫn, tên sản phẩm, ngày tháng hay đường dẫn. Điều chưa chắc thì nói thận trọng và ghi "tính đến ngày …".',
    '- Tiếng Việt tự nhiên, có dấu, không sáo rỗng, không nhồi từ khóa, không lặp ý giữa các chương. Mỗi chương phải thêm thông tin hoặc phân tích mới.',
    '- Định dạng markdown của blog: "## Chương", "### Mục nhỏ", đoạn văn, "- " gạch đầu dòng, "1. " danh sách số, "> " trích dẫn, bảng markdown |…|, khối mã ```, **đậm**, *nghiêng*, [chữ](https://…). Không dùng HTML, không chèn ảnh, không viết tiêu đề cấp 1 (#).',
    '- Không viết mục "Nguồn tham khảo": hệ thống tự thêm cuối bài.'
  ].join('\n');
}

async function writeArticle(niche, topic, sources, extraContext, recentTitles) {
  const system = systemPrompt(niche);
  const material = sources.map((s, i) => `<nguon so="${i + 1}" tieu_de="${s.title.replace(/"/g, "'")}" url="${s.url}">\n${s.text || '(không đọc được nội dung, chỉ dùng tiêu đề)'}\n</nguon>`).join('\n\n');
  const messages = [{
    role: 'user',
    content: `Hôm nay là ${vietnamDate()} (giờ Việt Nam). Chủ đề: ${topic}\n\nTư liệu từ ${sources.length} nguồn độc lập:\n\n${material}${extraContext ? `\n\n<tu_lieu_them>\n${extraContext}\n</tu_lieu_them>` : ''}\n\nCác bài đã có trên blog (không viết trùng góc độ): ${recentTitles.slice(0, 25).join(' | ')}\n\nLƯỢT 1/3: trả về JSON theo schema: tiêu đề, slug, meta (excerpt), 3–5 tags, sapo, và BA chương đầu (bối cảnh, bản chất vấn đề, điều thật sự mới) — mỗi chương 350–500 từ, có ít nhất một mục ### hoặc danh sách.`
  }];
  const meta = JSON.parse(await ask(messages, system, { output_config: { format: { type: 'json_schema', schema: META_SCHEMA } } }));
  messages.push({ role: 'user', content: 'LƯỢT 2/3: viết tiếp BỐN chương chuyên sâu (mỗi chương 350–500 từ), nối mạch với ba chương trước. Bắt buộc có: một bảng so sánh markdown (ít nhất 4 dòng, 3 cột) và một ví dụ kỹ thuật cụ thể (khối mã, lệnh hoặc quy trình từng bước) bám sát tư liệu. Chỉ trả về markdown của bốn chương.' });
  const deep = await ask(messages, system);
  messages.push({ role: 'user', content: 'LƯỢT 3/3: viết "## Ứng dụng thực tế" (tình huống cụ thể cho người dùng, lập trình viên hoặc doanh nghiệp Việt Nam), "## Câu hỏi thường gặp" gồm đúng 5 câu (mỗi câu là "### Câu hỏi?" rồi câu trả lời 60–120 từ), và "## Kết luận" có góc nhìn riêng. Chỉ trả về markdown.' });
  const closing = await ask(messages, system);
  const parts = [meta.chapters_markdown, deep];
  let article = assembleArticle({ sapo: meta.sapo, parts: [...parts, closing], sources });
  for (let attempt = 1; countWords(article) < MIN_WORDS && attempt <= 2; attempt++) {
    log(`Mới ${countWords(article)} từ, viết bù Case Study (lần ${attempt}).`);
    messages.push({ role: 'user', content: `Bài hiện khoảng ${countWords(article)} từ, cần tối thiểu ${MIN_WORDS}. Viết thêm MỘT chương "## Case study: …" (500–700 từ) phân tích một tình huống áp dụng cụ thể dựa trên tư liệu, có số liệu hoặc bước làm rõ ràng, không lặp lại nội dung đã viết. Chỉ trả về markdown của chương này.` });
    parts.push(await ask(messages, system));
    article = assembleArticle({ sapo: meta.sapo, parts: [...parts, closing], sources });
  }
  const words = countWords(article);
  if (words < MIN_WORDS) throw new Skip(`Bài chỉ đạt ${words}/${MIN_WORDS} từ sau khi viết bù; không đăng.`);
  return { ...meta, content: article, words };
}

// ---------- 3b. Ảnh minh họa trong bài (bắt buộc ít nhất 1) ----------
// Claude vẽ một sơ đồ/infographic SVG tiếng Việt bám nội dung bài (cách hoạt động, quy trình, so sánh); SVG bị lọc
// chỉ còn hình vẽ thuần rồi chuyển WebP. Không được thì dùng thẻ "Bài này có gì" vẽ từ các chương, để bài luôn có ảnh.
const ILLUSTRATION_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['caption', 'svg'],
  properties: { caption: { type: 'string' }, svg: { type: 'string' } }
};
async function svgToWebp(svg) {
  const webp = await sharp(Buffer.from(svg)).resize({ width: 1200, withoutEnlargement: false }).flatten({ background: '#fbf2e3' }).webp({ quality: 86 }).toBuffer();
  if (webp.subarray(0, 4).toString() !== 'RIFF' || webp.subarray(8, 12).toString() !== 'WEBP' || webp.length > 900_000) throw new Error('Ảnh minh họa WebP chưa hợp lệ.');
  return webp;
}
async function makeIllustration(post) {
  try {
    const messages = [{ role: 'user', content: `Bài viết tiếng Việt dưới đây cần MỘT hình minh họa đặt sau chương đầu. Vẽ một sơ đồ hoặc infographic SVG giúp người đọc hiểu nhanh ý chính (ví dụ: cách công cụ hoạt động, các bước quy trình, so sánh lựa chọn) — chỉ dùng dữ kiện có trong bài.\nYêu cầu SVG: thẻ gốc <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">; nền #fbf2e3, chữ và nét #303487, điểm nhấn #ffdc38 (chữ vàng trên nền kem dùng #f0b400); font-family="DejaVu Sans, Arial, sans-serif"; chữ tiếng Việt có dấu, cỡ ≥ 20px, tối đa khoảng 12 nhãn ngắn, không chữ tràn khung, các khối không chồng lên nhau; chỉ dùng rect, circle, ellipse, line, polyline, polygon, path, text, tspan, g, defs, marker, linearGradient, stop; KHÔNG script, style, image, foreignObject, use, liên kết hay tài nguyên ngoài; không logo, không vẽ người thật.\ncaption: chú thích tiếng Việt 6–18 từ mô tả đúng nội dung hình.\n\nTiêu đề: ${post.title}\n\n${post.content.slice(0, 14000)}` }];
    const result = JSON.parse(await ask(messages, 'Bạn là họa sĩ thông tin (information designer) của blog hunghienhoa.com, vẽ sơ đồ SVG sạch, rõ, đúng dữ kiện.', { output_config: { format: { type: 'json_schema', schema: ILLUSTRATION_SCHEMA } } }));
    const svg = safeSvg(result.svg);
    if (!svg) throw new Error('SVG có thành phần không an toàn hoặc sai định dạng.');
    const image = await svgToWebp(svg);
    log('Ảnh minh họa: sơ đồ SVG do Claude vẽ');
    return { caption: result.caption, image };
  } catch (error) {
    log('Sơ đồ minh họa chưa được, dùng thẻ tóm tắt chương:', error.message);
    return { caption: `Các phần chính của bài: ${post.title}`, image: await svgToWebp(outlineSvg(post.title, post.content)) };
  }
}

// ---------- 4. Ảnh bìa ----------
async function coverFromAi(prompt) {
  const response = await fetch(`${SITE}/api/lamnet/ai`, {
    method: 'POST', signal: AbortSignal.timeout(120000),
    headers: { 'Content-Type': 'application/json', Origin: SITE, 'User-Agent': UA },
    body: JSON.stringify({ mode: 'generate', prompt: `${prompt}. Editorial illustration, warm cream, indigo and yellow palette, no text, no logo.`.slice(0, 900) })
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!response.ok || !(bytes[0] === 0xff && bytes[1] === 0xd8)) throw new Error(`Ảnh AI lỗi HTTP ${response.status}`);
  return bytes;
}
function coverSvg(seed) {
  let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const r = n => (h = (h * 1103515245 + 12345) >>> 0) % n;
  const shapes = Array.from({ length: 7 }, (_, i) => `<circle cx="${r(1024)}" cy="${r(576)}" r="${60 + r(180)}" fill="${['#ffdc38', '#303487', '#fbf2e3', '#dcddf3'][i % 4]}" opacity="${(0.35 + r(50) / 100).toFixed(2)}"/>`).join('');
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="576" viewBox="0 0 1024 576"><rect width="1024" height="576" fill="#fbf2e3"/>${shapes}<rect x="0" y="0" width="1024" height="576" fill="none" stroke="#303487" stroke-width="18"/></svg>`);
}
async function makeCover(prompt, seed) {
  let input;
  try { input = await coverFromAi(prompt); log('Ảnh bìa: Workers AI'); }
  catch (error) { log('Ảnh bìa AI chưa được, dùng ảnh SVG:', error.message); input = coverSvg(seed); }
  const webp = await sharp(input).resize(1024, 576, { fit: 'cover', position: 'centre' }).webp({ quality: 82 }).toBuffer();
  if (webp.subarray(0, 4).toString() !== 'RIFF' || webp.subarray(8, 12).toString() !== 'WEBP' || webp.length > 900_000) throw new Error('Ảnh bìa WebP chưa hợp lệ.');
  return webp;
}

// ---------- Luồng chính ----------
async function main() {
  if (!TOKEN) throw new Skip('Chưa có AGENT_PUBLISH_TOKEN.');
  if (!process.env.ANTHROPIC_API_KEY) throw new Skip('Chưa có ANTHROPIC_API_KEY.');
  const context = await siteApi('/api/agent/context', { urls: [] });
  if (!DRY_RUN && context.published_today >= 2) throw new Skip('Hôm nay đã đủ 2 bài.');
  const niche = context.niche;
  if (!niche) throw new Skip('Chưa có ngách nào đang bật.');
  log(`Ngách: ${niche.name} (${niche.category_type})`);

  const candidates = niche.category_type === 'github_trending' ? await githubCandidates(niche) : await newsCandidates(niche);
  const urls = [...new Set(candidates.flatMap(c => c.sources.map(s => s.url)))];
  const fresh = new Set((await siteApi('/api/agent/context', { urls })).new_urls || []);
  const usable = candidates.filter(c => c.sources.every(s => fresh.has(s.url)));
  log(`${candidates.length} ứng viên, ${usable.length} chưa dùng nguồn.`);
  if (!usable.length) throw new Skip('Không có chủ đề nào đủ 2 nguồn độc lập chưa dùng.');

  for (const candidate of usable.slice(0, 3)) {
    const sources = (await Promise.all(candidate.sources.map(async s => ({ ...s, text: await readSource(s) }))));
    const readable = sources.filter(s => s.text.length > 400);
    const extra = candidate.extra?.readme ? await readme(candidate.extra.readme) : '';
    if (readable.length + (extra ? 1 : 0) < 2) { log('Bỏ ứng viên vì đọc được ít hơn 2 nguồn:', candidate.topic); continue; }
    log('Chủ đề:', candidate.topic);
    let post;
    try { post = await writeArticle(niche, candidate.topic, sources, extra, context.recent_titles || []); }
    catch (error) { if (error instanceof Skip) { log(error.message); continue; } throw error; }

    let slug = slugify(post.slug || post.title);
    const existing = await getJson(`${SITE}/api/posts`).catch(() => ({ posts: [] }));
    if ((existing.posts || []).some(p => p.slug === slug)) slug = `${slug}-${vietnamDate().replace(/-/g, '')}`.slice(0, 110);
    const cover = await makeCover(post.cover_prompt, slug);
    const illustration = await makeIllustration(post);
    const payload = {
      slug, title: post.title.slice(0, 160), excerpt: post.excerpt.slice(0, 480), content: placeIllustration(post.content, illustration.caption, 1),
      images: [{ key: '1', base64: illustration.image.toString('base64') }],
      category: niche.post_category || 'Góc nhìn', tags: (post.tags || []).slice(0, 5), status: 'published',
      cover_base64: cover.toString('base64'), niche_id: niche.id, word_count: post.words,
      sources_cited: candidate.sources.map(s => ({ title: s.title.slice(0, 290), url: s.url }))
    };
    if (DRY_RUN) {
      await mkdir(new URL('./out/', import.meta.url), { recursive: true });
      await writeFile(new URL('./out/post.md', import.meta.url), `# ${payload.title}\n\n${payload.content}\n`);
      await writeFile(new URL('./out/cover.webp', import.meta.url), cover);
      await writeFile(new URL('./out/image-1.webp', import.meta.url), illustration.image);
      await writeFile(new URL('./out/post.json', import.meta.url), JSON.stringify({ ...payload, cover_base64: `(${cover.length} byte)`, images: [{ key: '1', base64: `(${illustration.image.length} byte)` }] }, null, 2));
      log(`DRY_RUN: đã viết "${payload.title}" (${post.words} từ) vào scripts/out/, không đăng.`);
      return;
    }
    const result = await siteApi('/api/agent/publish', payload);
    log(`Đã đăng: ${SITE}/blog/?bai=${result.slug} (${post.words} từ)`);
    return;
  }
  throw new Skip('Không ứng viên nào viết được bài đạt chuẩn.');
}

main().catch(error => {
  if (error instanceof Skip) { log('Bỏ qua lượt này:', error.message); process.exitCode = 0; return; }
  if (error instanceof Anthropic.APIError) log(`Lỗi Claude API ${error.status}:`, error.message);
  else log('Lỗi:', error.message);
  process.exitCode = 1;
});
