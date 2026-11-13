(async () => {
  try {
    const response = await fetch((window.HUNG_API_BASE || '') + '/api/site', {cache:'no-store',credentials:'omit'});
    if (!response.ok) return;
    const site = await response.json();
    const apply = () => {
    for (const [name,color] of Object.entries(site.theme || {})) if (['cream','blue','yellow'].includes(name) && /^#[a-f\d]{6}$/i.test(color)) document.documentElement.style.setProperty('--'+name,color);
    for (const element of document.querySelectorAll('[data-edit]')) {
      const value = site.pageTexts?.[element.dataset.edit];
      if (typeof value !== 'string') continue;
      const node = [...element.childNodes].find(node => node.nodeType===3 && node.textContent.trim());
      if (node) node.textContent=value;
    }
    for(const [key,path] of Object.entries(site.pageImages||{})) {
      if(!/^\/api\/media\/[a-f0-9-]{36}\.webp$/.test(path))continue;
      const target=key==='about'?document.querySelector('.about-art .portrait'):/^project-[0-5]$/.test(key)?document.querySelector('[data-project="'+key.slice(8)+'"] .project-art'):null;
      if(!target || target.dataset.customImage===path)continue;
      const image=document.createElement('img');image.src=path;image.alt=key==='about'?'Ảnh giới thiệu Hùng':target.closest('.project')?.querySelector('h3')?.textContent||'Ảnh dự án';image.className='custom-page-image';image.loading='lazy';image.decoding='async';
      target.replaceChildren(image);target.classList.add('has-custom-image');target.dataset.customImage=path;
    }
    const socials=site.socials || {};
    for (const link of document.querySelectorAll('.social-link[href]')) {
      const name=link.getAttribute('aria-label')?.split(' ')[0]?.toLowerCase();
      const value=socials[name];
      if (typeof value==='string' && /^https:\/\//i.test(value)) link.href=value;
    }
    const copy=document.querySelector('#wechat-copy');
    if (copy && socials.wechat) {copy.dataset.wechatId=socials.wechat;copy.querySelector('small').textContent=socials.wechat;copy.setAttribute('aria-label','Sao chép mã WeChat '+socials.wechat);}
    for (const email of document.querySelectorAll('.contact-email')) {email.textContent=site.email;email.href='mailto:'+site.email;}
    for (const phone of document.querySelectorAll('.contact-phone')) {phone.firstChild.textContent=site.phone+' ';phone.href='tel:'+site.phone.replace(/[^+\d]/g,'');}
    };
    window.addEventListener('hung-content-ready',apply);
    apply();
  } catch { /* Static page stays available if the content API is unavailable. */ }
})();
