const siteAPI = (window.HUNG_API_BASE || '').replace(/\/$/, '');
fetch(siteAPI + '/api/site', { credentials: 'omit', cache: 'no-store' }).then(response => {
  if (!response.ok) throw new Error('Nội dung chưa sẵn sàng.');
  return response.json();
}).then(site => {
  const set = (selector, value) => { const element = document.querySelector(selector); if (element && typeof value === 'string') element.textContent = value; };
  set('.hero-copy p', site.intro);
  set('.about-copy>p:not(.about-lead)', site.about);
  set('#about-title em', site.shortName + '.');
  set('.id-card>b', site.displayName.toLocaleUpperCase('vi-VN'));
  set('.hero-top>span:last-child', site.displayName.toLocaleUpperCase('vi-VN') + ' · 2026');
  set('footer>span', '© 2026 ' + site.displayName + ' · Được tạo nên bằng sự tò mò.');
  document.title = site.displayName + ' — Portfolio, Photobooth Hộp Ảnh và Blog';
  const email = document.querySelector('#contact-email');
  email.textContent = site.email; email.href = 'mailto:' + site.email;
  document.querySelector('.contact-button').href = 'mailto:' + site.email + '?subject=' + encodeURIComponent('Chào ' + site.shortName + ', mình có một ý tưởng');
  const phone = document.querySelector('.contact-phone');
  phone.firstChild.textContent = site.phone + ' '; phone.href = 'tel:' + site.phone.replace(/[^+\d]/g, '');
  document.querySelector('.draft-label')?.remove();
  window.dispatchEvent(new Event('hung-content-ready'));
}).catch(() => { /* Nội dung trong HTML vẫn dùng được khi chưa có máy chủ nội dung. */ });
