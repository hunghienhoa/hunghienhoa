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
  ['Một xưởng sáng tạo tưởng tượng lấy cảm hứng từ nắng sớm. Chữ mềm, sắc cam ấm và một ngôi sao tinh nghịch tạo nên cảm giác gần gũi, lạc quan.', 'Biểu trưng · Màu sắc · Ứng dụng nhận diện'],
  ['Một ý tưởng truyền thông khuyến khích thể hiện bản thân. Chữ cỡ lớn và các mảng màu tương phản biến thông điệp thành một tuyên ngôn vui nhộn.', 'Hình ảnh chủ đạo · Áp phích · Thông điệp sáng tạo'],
  ['Biến tinh thần gặp gỡ và chia sẻ ý tưởng thành một cuộn băng cassette. Hai bánh băng chuyển động như một lời mời bật lên tần số sáng tạo của riêng mình.', 'Nhận diện sự kiện · Đồ họa chuyển động'],
  ['Một ấn phẩm mẫu về những cảm xúc nhỏ trong cuộc sống. Hình ảnh đĩa CD gợi liên tưởng đến ký ức, âm nhạc và những câu chuyện có thể chạm tới nhau.', 'Bìa ấn phẩm · Chữ và trình bày · Bố cục'],
  ['Mẫu bao bì trà mang tinh thần chậm rãi. Màu xanh thảo mộc, giấy kem và một đóa hoa nhỏ đưa sự thư thái vào từng chi tiết.', 'Bao bì · Nhãn hiệu · Minh họa'],
  ['Một cuốn sổ nhỏ thu thập niềm vui thường ngày. Những nhân vật nhãn dán nhiều màu kể chuyện bằng nét vẽ đơn giản, hồn nhiên và dễ mến.', 'Bìa sách · Nhân vật · Minh họa cá nhân']
];
const dialog = document.querySelector('#project-dialog');
let currentProject = 0;
function showProject(index) {
  currentProject = index;
  document.querySelector('#dialog-title').textContent = projects[index].querySelector('h3').textContent;
  document.querySelector('#dialog-art').replaceChildren(projects[index].querySelector('.project-art').cloneNode(true));
  document.querySelector('#dialog-description').textContent = descriptions[index][0];
  document.querySelector('#dialog-scope').textContent = descriptions[index][1];
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
}
document.querySelectorAll('[data-project]').forEach(button => button.addEventListener('click', () => showProject(Number(button.dataset.project))));
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
document.querySelector('.next-project').addEventListener('click', () => showProject((currentProject + 1) % projects.length));
dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });

