// Nút chuyển Việt ⇄ English cho mọi trang công khai (không dùng cho trang quản trị).
// Văn bản gốc là tiếng Việt; bản English nằm trong i18n-en.js (chỉ tải khi chọn English) và được áp lên chữ đang hiển thị,
// kể cả chữ do script thêm vào sau. Nội dung bài viết do người dùng/CSDL không có trong từ điển thì giữ nguyên.
(() => {
  const root = document.documentElement, KEY = 'hh_lang', EDGE = /^(\s*)([\s\S]*?)(\s*)$/;
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE', 'SVG']);
  const ATTRS = ['aria-label', 'title', 'placeholder', 'alt'];
  let lang = 'vi', dict = null, loading = false, observer = null;
  const texts = new WeakMap(), attrs = new WeakMap();

  const cookieLang = () => (document.cookie.match(/(?:^|;\s*)hh_lang=(vi|en)/) || [])[1];
  const storedLang = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const save = value => {
    const domain = /(^|\.)hunghienhoa\.com$/.test(location.hostname) ? '; Domain=.hunghienhoa.com; Secure' : '';
    document.cookie = `${KEY}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${domain}`;
    try { localStorage.setItem(KEY, value); } catch { /* chỉ là tiện ích, không có cũng chạy */ }
  };
  const fromQuery = new URLSearchParams(location.search).get('lang');
  if (fromQuery === 'en' || fromQuery === 'vi') { lang = fromQuery; save(lang); }
  else lang = cookieLang() || (storedLang() === 'en' ? 'en' : 'vi');

  const norm = value => value.replace(/\s+/g, ' ').trim();
  const lookup = key => (dict && Object.prototype.hasOwnProperty.call(dict, key)) ? dict[key] : null;
  const PATTERNS = [
    [/^Hiển thị (\d+) thiết kế\.$/, n => `Showing ${n} designs.`],
    [/^\+(\d+) điểm$/, n => `+${n} points`],
    [/^Mẹo: (.+)$/, t => `Tip: ${t}`],
    [/^Đã sao chép mã WeChat: (.+)\.$/, id => `WeChat ID copied: ${id}.`],
    [/^Mã WeChat: (.+)\. Bạn có thể chọn và sao chép ID này\.$/, id => `WeChat ID: ${id}. You can select and copy this ID.`],
    [/^Đang tải AI lần đầu: (.+)$/, rest => `Downloading the AI for the first time: ${rest}`],
    [/^Còn (\d+) lượt AI đám mây hôm nay\.$/, n => `${n} cloud AI uses left today.`],
    [/^Đang làm nét: (\d+)% \(phần (\d+)\/(\d+)\)$/, (p, a, b) => `Sharpening: ${p}% (part ${a}/${b})`],
    [/^Ảnh gốc (\d+)×(\d+) được thu về (\d+)×(\d+) trước khi làm nét\.$/, (a, b, c, d) => `The original ${a}×${b} photo was scaled to ${c}×${d} before sharpening.`],
    [/^Kết quả (\d+)×(\d+) điểm ảnh, làm nét bởi AI đám mây\.$/, (a, b) => `Result ${a}×${b} pixels, sharpened by cloud AI.`],
    [/^Kết quả (\d+)×(\d+) điểm ảnh\.$/, (a, b) => `Result ${a}×${b} pixels.`],
    [/^Ảnh (\d+)×(\d+) điểm ảnh, tạo bởi AI đám mây\.$/, (a, b) => `${a}×${b} pixel image, created by cloud AI.`],
    [/^(.+?) Tự thử lại sau (\d+) giây…$/, (msg, n) => `${tr(msg) || msg} Retrying automatically in ${n} seconds…`],
    [/^(\d+) phút đọc$/, n => `${n} min read`],
    [/^(\d+) phút mỗi bên$/, n => `${n} min per side`],
    [/^Máy (\d+) · (Dễ|Vừa|Khó)$/, (n, l) => `Computer ${n} · ${tr(l) || l}`],
    [/^Máy (\d+)$/, n => `Computer ${n}`],
    [/^(\d+)\/(\d+) người$/, (a, b) => `${a}/${b} players`],
    [/^Ván (\d+)$/, n => `Game ${n}`],
    [/^(\d+) điểm · (\d+) quan$/, (a, b) => `${a} points · ${b} mandarin${b === '1' ? '' : 's'}`],
    [/^Chuồng (\d)\/4$/, n => `Home ${n}/4`],
    [/^(\d+) lá$/, n => `${n} cards`],
    [/^Nọc: (\d+) lá$/, n => `Stock: ${n} cards`],
    [/^(\d+) lá · vòng (\d+)\/(\d+)$/, (c, r, m) => `${c} cards · round ${r}/${m}`],
    [/^(\d+)\/(\d+) lá$/, (a, b) => `${a}/${b} cards`],
    [/^Rác: (\d+) điểm$/, n => `Deadwood: ${n} pts`],
    [/^(\d+)đ$/, n => `${n} pts`],
    [/^(.+) vừa đánh$/, who => `${tr(who) || who} just discarded`],
    [/^(.+) đang suy nghĩ…$/, who => `${tr(who) || who} is thinking…`],
    [/^(.+) đang nặn bài…$/, who => `${tr(who) || who} is flipping cards…`],
    [/^Tới lượt bạn: có thể Ăn lá (.+) hoặc Bốc nọc\.$/, c => `Your turn: you can Take ${tr(c) || c} or Draw from the stock.`],
    [/^Đã chọn (.+): bấm Đánh\.$/, c => `Selected ${tr(c) || c}: click Discard.`],
    [/^Gợi ý: đã chọn lá (.+), bấm Đánh\.$/, c => `Hint: selected ${tr(c) || c}, click Discard.`],
    [/^Nặn lá bài thứ (\d+)$/, n => `Flip card ${n}`],
    [/^(\d+) nút$/, n => `${n} pts`],
    [/^Bạn thắng! \((.+)\)$/, s => `You win! (${tr(s) || s})`],
    [/^(.+) thắng \((.+)\)$/, (w, s) => `${tr(w) || w} wins (${tr(s) || s})`],
    [/^(\d+) – (\d+) điểm$/, (a, b) => `${a} – ${b} points`],
    [/^(.+) · (\d+) – (\d+) điểm$/, (t, a, b) => `${tr(t) || t} · ${a} – ${b} points`],
    [/^(3|4|5|6|7|8|9|10|J|Q|K|A|2) (bích|chuồn|rô|cơ)$/, (r, s) => `${r} of ${{ 'bích': 'spades', 'chuồn': 'clubs', 'rô': 'diamonds', 'cơ': 'hearts' }[s]}`],
    [/^Nước đầu(?: tiên)? phải có lá (.+)\.$/, c => `The first play must include the ${tr(c) || c}.`],
    [/^Bạn đi đầu, nhớ đánh kèm lá (.+)\.$/, c => `You lead: remember to include the ${tr(c) || c}.`],
    [/^Sảnh (\d+)$/, n => `Straight of ${n}`],
    [/^Đôi thông (\d+) đôi$/, n => `${n} consecutive pairs`],
    [/^(.+) · (Rác|Đôi|Sám cô|Tứ quý|Sảnh \d+|Đôi thông \d+ đôi)$/, (who, t) => `${tr(who) || who} · ${tr(t) || t}`],
    [/^Vòng mới · (.+) đi tự do$/, who => `New round · ${tr(who) || who} leads`],
    [/^(.+) đang đánh…$/, who => `${tr(who) || who} is playing…`],
    [/^(.+) về nhất$/, who => `${tr(who) || who} finished first`],
    [/^Tới trắng: (.+)$/, why => `Instant win: ${tr(why) || why}`],
    [/^Ngựa (Đỏ|Xanh|Vàng|Lục): đổ xúc xắc\.$/, c => `${tr('Ngựa ' + c) || c}: roll the die.`],
    [/^Ngựa (Đỏ|Xanh|Vàng|Lục) được (\d): chạm con ngựa muốn đi\.$/, (c, d) => `${tr('Ngựa ' + c) || c} rolled ${d}: tap the horse to move.`],
    [/^Bạn đổ được (\d)\. Chạm con ngựa có khung vàng\.$/, d => `You rolled ${d}. Tap a horse with a yellow frame.`],
    [/^Đổ được (\d) nhưng không có ngựa nào đi được\.$/, d => `Rolled ${d}, but no horse can move.`],
    [/^Ngựa (Đỏ|Xanh|Vàng|Lục) thắng$/, c => `${tr('Ngựa ' + c) || c} win`],
    [/^(Về nhất|Về nhì|Về ba|Về bét): (.+)$/, (p, who) => `${tr(p) || p}: ${tr(who) || who}`],
    [/^Máy · (Dễ|Vừa|Khó)$/, l => `Computer · ${tr(l) || l}`],
    [/^(Đỏ thắng|Đen thắng|Hòa) · (.+)$/, (a, b) => `${tr(a) || a} · ${tr(b) || b}`],
    [/^Hiển thị (\d+) bài viết\.$/, n => `Showing ${n} posts.`],
    [/^Thêm chủ đề \(\+(\d+)\)$/, n => `More topics (+${n})`],
    [/^Xem thêm bài viết \((\d+)\)$/, n => `See more posts (${n})`],
    [/^(\d+) bài viết$/, n => `${n} posts`],
    [/^Chưa mở được bài viết — (.+)$/, name => `Couldn't open the post — ${tr(name) || name}`],
    [/^(.+) — Những điều thú vị$/, name => `${tr(name) || name} — Interesting things`],
    [/^Chụp lại ảnh (\d+)$/, n => `Retake photo ${n}`],
    [/^Ô (\d+), (chọn để thay ảnh|chưa có ảnh)$/, (n, s) => `Slot ${n}, ${s === 'chưa có ảnh' ? 'no photo yet' : 'tap to replace the photo'}`],
    [/^Dải ảnh xem trước: (\d+) trên 4 ảnh, khung (.+)\.$/, (n, f) => `Strip preview: ${n} of 4 photos, ${tr(f) || f} frame.`],
    [/^Ảnh chỉ ở bộ nhớ tạm và tự xóa lúc (.+), hoặc ngay khi rời trang\.$/, t => `Photos stay in temporary memory and clear themselves at ${t}, or as soon as you leave the page.`],
    [/^Chuẩn bị ảnh (\d+) trên 4\. Cười lên nào!$/, n => `Get ready for photo ${n} of 4. Smile!`],
    [/^Đã thêm (\d+) ảnh\. Chọn thêm hoặc bật máy ảnh để chụp tiếp\.$/, n => `Added ${n} photos. Choose more or turn on the camera to keep shooting.`],
    [/^Đã chọn ô ảnh (\d+)\. Chụp một tấm hoặc chọn ảnh từ máy để thay ô này\.$/, n => `Photo slot ${n} selected. Take a photo or choose one from your device to replace it.`],
    [/^Đã xóa ảnh (\d+)\. Bạn có thể thêm một khoảnh khắc khác vào ô này\.$/, n => `Photo ${n} removed. You can add another moment to this slot.`],
    [/^Khung có (\d+) ô: dùng ảnh theo thứ tự; từ ô thứ 5 sẽ lặp lại ảnh đầu\.$/, n => `This frame has ${n} slots: photos are used in order; from slot 5 the first photos repeat.`],
    [/^(\d+) ô ảnh$/, n => `${n} photo slots`],
    [/^Đã chọn (.+)\. Chỉ bản thiết kế khung sẽ được gửi\.$/, f => `Chosen ${f}. Only the frame design will be sent.`],
    [/^Dùng khung (.+)$/, f => `Use the ${tr(f) || f} frame`],
    [/^Đã chọn khung “(.+)”\.$/, f => `Frame “${tr(f) || f}” selected.`],
    [/^Chụp với khung (.+)$/, f => `Shoot with the ${tr(f) || f} frame`],
    [/^Đã gửi khung chờ duyệt\. Nếu chưa được duyệt, bản chờ và thông tin liên hệ sẽ tự xóa lúc (.+)\. Ảnh chụp không được gửi\.$/, t => `Frame sent for review. If it isn't approved, the pending entry and contact details delete themselves at ${t}. Your photos were not sent.`],
    [/^Không tải được tệp AI \((.*)$/, rest => `Couldn't load the AI file (${rest}`],
    [/^Bạn đã dùng đủ (\d+) lượt AI đám mây hôm nay\. Hãy quay lại vào ngày mai, hoặc dùng chế độ làm nét trên máy\.$/, n => `You've used all ${n} cloud AI uses today. Come back tomorrow, or use on-device sharpening.`],
    [/^Hãy mô tả ảnh muốn tạo, tối đa (.+) ký tự\.$/, n => `Describe the image you want to create, up to ${n} characters.`],
    [/^Một chút hay từ (.+)$/, p => `Something good from ${p}`],
    [/^(.+) · (\d+)$/, (name, n) => { const en = lookup(name); return en ? `${en} · ${n}` : null; }],
    [/^Xem thiết kế: (.+)$/, n => `View design: ${tr(n) || n}`]
  ];
  function tr(raw) {
    const key = norm(raw);
    if (!key) return null;
    const direct = lookup(key);
    if (direct) return direct;
    for (const [re, fn] of PATTERNS) { const m = key.match(re); if (m) return fn(...m.slice(1)); }
    const parts = key.split(/(?<=[.!?…])\s+/);
    if (parts.length > 1) {
      const out = parts.map(part => lookup(part) || (PATTERNS.map(([re, fn]) => { const m = part.match(re); return m && fn(...m.slice(1)); }).find(Boolean)));
      if (out.every(Boolean)) return out.join(' ');
    }
    return null;
  }

  function textNode(node) {
    const value = node.nodeValue, saved = texts.get(node);
    if (lang === 'en') {
      if (saved && saved.en === value) return;
      const [, lead, body, trail] = value.match(EDGE);
      const en = body && tr(body);
      if (en) { const next = lead + en + trail; texts.set(node, { vi: value, en: next }); node.nodeValue = next; }
    } else if (saved && saved.en === value) { node.nodeValue = saved.vi; texts.delete(node); }
  }
  function attr(element, name) {
    const value = element.getAttribute(name);
    if (value == null) return;
    let store = attrs.get(element); if (!store) attrs.set(element, store = {});
    const saved = store[name];
    if (lang === 'en') {
      if (saved && saved.en === value) return;
      const en = tr(value);
      if (en) { store[name] = { vi: value, en }; element.setAttribute(name, en); }
    } else if (saved && saved.en === value) { element.setAttribute(name, saved.vi); delete store[name]; }
  }
  function walk(node) {
    if (node.nodeType === 3) { if (!node.parentNode || !SKIP.has(node.parentNode.nodeName.toUpperCase())) textNode(node); return; }
    if (node.nodeType !== 1 || SKIP.has(node.nodeName.toUpperCase()) || node.hasAttribute('data-no-i18n')) return;
    for (const name of ATTRS) if (node.hasAttribute(name)) attr(node, name);
    if (node.nodeName === 'INPUT' && /^(button|submit)$/i.test(node.type)) attr(node, 'value');
    for (let child = node.firstChild; child; child = child.nextSibling) walk(child);
  }
  function head() {
    const title = document.title;
    if (title) {
      let saved = texts.get(document);
      if (lang === 'en') { if (!(saved && saved.en === title)) { const en = tr(title); if (en) texts.set(document, { vi: title, en }), document.title = en; } }
      else if (saved && saved.en === title) { document.title = saved.vi; texts.delete(document); }
    }
    document.querySelectorAll('meta[name="description"],meta[property^="og:"],meta[name^="twitter:"]').forEach(meta => {
      const value = meta.getAttribute('content');
      if (!value || /^(https?:|\/)/.test(value)) return;
      let store = attrs.get(meta); if (!store) attrs.set(meta, store = {});
      const saved = store.content;
      if (lang === 'en') { if (!(saved && saved.en === value)) { const en = tr(value); if (en) { store.content = { vi: value, en }; meta.setAttribute('content', en); } } }
      else if (saved && saved.en === value) { meta.setAttribute('content', saved.vi); delete store.content; }
    });
  }
  function apply() {
    root.lang = lang;
    head();
    if (document.body) walk(document.body);
    root.classList.remove('i18n-wait');
    syncButtons();
  }
  function observe() {
    if (observer || !document.body) return;
    observer = new MutationObserver(records => {
      if (lang !== 'en') return;
      for (const record of records) {
        if (record.type === 'characterData') textNode(record.target);
        else if (record.type === 'attributes') attr(record.target, record.attributeName);
        else record.addedNodes.forEach(walk);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  function loadDict(done) {
    if (dict) return done();
    if (loading) return;
    loading = true;
    // Số phiên bản ?v= nằm ngay trong đường dẫn để tools/asset-versions.mjs báo lỗi khi đổi từ điển mà quên tăng v.
    import('./i18n-en.js?v=17').then(module => { dict = module.default || {}; loading = false; done(); })
      .catch(() => { loading = false; root.classList.remove('i18n-wait'); });
  }

  const buttons = [];
  function syncButtons() {
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(lang === 'en'));
      button.querySelectorAll('[data-lang]').forEach(part => part.classList.toggle('on', part.dataset.lang === lang));
    }
  }
  function set(value) {
    if (value === lang && (value === 'vi' || dict)) return;
    lang = value; save(lang);
    if (lang === 'en') loadDict(() => { apply(); observe(); }); else apply();
  }
  function makeButton() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sitebar-lang';
    button.setAttribute('data-no-i18n', '');
    button.setAttribute('aria-label', 'Đổi ngôn ngữ / Switch language');
    button.title = 'Tiếng Việt / English';
    button.innerHTML = '<span data-lang="vi">VI</span><span aria-hidden="true">/</span><span data-lang="en">EN</span>';
    button.addEventListener('click', () => set(lang === 'en' ? 'vi' : 'en'));
    buttons.push(button);
    return button;
  }
  function mount() {
    const nav = document.querySelector('.sitebar-nav');
    if (nav) nav.appendChild(makeButton());
    else {
      // Trang không có thanh trên cùng (ví dụ 404): nút nổi ở góc phải.
      const button = makeButton();
      button.style.cssText = 'position:fixed;top:12px;right:12px;z-index:70;min-width:64px;min-height:44px;padding:0 12px;border:2px solid #303487;background:#ffdc38;color:#303487;font:900 13px "Be Vietnam Pro",sans-serif;cursor:pointer';
      document.body.appendChild(button);
    }
    syncButtons();
    if (lang === 'en') loadDict(() => { apply(); observe(); });
  }

  if (lang === 'en') {
    root.lang = 'en';
    // Giấu trang trong lúc chờ bản dịch để không nháy tiếng Việt; tự mở lại sau 1,5 giây nếu bản dịch không tải được.
    root.classList.add('i18n-wait');
    setTimeout(() => root.classList.remove('i18n-wait'), 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
