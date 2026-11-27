import assert from 'node:assert/strict';
import test from 'node:test';
import { countWords, slugify, parseFeed, corroborate, assembleArticle, cleanMarkdown, matchesKeywords, trimSource, domainOf, parseTrendshift, riskyRepo } from '../scripts/auto-blog-lib.mjs';
import { articleBlocks } from '../dist/blog/core.mjs';
import worker from '../worker/index.mjs';

test('pipeline: đếm từ bỏ mã, URL và ký hiệu markdown; slug không dấu', () => {
  assert.equal(countWords('## Tiêu đề hay\n\nMột câu **rất** ngắn.\n\n```js\nconst x = 1;\n```\n[liên kết](https://a.com/x) https://b.com'), 9);
  assert.equal(slugify('Đường sắt Việt Nam: “tốc độ” 2026!'), 'duong-sat-viet-nam-toc-do-2026');
  assert.equal(slugify(''), 'bai-viet');
  assert.equal(cleanMarkdown('# Tiêu đề\n\n\n\nĐoạn'), 'Đoạn');
  assert.ok(matchesKeywords('New Claude model', ['claude']) && matchesKeywords('anything', []) && !matchesKeywords('Rust 2.0', ['claude']));
  assert.ok(trimSource('x'.repeat(20), 10).startsWith('xxxxxxxxxx\n[…'));
  assert.equal(domainOf('https://www.theverge.com/a'), 'theverge.com');
});

test('pipeline: đọc RSS/Atom và gom 2–3 nguồn độc lập cùng chủ đề', () => {
  const rss = '<rss><channel><item><title><![CDATA[OpenAI ships GPT agent toolkit]]></title><link>https://techcrunch.com/a</link><pubDate>Thu, 26 Nov 2026 10:00:00 GMT</pubDate></item></channel></rss>';
  const atom = '<feed><entry><title>Agent toolkit from OpenAI &amp; partners</title><link href="https://theverge.com/b"/><updated>2026-11-26T12:00:00Z</updated></entry></feed>';
  const [a] = parseFeed(rss), [b] = parseFeed(atom);
  assert.deepEqual([a.title, a.url, b.title, b.url], ['OpenAI ships GPT agent toolkit', 'https://techcrunch.com/a', 'Agent toolkit from OpenAI & partners', 'https://theverge.com/b']);
  const same = { title: 'OpenAI agent toolkit hands-on', url: 'https://techcrunch.com/c' };
  const group = corroborate(a, [a, b, same, { title: 'Rust 2.0 release', url: 'https://blog.rust-lang.org/x' }]);
  assert.deepEqual(group.map(x => x.url), ['https://techcrunch.com/a', 'https://theverge.com/b'], 'không lấy hai nguồn cùng tên miền');
  assert.equal(corroborate(a, [{ title: 'Unrelated news', url: 'https://x.com/1' }]), null);
});

test('pipeline: ghép bài có mục nguồn tham khảo; blog hiển thị được bảng markdown', () => {
  const md = assembleArticle({ sapo: 'Mở đầu.', parts: ['# Bỏ\n## Chương 1\nNội dung'], sources: [{ title: 'Nguồn [A]', url: 'https://a.com' }] });
  assert.match(md, /^Mở đầu\.\n\n## Chương 1/);
  assert.match(md, /## Nguồn tham khảo & Tài liệu kỹ thuật\n\n- \[Nguồn A\]\(https:\/\/a\.com\)/);
  const blocks = articleBlocks('| Tiêu chí | A |\n|---|:-:|\n| Giá | 0đ |\n\n| không phải | bảng |\nchữ');
  assert.deepEqual(blocks[0], { type: 'table', text: '', header: ['Tiêu chí', 'A'], rows: [['Giá', '0đ']] });
  assert.equal(blocks[1].type, 'p');
});

test('Worker: /api/agent/context chuyển mã và danh sách URL cho Supabase', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => { calls.push({ url: String(url), init }); return Response.json({ niche: { id: 1 }, published_today: 0, new_urls: [] }); });
  const env = { SUPABASE_URL: 'https://db.example.test', SUPABASE_PUBLISHABLE_KEY: 'pub' };
  const send = (auth, body) => worker.fetch(new Request('https://hunghienhoa.com/api/agent/context', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) }, body: JSON.stringify(body) }), env);
  assert.equal((await send(null, {})).status, 401);
  const ok = await send('Bearer ma-bi-mat', { urls: ['https://a.com/x', 'javascript:alert(1)', 42] });
  assert.equal(ok.status, 200);
  assert.equal(calls[0].url, 'https://db.example.test/rest/v1/rpc/agent_pipeline_context');
  assert.equal(calls[0].init.headers['x-agent-token'], 'ma-bi-mat');
  assert.deepEqual(JSON.parse(calls[0].init.body), { p_urls: ['https://a.com/x'] });
});

