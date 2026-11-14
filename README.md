<a href="https://hunghienhoa.com">
  <img src=".github/profile/chao-hung.svg" width="100%" alt="Xin chào, mình là Hùng Hiền Hòa. Một hộp đầy ý tưởng — thiết kế, kể chuyện và khám phá.">
</a>

<p align="center">
  <a href="https://hunghienhoa.com"><b>Ghé portfolio ↗</b></a> &nbsp;·&nbsp;
  <a href="https://photobooth.hunghienhoa.com">Chụp một chút vui</a> &nbsp;·&nbsp;
  <a href="https://blog.hunghienhoa.com">Đọc một chút hay</a> &nbsp;·&nbsp;
  <a href="https://snap.hunghienhoa.com">Snap</a>
</p>

## Một chút về mình

Mình là **Hùng** — Hùng Hiền Hòa. Mình thích những ý tưởng có cá tính, những thiết kế có chuyện để kể và những điều nhỏ khiến một ngày trở nên thú vị hơn.

Ở đây, mình gom những thứ đang làm: một portfolio mang tinh thần mở hộp, một góc chụp ảnh giữ kỷ niệm và một nơi để viết về những điều hay ho. Mỗi dự án là một cách thử, học và tạo thêm một chút niềm vui.

## Có gì trong chiếc hộp?

<table>
  <tr>
    <td width="33%" valign="top">
      <h3>01 · Portfolio</h3>
      <p>Một hộp đầy ý tưởng, giấy kem, sticker và những chuyển động có cá tính.</p>
      <a href="https://hunghienhoa.com"><b>Mở hộp cùng mình ↗</b></a>
    </td>
    <td width="33%" valign="top">
      <h3>02 · Hộp Ảnh</h3>
      <p>Chụp bốn khoảnh khắc, tự tạo khung và mang một dải kỷ niệm về nhà.</p>
      <a href="https://photobooth.hunghienhoa.com"><b>Vào phòng chụp ↗</b></a>
    </td>
    <td width="33%" valign="top">
      <h3>03 · Góc nhỏ</h3>
      <p>Nhặt một chút hay, giữ một chút tò mò và kể thêm một câu chuyện.</p>
      <a href="https://blog.hunghienhoa.com"><b>Mở một trang mới ↗</b></a>
    </td>
  </tr>
</table>

## Bên trong xưởng nhỏ

Những công cụ đang được dùng cho các dự án này:

`HTML` · `CSS` · `JavaScript` · `Node.js` · `Supabase` · `Cloudflare Workers` · `GitHub Actions`

Mình thích giao diện có chất riêng, những chi tiết chuyển động vừa đủ và trải nghiệm dùng được cả trên máy tính lẫn điện thoại. Với Hộp Ảnh, ảnh chụp được xử lý ngay trong bộ nhớ trình duyệt, không gửi lên máy chủ.

## Bắt đầu bằng một lời chào

Bạn có ý tưởng muốn trao đổi, muốn góp một chiếc khung ảnh hay chỉ muốn chào nhau một tiếng?

**[Gửi email cho mình ↗](mailto:hunghienhoa2110@gmail.com)** &nbsp; `hunghienhoa2110@gmail.com`

<p>
  <a href="https://www.facebook.com/quanghungdethuong"><img src="dist/assets/social/facebook.webp" width="28" height="28" alt="Facebook"></a>&nbsp;&nbsp;
  <a href="https://www.instagram.com/im.bqhung/"><img src="dist/assets/social/instagram.webp" width="28" height="28" alt="Instagram"></a>&nbsp;&nbsp;
  <a href="https://www.threads.com/@im.bqhung"><img src="dist/assets/social/threads.svg" width="28" height="28" alt="Threads"></a>&nbsp;&nbsp;
  <a href="https://www.tiktok.com/@im.bqhung"><img src="dist/assets/social/tiktok.webp" width="28" height="28" alt="TikTok"></a>&nbsp;&nbsp;
  <a href="https://www.youtube.com/@hunghienhoa98886"><img src="dist/assets/social/youtube.webp" width="28" height="28" alt="YouTube"></a>&nbsp;&nbsp;
  <a href="https://zalo.me/0898298886"><img src="dist/assets/social/zalo.webp" width="28" height="28" alt="Zalo"></a>
</p>

