// Thanh trên cùng: nút ☰ trên điện thoại. Đóng khi bấm ra ngoài, bấm Esc hoặc chọn một mục.
(() => {
  const bar = document.querySelector('.sitebar');
  if (!bar) return;
  const toggle = bar.querySelector('.sitebar-toggle');
  const setOpen = open => { bar.classList.toggle('open', open); toggle?.setAttribute('aria-expanded', String(open)); };
  toggle?.addEventListener('click', () => setOpen(!bar.classList.contains('open')));
  document.addEventListener('click', event => { if (!bar.contains(event.target)) setOpen(false); });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !bar.classList.contains('open')) return;
    setOpen(false);
    toggle?.focus();
  });
  bar.querySelectorAll('.sitebar-nav a').forEach(link => link.addEventListener('click', () => setOpen(false)));
})();
