const wechatButton = document.querySelector('#wechat-copy');
const wechatStatus = document.querySelector('#wechat-status');
wechatButton.addEventListener('click', async () => {
  const id = wechatButton.dataset.wechatId;
  try {
    await navigator.clipboard.writeText(id);
    wechatStatus.textContent = `Đã sao chép WeChat ID: ${id}.`;
  } catch {
    wechatStatus.textContent = `WeChat ID: ${id}. Bạn có thể chọn và sao chép ID này.`;
  }
});
