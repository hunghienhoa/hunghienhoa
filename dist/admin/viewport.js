// Keep in-page gestures at the intended scale; browser menu/accessibility zoom stays native.
document.addEventListener('wheel', event => {
  if (event.ctrlKey || event.metaKey) event.preventDefault();
}, { passive: false });
document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && ['+', '=', '-', '0'].includes(event.key)) event.preventDefault();
});
document.addEventListener('gesturestart', event => event.preventDefault(), { passive: false });
