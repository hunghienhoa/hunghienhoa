document.querySelectorAll('[data-project-window]').forEach(projectLink => projectLink.addEventListener('click', event => {
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button > 0) return;
  const popup = window.open(projectLink.href, '_blank', 'popup,width=1180,height=850');
  if (!popup) return;
  popup.opener = null;
  event.preventDefault();
}));
