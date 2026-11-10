import { readingMinutes, filterPosts, articleBlocks, inlineTokens, safeCoverURL } from './core.mjs?v=2';

const $ = selector => document.querySelector(selector);
const API = String(window.HUNG_API_BASE || '').replace(/\/$/, '');
const state = { posts: [], query: '', category: '', loaded: false };
let blogName = 'Góc nhỏ của Hùng';
let articleRequest = 0;

function element(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== '') node.textContent = String(text);
  return node;
}

async function getJSON(path) {
  const response = await fetch(`${API}${path}`, { credentials: 'omit', cache: 'no-store', headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

function dateLabel(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function metadata(post) {
  const box = element('div', 'post-meta');
  box.append(element('span', 'category-label', post.category || 'Chuyện nhỏ'));
  const date = dateLabel(post.publishedAt);
  if (date) box.append(element('span', '', date));
  box.append(element('span', '', `${readingMinutes(post.content)} phút đọc`));
  if (post.isSample) box.append(element('span', 'sample-label', 'Bài viết mẫu'));
  return box;
}

function makeArt(post, index = 0) {
  const box = element('div', `post-art art-${index % 3}`);
  box.setAttribute('aria-hidden', 'true');
  const card = element('div', 'art-paper');
  card.append(element('span', '', 'MỘT TRANG NHỎ'));
  const image = element('img');
  image.src = ['assets/asterisk-blue-face.svg', 'assets/heart.svg', 'assets/star.svg'][index % 3];
  image.alt = '';
  card.append(image, element('b', '', ['MỘT Ý TƯỞNG HAY.', 'MỘT CHÚT NIỀM VUI.', 'MỘT GÓC NHÌN MỚI.'][index % 3]));
  box.append(card, element('span', 'art-number', String(index + 1).padStart(2, '0')));
  const cover = safeCoverURL(post.coverUrl, API, location.origin);
  if (cover) {
    const photo = element('img', 'post-cover');
    photo.alt = '';
    photo.loading = 'lazy';
    photo.addEventListener('load', () => box.classList.add('has-cover'));
    photo.addEventListener('error', () => photo.remove());
    photo.src = cover;
    box.append(photo);
  }
  return box;
}

function postLink(post, className) {
  const link = element('a', className);
  link.href = `?bai=${encodeURIComponent(post.slug)}`;
  link.setAttribute('aria-label', `Đọc bài viết ${post.title}`);
  link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button > 0) return;
    event.preventDefault();
    history.pushState(null, '', link.href);
    openArticle(post.slug);
  });
  return link;
}

function renderFeatured(post) {
  const link = postLink(post, 'featured-card');
  const copy = element('div', 'featured-copy');
  copy.append(element('span', 'eyebrow', 'MỞ TRANG NÀY TRƯỚC NHÉ'), metadata(post), element('h2', '', post.title));
  if (post.excerpt) copy.append(element('p', '', post.excerpt));
  const cta = element('span', 'read-link', 'Đọc tiếp câu chuyện');
  cta.append(element('span', '', '↗'));
  copy.append(cta);
  link.append(makeArt(post), copy);
  $('#featured').replaceChildren(link);
}

function renderCard(post, index) {
  const link = postLink(post, 'post-card');
  const copy = element('div', 'post-copy');
  copy.append(metadata(post), element('h3', '', post.title));
  if (post.excerpt) copy.append(element('p', '', post.excerpt));
  const cta = element('span', 'card-read', 'Mở trang viết');
  cta.append(element('span', '', '↗'));
  copy.append(cta);
  link.append(makeArt(post, index + 1), copy);
  return link;
}

function message(title, body, action = '') {
  $('#message-title').textContent = title;
  $('#message-body').textContent = body;
  $('#feed-message').hidden = false;
  $('#retry').hidden = action !== 'retry';
  $('#clear-filters').hidden = action !== 'clear';
}

function renderCategories() {
  const names = [...new Set(state.posts.map(post => post.category).filter(value => typeof value === 'string' && value))];
  const buttons = ['', ...names].map(name => {
    const button = element('button', '', name || 'Tất cả');
    button.type = 'button';
    button.setAttribute('aria-pressed', String(state.category === name));
    button.addEventListener('click', () => { state.category = name; renderFeed(); });
    return button;
  });
  $('#categories').replaceChildren(...buttons);
}

function renderFeed() {
  renderCategories();
  const posts = filterPosts(state.posts, state.query, state.category);
  const useFeatured = !state.query.trim() && !state.category && posts.length > 0;
  $('#featured').hidden = !useFeatured;
  if (useFeatured) renderFeatured(posts[0]);
  else $('#featured').replaceChildren();
  const cards = useFeatured ? posts.slice(1) : posts;
  $('#post-grid').replaceChildren(...cards.map(renderCard));
  $('#post-grid').setAttribute('aria-busy', 'false');
  $('#result-count').textContent = `${posts.length} bài viết`;
  $('#feed-message').hidden = posts.length > 0;
  if (!posts.length && state.posts.length) message('Chưa gặp trang bạn đang tìm.', 'Thử một từ khác hoặc bỏ bớt chủ đề nhé.', 'clear');
  else if (!posts.length) message('Trang giấy đang chờ câu chuyện mới.', 'Chưa có bài viết được đăng. Hẹn bạn ghé lại góc nhỏ sau nhé.');
}

async function loadPosts() {
  $('#post-grid').setAttribute('aria-busy', 'true');
  message('Đang mở những trang viết…', 'Chờ một chút để góc nhỏ lấy các bài đã được đăng.');
  try {
    const data = await getJSON('/api/posts');
    if (!Array.isArray(data.posts)) throw new Error('invalid');
    state.posts = filterPosts(data.posts);
    state.loaded = true;
    renderFeed();
  } catch {
    $('#featured').hidden = true;
    $('#post-grid').replaceChildren();
    $('#post-grid').setAttribute('aria-busy', 'false');
    $('#result-count').textContent = '';
    message('Chưa mở được kho bài viết.', 'Kết nối hiện chưa sẵn sàng. Chưa có bài nào được tải; bạn có thể thử lại sau một chút.', 'retry');
  }
}

function appendInline(node,text) {
  for(const token of inlineTokens(text)) {
    if(token.type==='text')node.append(document.createTextNode(token.text));
    else {const child=element(token.type,'',token.text);if(token.type==='a'){child.href=token.href;child.target='_blank';child.rel='noopener noreferrer';}node.append(child);}
  }
}
function renderBody(content) {
  const nodes = [];
  let list;
  for (const block of articleBlocks(content)) {
    if (block.type === 'code') {
      list=null;
      const box=element('section','article-code'),bar=element('div','code-bar'),button=element('button','', 'Sao chép'),status=element('span','code-status');
      button.type='button';status.setAttribute('role','status');
      bar.append(element('span','',block.language||'Đoạn mã'),button,status);
      const pre=element('pre'),code=element('code','',block.text);pre.append(code);
      button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(block.text);status.textContent='Đã sao chép';}catch{status.textContent='Chưa sao chép được. Hãy chọn đoạn mã để sao chép.';}setTimeout(()=>{status.textContent='';},3000);});
      box.append(bar,pre);nodes.push(box);continue;
    }
    if (block.type === 'li' || block.type === 'oli') {
      if (!list || list.tagName.toLowerCase() !== (block.type==='oli'?'ol':'ul')) { list = element(block.type==='oli'?'ol':'ul'); nodes.push(list); }
      const item=element('li');appendInline(item,block.text);list.append(item);
    } else {
      list = null;
      const node=element(block.type === 'quote' ? 'blockquote' : block.type);appendInline(node,block.text);nodes.push(node);
    }
  }
  if (!nodes.length) nodes.push(element('p', '', 'Trang viết này chưa có nội dung.'));
  $('#article-body').replaceChildren(...nodes);
}

