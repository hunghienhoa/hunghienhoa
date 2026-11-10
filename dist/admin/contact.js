const wechatButton = document.querySelector('#wechat-copy');
const wechatStatus = document.querySelector('#wechat-status');
let wechatFeedbackTimer;
wechatButton.addEventListener('click', async () => {
  const id = wechatButton.dataset.wechatId;
  try {
    await navigator.clipboard.writeText(id);
    clearTimeout(wechatFeedbackTimer);
    wechatStatus.textContent = `Đã sao chép mã WeChat: ${id}.`;
    wechatFeedbackTimer = setTimeout(() => { wechatStatus.textContent = ''; }, 3000);
  } catch {
    clearTimeout(wechatFeedbackTimer);
    wechatStatus.textContent = `Mã WeChat: ${id}. Bạn có thể chọn và sao chép ID này.`;
  }
});
