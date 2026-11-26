// Thanh trên cùng: nút ☰ trên điện thoại. Đóng khi bấm ra ngoài, bấm Esc hoặc chọn một mục.
// Vuốt xuống thì thanh trượt lên ẩn đi, vuốt ngược lên (hoặc về gần đầu trang) thì hiện lại.
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

  let lastY = window.scrollY, ticking = false;
  const update = () => {
    ticking = false;
    const y = Math.max(0, window.scrollY), delta = y - lastY;
    if (y < 80 || bar.classList.contains('open') || bar.contains(document.activeElement)) bar.classList.remove('is-hidden');
    else if (delta > 6) bar.classList.add('is-hidden');
    else if (delta < -6) bar.classList.remove('is-hidden');
    if (Math.abs(delta) > 6 || y < 80) lastY = y;
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, {passive: true});
  bar.addEventListener('focusin', () => bar.classList.remove('is-hidden'));
})();
