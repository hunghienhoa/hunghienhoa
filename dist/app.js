// Trang chủ dạng blog: bài nổi bật ở hero, lưới bài mới có lọc theo chủ đề.
// Chỉ đọc /api/posts công khai; ảnh bìa chỉ nhận đường dẫn /api/ cùng nguồn. Lỗi mạng thì giữ lời mời ghé Góc tò mò.
document.documentElement.classList.add('js');
(() => {
  const API = (window.HUNG_API_BASE || '').replace(/\/$/, '');
  const list = document.querySelector('#home-posts'), feature = document.querySelector('#hero-feature');
  const filters = document.querySelector('#topic-filters'), status = document.querySelector('#posts-status');
  if (!list) return;
  const el = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text != null) node.textContent = text; return node; };
  const day = value => { const time = typeof value === 'number' ? value : Date.parse(value); return Number.isFinite(time) ? new Date(time).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''; };
  const minutes = text => Math.max(1, Math.ceil(String(text || '').trim().split(/\s+/u).filter(Boolean).length / 180));
  const cover = value => typeof value === 'string' && /^\/api\/[\w./-]+$/.test(value) ? API + value : '';
  const href = post => '/blog/?bai=' + encodeURIComponent(post.slug);
  const image = src => { const img = el('img'); img.src = src; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; return img; };
  const meta = post => {
    const box = el('span', 'post-meta-line');
    if (post.category) box.append(el('span', 'post-topic', post.category));
    const date = day(post.publishedAt ?? post.published_at);
    if (date) box.append(el('span', '', date));
    if (post.content) box.append(el('span', '', `${minutes(post.content)} phút đọc`));
    return box;
  };
  const card = (post, index) => {
    const item = el('li', 'post-card'), link = el('a', 'post-link');
    item.dataset.topic = post.category || '';
    link.href = href(post);
    const src = cover(post.coverUrl), media = el('span', 'post-media' + (src ? '' : ' no-cover tone-' + (index % 3)));
    media.setAttribute('aria-hidden', 'true');
    media.append(src ? image(src) : el('span', 'post-initial', (post.title || '✳').trim().charAt(0).toLocaleUpperCase('vi-VN')));
    const body = el('span', 'post-body');
    body.append(meta(post), el('b', 'post-title', post.title || 'Bài viết'), el('span', 'post-excerpt', post.excerpt || ''), (() => { const more = el('span', 'post-more', 'Đọc bài '), icon = el('span', 'ic ic-arrow-up-right'); icon.setAttribute('aria-hidden', 'true'); more.append(icon); return more; })());
    link.append(media, body);
    item.append(link);
    return item;
  };
  const showFeature = post => {
    if (!feature || !post) return;
    feature.href = href(post);
    const media = feature.querySelector('.hero-feature-media'), src = cover(post.coverUrl);
    if (src) { media.replaceChildren(image(src)); media.classList.add('has-cover'); }
    feature.querySelector('.hero-feature-meta').replaceChildren(meta(post));
    feature.querySelector('.hero-feature-title').textContent = post.title || 'Bài viết';
  };
  const empty = () => {
    const item = el('li', 'post-empty');
    item.append(el('b', '', 'Bài mới đang được viết.'), el('span', '', 'Ghé Góc tò mò để đọc những câu chuyện đã đăng nhé.'));
    list.replaceChildren(item);
    list.setAttribute('aria-busy', 'false');
  };
  const render = (posts, topic) => {
    const shown = posts.filter(post => !topic || post.category === topic);
    list.replaceChildren(...shown.map(card));
    list.setAttribute('aria-busy', 'false');
    if (status) status.textContent = `Hiển thị ${shown.length} bài viết.`;
  };
  const topics = posts => {
    const names = [...new Set(posts.map(post => post.category).filter(name => typeof name === 'string' && name.trim()))].slice(0, 6);
    if (!filters || names.length < 2) return;
    const buttons = [['', 'Tất cả'], ...names.map(name => [name, name])].map(([value, label]) => {
      const button = el('button', '', label);
      button.type = 'button'; button.dataset.topic = value; button.setAttribute('aria-pressed', String(!value));
      button.addEventListener('click', () => {
        buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        render(posts, value);
      });
      return button;
    });
    filters.replaceChildren(...buttons);
    filters.hidden = false;
  };
  fetch(API + '/api/posts', { credentials: 'omit' })
    .then(response => response.ok ? response.json() : Promise.reject(new Error(String(response.status))))
    .then(data => {
      const posts = Array.isArray(data?.posts) ? data.posts.filter(post => post && typeof post.slug === 'string' && /^[a-z0-9-]{1,120}$/.test(post.slug)) : [];
      if (!posts.length) return empty();
      showFeature(posts[0]);
      // Trang chủ chỉ hiện 6 bài mới (sau bài nổi bật); xem thêm ở Góc tò mò.
      const rest = (posts.length > 1 ? posts.slice(1) : posts).slice(0, 6);
      topics(rest);
      render(rest, '');
    })
    .catch(empty);
})();
