# Hùng Hiền Hòa — Unboxed Portfolio

Portfolio tĩnh dùng HTML, CSS và JavaScript, không cần cài dependency.

## Chạy tại máy

Chạy `python -m http.server 4180 --directory dist` trong thư mục này, mở http://localhost:4180.

## Chỉnh nội dung

- `dist/index.html`: tên, giới thiệu, nhãn dự án, phần liên hệ.
- `dist/app.js`: mô tả các concept và hành vi tương tác.
- `dist/style.css`: màu, bố cục và hiệu ứng.
- `dist/bubble-wrap.css` và `dist/assets/bubble-wrap-photo.webp`: chỉ dùng chung chất liệu xốp nhựa tạo bằng Imagegen, lớp nền và film phía trước đứng yên. Xem prompt và nguồn asset trong `IMAGEGEN.md`.
- `dist/motion-123.css` và `dist/motion-456.css`: sáu cảnh có bộ props và chuyển động riêng theo sáu GIF. Không dùng một vòng sticker chung. Nội dung props nằm trong `.scene-props` của từng cảnh, giữ nguyên khi clone vào cửa sổ chi tiết; nút dừng và giảm chuyển động áp dụng cho mọi cảnh.

| Cảnh | Mẫu tham khảo | Chuyển động riêng |
| --- | --- | --- |
| 01 Nắng / Branding | `557c57…gif` | Tay và sticker bung ra, giữ rồi thu vào; logo treo đung đưa. |
| 02 Bật chất riêng / Media | `4ed855…gif` | Tay luôn hiện và vẫy, hoa xoay, sao nhún; huy hiệu hạ/nâng. |
| 03 Tần Số / Event | `72b8e2…gif` | Sao và asterisk chạy đổi bên sau cassette; tay vẫy và nốt nhạc hạ xuống. |
| 04 Chạm / Layout | `53c013…gif` | CD lùa vào từ cạnh rồi trượt xuống dưới hộp, xoay và thu về. |
| 05 Mộc / Packaging | `22b98e…gif` | Hai dải họa tiết dồn về giữa rồi tách ra, bộ hình thoi trượt ngang và nhãn trà thả xuống. |
| 06 Những điều bé xíu / Illustration | `ed8fc2…gif` | Hai cánh giấy mở ngang sau bìa và thu lại, thẻ sách hạ xuống riêng. |
- `dist/assets/`: sticker SVG gốc, có thể thay bằng hình dự án thật.
- `dist/fonts/`: SVN-Gilroy từ dự án hiện có theo yêu cầu người dùng. Quyền sử dụng webfont chưa được xác minh.

Sáu dự án đều là concept minh họa; không phải khách hàng, kinh nghiệm hay dự án thực tế của chủ portfolio. Tên đang dùng theo tên workspace và cần xác nhận. Không sao chép thông tin cá nhân hoặc đồ án của tác giả bộ ảnh tham khảo.

Phần liên hệ dùng email và số điện thoại do người dùng cung cấp: nút gửi email mở ứng dụng thư, số điện thoại mở trình gọi và Zalo dùng liên kết theo số điện thoại. Facebook, Instagram, Threads và TikTok trỏ tới URL người dùng cung cấp; WeChat sao chép ID `bqhtit`, có hiển thị ID để sao chép thủ công nếu trình duyệt từ chối clipboard. Không gửi tin nhắn tự động. Chỉ YouTube đang chờ link: thay `span.social-link.pending` bằng `a.social-link` với URL HTTPS thật khi có. Giao diện liên hệ nằm trong `dist/contact.css`, xử lý WeChat trong `dist/contact.js`.

Hiệu ứng: hộp mở bằng thao tác chạm, sticker lắc/nảy, dải chữ chạy, cassette quay, CD xoay, ánh nilon khi hover, nội dung xuất hiện khi cuộn. Có nút dừng và hỗ trợ prefers-reduced-motion; dialog dùng phần tử HTML gốc hỗ trợ Escape và giữ focus.
