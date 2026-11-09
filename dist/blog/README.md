# Góc nhỏ của Hùng

Trang chia sẻ các điều thú vị bằng tiếng Việt, cùng màu giấy kem/xanh tím/vàng và phông Be Vietnam Pro / Playfair Display của hồ sơ. Nội dung lấy từ các bài đã đăng qua API, không tự dựng bài khi mất kết nối.

## Chạy và tách tên miền

Chạy backend gốc bằng `node server/server.mjs`, rồi mở `http://127.0.0.1:4180/blog/`. Trang riêng chứa đủ CSS, JavaScript, phông chữ và SVG. Khi chuyển sang tên miền riêng, đưa nội dung thư mục này lên gốc website, đặt `window.HUNG_API_BASE` trong `config.js` thành origin API và thêm tên miền blog vào allowlist CORS của backend.

## Nội dung và quyền riêng tư

- Dữ liệu chỉ đọc qua GET `/api/site`, `/api/posts` và `/api/posts/:slug`. Bản nháp không được hiển thị; không có chức năng đăng nội dung công khai từ blog.
- Bài minh họa có nhãn “Bài viết mẫu”. Nội dung, chủ đề, tìm kiếm và trạng thái trống đều dùng dữ liệu thật nhận được từ API.
- Nội dung bài viết được gắn bằng `textContent`. Hỗ trợ đoạn văn, tiêu đề `#`/`##`/`###`, danh sách `-` hoặc `*` và trích dẫn `>`; không thực thi HTML hoặc liên kết trong nội dung.
- Ảnh bìa chỉ nhận từ origin API đã cấu hình, dùng WebP do backend phục vụ; không nhúng nguồn ảnh theo dõi tùy ý.
- Không tài khoản, bình luận, thống kê theo dõi, cookie hoặc lưu nội dung đọc vào bộ nhớ trình duyệt lâu dài.

## Kiểm tra

`node dist/blog/core.test.mjs` kiểm tra tìm kiếm không dấu, thời gian đọc, lọc bản nháp, phân đoạn bài viết an toàn và giới hạn origin ảnh bìa. Root thực hiện kiểm tra giao diện và API khi máy chủ mới sẵn sàng.

Các phông và SVG được giữ từ dự án gốc. Giấy phép Playfair ở `fonts/Playfair-Display-OFL.txt`.
