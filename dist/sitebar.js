// Thanh trên cùng: nút ☰ trên điện thoại và menu Dự án. Đóng khi bấm ra ngoài, bấm Esc hoặc chọn một mục.
(() => {
  const bar = document.querySelector('.sitebar');
  if (!bar) return;
  const toggle = bar.querySelector('.sitebar-toggle'), projects = bar.querySelector('.sitebar-projects');
  const setOpen = open => { bar.classList.toggle('open', open); toggle?.setAttribute('aria-expanded', String(open)); };
  toggle?.addEventListener('click', () => setOpen(!bar.classList.contains('open')));
  document.addEventListener('click', event => {
    if (!bar.contains(event.target)) { setOpen(false); if (projects) projects.open = false; }
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const wasOpen = bar.classList.contains('open') || projects?.open;
    setOpen(false);
    if (projects) projects.open = false;
    if (wasOpen) toggle?.focus();
  });
  bar.querySelectorAll('.sitebar-nav a').forEach(link => link.addEventListener('click', () => { setOpen(false); if (projects) projects.open = false; }));
})();
