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
 ['Hộp carton, nhãn giấy và sticker theo chất liệu mẫu đã chốt. Các hình ló ra phía sau hộp, nhãn hạ xuống rồi thu lại.', 'Nhận diện · Carton và nhãn giấy'],
 ['Phong bì bạc gói những ý tưởng nhỏ. Nhân vật hai bên vẫy nhẹ, nhãn giấy chuyển động phía dưới.', 'Truyền thông · Phong bì và sticker'],
 ['Cassette ghi lại tần số sáng tạo. Hai nhân vật chạy qua hai phía, cụm nhạc hạ xuống bên dưới.', 'Sự kiện · Cassette và dấu nhạc'],
 ['Bìa đĩa lưu giữ một chút cảm xúc. Đĩa chạy từ cạnh phải, lẩn sau bìa rồi xuất hiện phía dưới.', 'Ấn phẩm · Giấy, bìa và đĩa'],
 ['Túi trà giấy với họa tiết gập vào giữa. Các hàng trang trí chuyển động phía sau, nhãn hạ xuống sau đó.', 'Bao bì · Túi giấy và họa tiết'],
 ['Túi minh họa đựng những chuyện bé xíu. Hai lá cờ mở ra hai bên, bảng nhỏ xuất hiện phía dưới.', 'Minh họa · Túi giấy và cờ']
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