[Facebook](https://www.facebook.com/quanghungdethuong) · [Instagram](https://www.instagram.com/im.bqhung/) · [Threads](https://www.threads.com/@im.bqhung) · [TikTok](https://www.tiktok.com/@im.bqhung) · [YouTube](https://www.youtube.com/@hunghienhoa98886) · [Zalo](https://zalo.me/0898298886) · WeChat: `bqhtit`

<a href="mailto:hunghienhoa2110@gmail.com">
  <img src=".github/profile/loi-chao.svg" width="100%" alt="Ý tưởng hay thường bắt đầu từ một lời chào. Rất vui được gặp bạn!">
</a>

<details>
  <summary><b>Bạn đến đây vì mã nguồn?</b></summary>

Kho này đồng thời chứa mã nguồn cho website của mình. Tài liệu kỹ thuật được giữ riêng để dễ tìm:

- [Hướng dẫn mã nguồn và chạy trên máy](PROJECT.md)
- [Triển khai, tên miền và GitHub Actions](DEPLOYMENT.md)
- [API và quyền riêng tư](API-CONTRACT.md)
- [Theo dõi các lượt triển khai](https://github.com/hunghienhoa/hunghienhoa/actions/workflows/deploy.yml)

</details>


### Kiểm tra giao diện và luồng bằng trình duyệt

Khi máy đã có Playwright hoặc `@playwright/cli` và Chrome, chạy `node tools/browser-audit.mjs`. Bộ kiểm tra tự tạo máy chủ loopback ở cổng ngẫu nhiên và dữ liệu giả trong thư mục cục bộ riêng; không dùng tài khoản hoặc dữ liệu trên website thật. Nó kiểm tra 9 trang ở 7 kích thước (320–1920 px), các bảng Admin sau đăng nhập, đọc/sao chép bài viết, gửi–duyệt khung và chụp bằng luồng video giả lập. Báo cáo JSON và ảnh kiểm tra nằm trong `tmp/`. Đây là kiểm tra Chrome với viewport mobile, không thay thế thử camera/quyền tải file trên iPhone hoặc Android thật. Bộ này tùy chọn, không nằm trong `npm run check` vì cần trình duyệt được cài trên máy.

### Snap của Hùng

Trang `https://snap.hunghienhoa.com/` (cục bộ: `/snaptik/`) tự nhận diện link TikTok, Instagram và Facebook. TikTok dùng TikWM; Instagram/Facebook đọc dữ liệu nhúng công khai trực tiếp từ nền tảng, không dùng tài khoản hoặc cookie. API Node và Worker dùng chung `server/snaptik.mjs`; chỉ truyền file từ các miền nguồn được cho phép, kiểm tra chữ ký định dạng và giới hạn mỗi file 200 MB. Không tạo kho video; ảnh tải qua giao diện chuyển thành JPEG trong bộ nhớ trình duyệt. Chỉ tải và sử dụng nội dung khi có quyền.

Không cần khóa API riêng. Nguồn TikWM có thể thay đổi, gián đoạn hoặc giới hạn truy cập; không cam kết mọi bài đều tải được. Worker giới hạn tần suất bằng binding `SNAPTIK_LIMIT`, máy chủ cục bộ dùng bộ giới hạn hiện có.

Chạy `node --test tools/snaptik.test.mjs` để kiểm tra luồng và đầu vào; `node tools/browser-snaptik.mjs` kiểm tra Chrome ở 320/390/768/1440 px bằng nguồn giả lập. Đặt `SITE_URL=https://snap.hunghienhoa.com` để kiểm tra trang thật bằng liên kết mẫu. Bộ trình duyệt không tải toàn bộ video lớn; thử việc lưu file trên thiết bị thật riêng.

### Tên website và liên kết trên Google

HTML trả từ máy chủ có `WebSite` với tên và URL chuẩn của từng tên miền công khai, `og:site_name`, một canonical và quan hệ giữa portfolio với ba dự án. Trang chính dùng các liên kết HTML trực tiếp tới Hộp Ảnh, Góc tò mò và Snap; sitemap riêng được công bố trong robots.txt của từng miền.

Google tự quyết định sitelinks và cách nhóm tên miền phụ; mã đánh dấu không bảo đảm bố cục như ảnh mẫu hoặc thời gian xuất hiện. Quản trị viên có thể gửi sitemap và yêu cầu thu thập lại URL trong Search Console đã xác minh. Xem [sitelinks](https://developers.google.com/search/docs/appearance/sitelinks) và [tên website](https://developers.google.com/search/docs/appearance/site-names).
