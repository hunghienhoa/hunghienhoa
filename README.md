# Hùng Hiền Hòa — Unboxed Portfolio

Portfolio tĩnh dùng HTML, CSS và JavaScript, không cần cài dependency.

## Chạy tại máy

Chạy `python -m http.server 4180 --directory dist` trong thư mục này, mở http://localhost:4180.

## Chỉnh nội dung

- `dist/index.html`: tên, giới thiệu, nhãn dự án, phần liên hệ.
- `dist/app.js`: mô tả các concept và hành vi tương tác.
- `dist/style.css`: màu, bố cục và hiệu ứng.
- `dist/bubble-wrap.css` và `dist/assets/bubble-wrap.svg`: tấm xốp bong bóng trong suốt, viền nổi và ánh nilon lướt chậm phía sau sáu concept; dùng chung cho thẻ và cửa sổ chi tiết, tuân theo nút dừng và cài đặt giảm chuyển động.
- `dist/assets/`: sticker SVG gốc, có thể thay bằng hình dự án thật.
- `dist/fonts/`: SVN-Gilroy từ dự án hiện có theo yêu cầu người dùng. Quyền sử dụng webfont chưa được xác minh.

Sáu dự án đều là concept minh họa; không phải khách hàng, kinh nghiệm hay dự án thực tế của chủ portfolio. Tên đang dùng theo tên workspace và cần xác nhận. Không sao chép thông tin cá nhân hoặc đồ án của tác giả bộ ảnh tham khảo. Email chưa được cung cấp nên nút liên hệ hiện thông báo, chưa gửi email. Thay bằng địa chỉ thực rồi đổi nút thành liên kết `mailto:` khi hoàn thiện hồ sơ.

Hiệu ứng: hộp mở bằng thao tác chạm, sticker lắc/nảy, dải chữ chạy, cassette quay, CD xoay, ánh nilon khi hover, nội dung xuất hiện khi cuộn. Có nút dừng và hỗ trợ prefers-reduced-motion; dialog dùng phần tử HTML gốc hỗ trợ Escape và giữ focus.