async function openArticle(slug) {
  const request = ++articleRequest;
  $('#intro').hidden = true;
  $('#bai-viet').hidden = true;
  $('.ribbon-shell').hidden = true;
  $('#reader').hidden = false;
  $('#article').hidden = true;
  $('#reader-message').textContent = 'Đang mở câu chuyện…';
  $('#reader').scrollIntoView({ behavior: 'instant', block: 'start' });
  try {
    let post = state.posts.find(item => item.slug === slug);
    if (!post) ({ post } = await getJSON(`/api/posts/${encodeURIComponent(slug)}`));
    if (!post || post.status === 'draft' || typeof post.title !== 'string' || typeof post.slug !== 'string') throw new Error('invalid');
    if (request !== articleRequest) return;
    $('#reader-title').textContent = post.title;
    $('#reader-excerpt').textContent = post.excerpt || '';
    $('#reader-excerpt').hidden = !post.excerpt;
    $('#reader-meta').replaceChildren(metadata(post));
    const cover = safeCoverURL(post.coverUrl, API, location.origin);
    $('#reader-cover').replaceChildren();
    if (cover) {
      const image = element('img', 'reader-image');
      image.alt = String(post.title);
      image.src = cover;
      image.addEventListener('error', () => image.remove());
      $('#reader-cover').append(image);
    }
    renderBody(post.content);
    $('#article-tags').replaceChildren(...(Array.isArray(post.tags) ? post.tags.filter(tag => typeof tag === 'string').map(tag => element('span', '', tag)) : []));
    $('#reader-message').textContent = '';
    $('#article').hidden = false;
    document.title = `${post.title} — ${blogName}`;
    $('#reader-title').tabIndex = -1;
    $('#reader-title').focus({ preventScroll: true });
  } catch {
    if (request !== articleRequest) return;
    $('#reader-message').textContent = 'Chưa mở được bài viết này. Bài có thể chưa được đăng, địa chỉ đã đổi hoặc kết nối đang gián đoạn. Bạn có thể trở về danh sách để chọn trang khác.';
    document.title = `Chưa mở được bài viết — ${blogName}`;
  }
}

