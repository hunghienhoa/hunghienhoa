document.documentElement.classList.add('js');
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  });
}, { threshold: 0.08 });
document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
document.querySelector('#unbox').addEventListener('click', event => {
  const button = event.currentTarget;
  const opened = button.classList.toggle('open');
  button.setAttribute('aria-expanded', String(opened));
  button.setAttribute('aria-label', opened ? 'Đóng hộp ý tưởng' : 'Mở hộp ý tưởng');
  document.querySelector('#open-hint').textContent = opened ? 'một lời chào, một khởi đầu mới! ✳' : '↖ chạm để mở một ý tưởng';
});
const projects = Array.from(document.querySelectorAll('.project'));
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  projects.forEach(project => { project.hidden = button.dataset.filter !== 'all' && project.dataset.category !== button.dataset.filter; });
  document.querySelector('#filter-status').textContent = `Hiển thị ${projects.filter(project => !project.hidden).length} thiết kế mẫu.`;
}));
const descriptions = [
  ['Ảnh động gốc về nhận diện thương hiệu: sticker xuất hiện quanh hộp và nhãn treo chuyển động.', 'Ảnh tham khảo 01 · Từ GIF Hùng cung cấp'],
  ['Ảnh động gốc về truyền thông: các nhân vật chuyển động quanh phong bì.', 'Ảnh tham khảo 02 · Từ GIF Hùng cung cấp'],
  ['Ảnh động gốc về sự kiện: sticker chạy qua hai phía của cassette và cụm nhạc xuất hiện bên dưới.', 'Ảnh tham khảo 03 · Từ GIF Hùng cung cấp'],
  ['Ảnh động gốc về trình bày ấn phẩm: đĩa di chuyển và xoay quanh bìa.', 'Ảnh tham khảo 04 · Từ GIF Hùng cung cấp'],
  ['Ảnh động gốc về bao bì: các dải họa tiết và nhãn chuyển động quanh gói sản phẩm.', 'Ảnh tham khảo 05 · Từ GIF Hùng cung cấp'],
  ['Ảnh động gốc về minh họa: hai cờ mở ra hai phía và bảng treo chuyển động phía dưới.', 'Ảnh tham khảo 06 · Từ GIF Hùng cung cấp']
];
const dialog = document.querySelector('#project-dialog');
let currentProject = 0;
function showProject(index) {
  currentProject = index;
  document.querySelector('#dialog-title').textContent = projects[index].querySelector('h3').textContent;
  const artwork = projects[index].querySelector('.project-art').cloneNode(true);
  artwork.querySelectorAll('img').forEach(image => { image.loading = 'eager'; });
  document.querySelector('#dialog-art').replaceChildren(artwork);
  document.querySelector('#dialog-description').textContent = descriptions[index][0];
  document.querySelector('#dialog-scope').textContent = descriptions[index][1];
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
}
document.querySelectorAll('[data-project]').forEach(button => button.addEventListener('click', () => showProject(Number(button.dataset.project))));
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
document.querySelector('.next-project').addEventListener('click', () => showProject((currentProject + 1) % projects.length));
dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });

