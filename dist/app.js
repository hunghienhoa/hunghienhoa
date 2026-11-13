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
  document.querySelector('#filter-status').textContent = `Hiển thị ${projects.filter(project => !project.hidden).length} thiết kế.`;
}));
const descriptions = [
 ['Poster chủ đề mua sắm mùa hè với tông xanh mát, chữ vàng nổi bật và bố cục phối cảnh. Nhân vật, quà tặng cùng chi tiết giảm giá tạo cảm giác sôi động cho thiết kế.', 'Poster · Ghép ảnh · Chữ nổi'],
 ['Một thế giới đồ chơi rực rỡ với máy gắp, máy chơi game và các chi tiết âm nhạc. Tông xanh ngọc, hồng và vàng cùng những lớp mây tạo chiều sâu và cảm giác vui nhộn.', 'Ảnh ghép sáng tạo · Bố cục · Màu sắc'],
 ['Mockup móc khóa tên riêng trên nền đỏ, kết hợp chữ viết tay, viền ánh kim và charm nhân vật. Ánh sáng phản chiếu làm nổi bật bề mặt và chi tiết của thiết kế.', 'Mockup · Chữ trang trí · Trình bày sản phẩm'],
 ['Thiết kế chữ kết hợp nét viết tay và chữ in hoa, điểm xuyết cầu vồng cùng các ngôi sao. Viền trắng và bóng đổ tạo cảm giác như một nhãn dán mang dấu ấn cá nhân.', 'Thiết kế chữ · Nhãn dán · Màu sắc'],
 ['Thiết kế chữ in hoa uốn cong với các lớp nổi khối. Xanh đậm, đỏ cam và phần đổ khối màu vàng tạo chiều sâu, giúp tên và dấu nhận diện cá nhân nổi bật.', 'Chữ nổi 3D · Bố cục chữ · Phối màu'],
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
  dialog.querySelector('.eyebrow').textContent = index < 5 ? 'THIẾT KẾ CÁ NHÂN' : 'BẢN DỰNG CHUYỂN ĐỘNG';
  dialog.querySelector('.draft-label').style.display = index < 5 ? 'none' : '';
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
}
document.querySelectorAll('[data-project]').forEach(button => button.addEventListener('click', () => showProject(Number(button.dataset.project))));
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
document.querySelector('.next-project').addEventListener('click', () => showProject((currentProject + 1) % projects.length));
dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });

