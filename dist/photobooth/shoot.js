const picker = document.querySelector('#frame-picker');
const change = document.querySelector('#change-frame');
change.addEventListener('click', () => picker.showModal());
document.querySelector('#close-frame-picker').addEventListener('click', () => picker.close());
picker.addEventListener('click', event => { if (event.target === picker) picker.close(); });
picker.querySelectorAll('[data-frame]').forEach(button => button.addEventListener('click', () => {
  document.querySelector('#selected-frame').textContent = button.textContent.trim();
  picker.close();
  change.focus();
}));

const preview = document.querySelector('#strip');
const syncFrameName = () => { const label = preview.getAttribute('aria-label') || ''; const match = label.match(/khung (.*)\.$/); if (match) document.querySelector('#selected-frame').textContent = match[1]; };
new MutationObserver(syncFrameName).observe(preview, {attributes:true, attributeFilter:['aria-label']});
syncFrameName();

document.addEventListener('frame-selected', () => { picker.close(); change.focus(); });