test('Worker: quản trị ngách cần đăng nhập, kiểm tra dữ liệu và trả thống kê số từ', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init = {}) => {
    const u = String(url); calls.push({ url: u, init });
    if (u.endsWith('/auth/v1/user')) return Response.json({ email: 'admin@example.test' });
    if (u.includes('/rest/v1/posts')) return Response.json([{ niche_id: 1, word_count: 2600, status: 'published' }, { niche_id: 1, word_count: 3000, status: 'draft' }]);
    if (u.includes('/rest/v1/ai_niches') && (init.method || 'GET') === 'GET') return Response.json([{ id: 1, name: 'Tin AI', slug: 'tin-ai', category_type: 'ai_news', keywords: ['AI'], rss_sources: [], system_tone: '', post_category: 'Góc nhìn', is_active: true, last_used_at: null }]);
    return Response.json([{ id: 2, name: 'Mới', slug: 'moi', category_type: 'tech_deep_dive', keywords: [], rss_sources: [], system_tone: '', post_category: 'Góc nhìn', is_active: false, last_used_at: null }]);
  });
  const env = { SUPABASE_URL: 'https://db.example.test', SUPABASE_PUBLISHABLE_KEY: 'pub', ADMIN_EMAIL: 'admin@example.test' };
  const call = (method, path, body) => worker.fetch(new Request('https://admin.hunghienhoa.com' + path, { method, headers: { Authorization: 'Bearer jwt', Origin: 'https://admin.hunghienhoa.com', 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) }), env);
  const list = await (await call('GET', '/api/admin/niches')).json();
  assert.deepEqual(list.niches[0].stats, { posts: 2, published: 1, totalWords: 5600, averageWords: 2800 });
  assert.equal((await call('POST', '/api/admin/niches', { name: 'Mới', slug: 'Có Dấu', category_type: 'tech_deep_dive' })).status, 400);
  assert.equal((await call('POST', '/api/admin/niches', { name: 'Mới', slug: 'moi', category_type: 'khac' })).status, 400);
  assert.equal((await call('POST', '/api/admin/niches', { name: 'Thủ thuật hay', slug: 'thu-thuat-hay', category_type: 'tips', post_category: 'Thủ thuật' })).status, 201);
  assert.equal((await call('POST', '/api/admin/niches', { name: 'Dựng video AI · Cài đặt', slug: 'video-ai-cai-dat', category_type: 'guide', post_category: 'Dựng video AI', rss_sources: 'https://github.com/openai/codex/releases.atom' })).status, 201);
  assert.equal((await call('POST', '/api/admin/niches', { name: 'Mới', slug: 'moi', category_type: 'tech_deep_dive', rss_sources: 'http://khong-an-toan.test/feed' })).status, 400);
  const created = await call('POST', '/api/admin/niches', { name: 'Mới', slug: 'moi', category_type: 'tech_deep_dive', keywords: 'rust, wasm\nrust', is_active: false });
  assert.equal(created.status, 201);
  const sent = JSON.parse(calls.at(-1).init.body);
  assert.deepEqual([sent.keywords, sent.is_active, sent.post_category], [['rust', 'wasm'], false, 'Góc nhìn']);
  assert.equal((await call('DELETE', '/api/admin/niches/2')).status, 200);
});

test('pipeline: đọc bảng repo đang lên của Trendshift (JSON-LD) và loại repo rủi ro', () => {
  const list = { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: [
    { '@type': 'ListItem', position: 2, url: 'https://trendshift.io/repositories/22', item: { name: 'acme/agent-kit', description: 'Toolkit cho AI agent', codeRepository: 'https://github.com/acme/agent-kit', programmingLanguage: 'TypeScript', keywords: ['AI agent'] } },
    { '@type': 'ListItem', position: 1, url: 'https://trendshift.io/repositories/11', item: { name: 'demo/fast-db', codeRepository: 'https://github.com/demo/fast-db' } },
    { '@type': 'ListItem', position: 3, url: 'https://evil.test/x', item: { codeRepository: 'https://github.com/bad/link' } },
    { '@type': 'ListItem', position: 4, url: 'https://trendshift.io/repositories/44', item: { codeRepository: 'javascript:alert(1)' } }
  ] };
  const html = `<script type="application/ld+json">{"@type":"WebSite"}</script><script type="application/ld+json">${JSON.stringify(list)}</script><script type="application/ld+json">{bad json</script>`;
  const items = parseTrendshift(html);
  assert.deepEqual(items.map(i => [i.rank, i.name, i.trendshift]), [[1, 'demo/fast-db', 'https://trendshift.io/repositories/11'], [2, 'acme/agent-kit', 'https://trendshift.io/repositories/22']]);
  assert.equal(items[1].github, 'https://github.com/acme/agent-kit');
  assert.deepEqual(items[1].keywords, ['AI agent']);
  assert.deepEqual(parseTrendshift(''), []);
  for (const name of ['someone/game-cheat-menu', 'x/Claude-BugHunter', 'y/wifi_cracker', 'z/discord-token-stealer']) assert.ok(riskyRepo(name), name);
  for (const name of ['nexu-io/opengame', 'pingdotgg/t3code', 'google-gemini/gemini-api-cli', 'acme/chat-ui']) assert.ok(!riskyRepo(name), name);
});
