import { readingMinutes, filterPosts, articleBlocks, inlineTokens, safeCoverURL } from './core.mjs?v=media-5';

const $ = selector => document.querySelector(selector);
const API = String(window.HUNG_API_BASE || '').replace(/\/$/, '');
// Hiện vài chủ đề nhiều bài nhất và một trang bài; phần còn lại mở bằng nút để không phải lướt qua cả bức tường lựa chọn.
const TOP_CATEGORIES = 7, PAGE_SIZE = 12;
const state = { posts: [], query: '', category: '', loaded: false, limit: PAGE_SIZE, allCategories: false };
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
  const counts = new Map();
  for (const post of state.posts) if (typeof post.category === 'string' && post.category) counts.set(post.category, (counts.get(post.category) || 0) + 1);
  const names = [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a));
  const shown = state.allCategories ? names : names.filter((name, index) => index < TOP_CATEGORIES || name === state.category);
  const buttons = ['', ...shown].map(name => {
    const button = element('button', '', name || 'Tất cả');
    button.type = 'button';
    button.setAttribute('aria-pressed', String(state.category === name));
    button.addEventListener('click', () => { state.category = name; state.limit = PAGE_SIZE; renderFeed(); });
    return button;
  });
  if (names.length > TOP_CATEGORIES) {
    const toggle = element('button', 'more-categories', state.allCategories ? 'Thu gọn chủ đề' : `Thêm chủ đề (+${names.length - shown.length})`);
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', String(!!state.allCategories));
    toggle.addEventListener('click', () => { state.allCategories = !state.allCategories; renderCategories(); $('.more-categories').focus(); });
    buttons.push(toggle);
  }
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
  $('#post-grid').replaceChildren(...cards.slice(0, state.limit).map(renderCard));
  $('#more-posts').hidden = cards.length <= state.limit;
  $('#more-posts').textContent = `Xem thêm bài viết (${cards.length - Math.min(state.limit, cards.length)})`;
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
    if($('#featured').childElementCount||$('#post-grid').childElementCount){
      $('#post-grid').setAttribute('aria-busy','false');
      $('#feed-message').hidden=true;
      return;
    }
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
    else {const child=element(token.type,'',token.text);if(token.type==='a'){child.href=token.href;child.target='_blank';child.rel=/^https?:\/\/(?:[\w-]+\.)*hunghienhoa\.com(?:\/|$)/.test(token.href)?'noopener noreferrer':'nofollow noopener noreferrer';}node.append(child);}
  }
}
function renderBody(content) {
  const nodes = [];
  let list;
  for (const block of articleBlocks(content)) {
    if(block.type==='image') {
      list=null;
      const figure=element('figure','article-image'),image=element('img');
      image.src=safeCoverURL(block.src,API,location.origin);image.alt=block.text;image.loading='lazy';image.decoding='async';
      figure.append(image);if(block.text)figure.append(element('figcaption','',block.text));nodes.push(figure);continue;
    }
    if(block.type==='download') {
      list=null;
      const box=element('p','article-download'),link=element('a','download-btn');
      link.href=block.href;link.target='_blank';link.rel='nofollow noopener noreferrer';
      link.append(element('span','download-icon','↓'),document.createTextNode(block.text));link.firstChild.setAttribute('aria-hidden','true');
      box.append(link);nodes.push(box);continue;
    }
    if (block.type === 'table') {
      list=null;
      const box=element('div','article-table'),table=element('table'),head=element('thead'),body=element('tbody'),headRow=element('tr');
      for(const cell of block.header){const th=element('th');appendInline(th,cell);headRow.append(th);}
      head.append(headRow);
      for(const row of block.rows){const tr=element('tr');for(const cell of row){const td=element('td');appendInline(td,cell);tr.append(td);}body.append(tr);}
      table.append(head,body);box.append(table);nodes.push(box);continue;
    }
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
  const rendered=$('#article').dataset.renderedSlug===slug;
  $('#intro').hidden = true;
  $('#bai-viet').hidden = true;
  $('.ribbon-shell').hidden = true;
  $('#reader').hidden = false;
  if(!rendered)$('#article').hidden = true;
  $('#reader-message').textContent = rendered?'':'Đang mở câu chuyện…';
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
    if(rendered){$('#reader-message').textContent='';return;}
    $('#reader-message').textContent = 'Chưa mở được bài viết này. Bài có thể chưa được đăng, địa chỉ đã đổi hoặc kết nối đang gián đoạn. Bạn có thể trở về danh sách để chọn trang khác.';
    document.title = `Chưa mở được bài viết — ${blogName}`;
  }
}

$('#search-form').addEventListener('submit', event => { event.preventDefault(); state.query = $('#search').value; state.limit = PAGE_SIZE; renderFeed(); });
$('#search').addEventListener('input', () => { state.query = $('#search').value; state.limit = PAGE_SIZE; if (state.loaded) renderFeed(); });
$('#clear-filters').addEventListener('click', () => { state.query = ''; state.category = ''; state.limit = PAGE_SIZE; $('#search').value = ''; renderFeed(); });
$('#more-posts').addEventListener('click', () => { const first = state.limit; state.limit += PAGE_SIZE; renderFeed(); $('#post-grid').children[first]?.focus(); });
$('#retry').addEventListener('click', loadPosts);
$('#list-nav').href='./#bai-viet';

getJSON('/api/site').then(site => {
  if (typeof site.blogTitle === 'string' && site.blogTitle.trim()) {
    blogName = site.blogTitle.trim().slice(0, 120);
    // Tiêu đề kiểu lockup: phần đầu chữ nhỏ, phần cuối ("của Hùng" hoặc hai chữ cuối) thành cụm nghiêng lớn.
    const words = blogName.split(/\s+/), at = blogName.search(/\s(của|cùng|với)\s/i);
    const head = at > 0 ? blogName.slice(0, at) : words.length > 2 ? words.slice(0, -2).join(' ') : '';
    const tail = head ? blogName.slice(head.length).trim() : blogName;
    const em = document.createElement('em'); em.textContent = tail;
    $('#blog-title').replaceChildren(...(head ? [document.createTextNode(head + ' ')] : []), em);
    if ($('#reader').hidden) document.title = `${blogName} — Những điều thú vị`;
  }
  if (typeof site.blogIntro === 'string' && site.blogIntro.trim()) $('#blog-intro').textContent = site.blogIntro.trim().slice(0, 800);
  window.dispatchEvent(new Event('hung-content-ready'));
}).catch(() => {});

await loadPosts();
const slug = new URLSearchParams(location.search).get('bai');
if (slug) openArticle(slug);