function goList(updateURL = true) {
  articleRequest++;
  $('#intro').hidden = false;
  $('#bai-viet').hidden = false;
  $('.ribbon-shell').hidden = false;
  $('#reader').hidden = true;
  document.title = `${blogName} — Những điều thú vị`;
  if (updateURL) history.pushState(null, '', `${location.pathname}#bai-viet`);
  $('#bai-viet').scrollIntoView({ behavior: 'instant', block: 'start' });
}

$('#search-form').addEventListener('submit', event => { event.preventDefault(); state.query = $('#search').value; renderFeed(); });
$('#search').addEventListener('input', () => { state.query = $('#search').value; if (state.loaded) renderFeed(); });
$('#clear-filters').addEventListener('click', () => { state.query = ''; state.category = ''; $('#search').value = ''; renderFeed(); });
$('#retry').addEventListener('click', loadPosts);
$('#back-list').addEventListener('click', event => { event.preventDefault(); goList(); });
$('.reader-end').addEventListener('click', event => { event.preventDefault(); goList(); });
$('#list-nav').addEventListener('click', event => { if (!$('#reader').hidden) { event.preventDefault(); goList(); } });
window.addEventListener('popstate', () => { const slug = new URLSearchParams(location.search).get('bai'); if (slug) openArticle(slug); else goList(false); });

getJSON('/api/site').then(site => {
  if (typeof site.blogTitle === 'string' && site.blogTitle.trim()) {
    blogName = site.blogTitle.trim().slice(0, 120);
    $('#blog-title').textContent = blogName;
    if ($('#reader').hidden) document.title = `${blogName} — Những điều thú vị`;
  }
  if (typeof site.blogIntro === 'string' && site.blogIntro.trim()) $('#blog-intro').textContent = site.blogIntro.trim().slice(0, 800);
  window.dispatchEvent(new Event('hung-content-ready'));
}).catch(() => {});

await loadPosts();
const slug = new URLSearchParams(location.search).get('bai');
if (slug) openArticle(slug);
