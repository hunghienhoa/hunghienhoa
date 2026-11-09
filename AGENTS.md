# Quy tắc dự án

- Tên gọi của chủ trang là **Hùng**. Hiền Hòa là phần tên theo sau; giữ tên đầy đủ Hùng Hiền Hòa khi phù hợp.
- Toàn bộ giao diện viết tiếng Việt, giữ tông giấy kem/xanh tím/vàng. Dùng Be Vietnam Pro cho nội dung, điều hướng, nút và canvas; Playfair Display cho phần nhấn. Không đưa SVN-Gilroy trở lại giao diện.
- Ảnh raster phục vụ trên web và ảnh xuất mới mặc định **WebP**. SVG gốc giữ SVG. Không thêm PNG vào `dist`; ảnh người dùng nhập PNG/JPEG được chuyển ngay trong bộ nhớ trước khi dùng/lưu. Dùng `python tools/convert-webp.py`, rồi `python tools/convert-webp.py --check` và `node check.cjs`. Bản nguồn PNG chỉ giữ ngoài webroot ở `source-assets/original-png`.
- Ảnh chụp hoặc ảnh chọn để ghép chỉ ở bộ nhớ trình duyệt, không lưu browser storage, log, database hoặc gửi API. Xóa khi rời trang và khi hết phiên một giờ. Poster đóng góp phải được vẽ từ thiết kế khung trống, không lấy từ canvas dải ảnh cá nhân.
- Bản đóng góp chờ duyệt và thông tin riêng hết hạn sau một giờ; khung đã duyệt giữ thiết kế và ghi công công khai, xóa thông tin liên hệ riêng. Không sao lưu bản chờ trong gói mã nguồn.
- Database, `private-data`, `.env`, session và mật khẩu không được commit, đưa vào `dist` hoặc ZIP. Trên Windows cục bộ dùng `%LOCALAPPDATA%/HungHienHoa/portfolio-data`, tránh đồng bộ bản chờ qua OneDrive. Chủ trang tự thiết lập mật khẩu quản trị; không thêm mật khẩu mặc định.
- Dùng máy chủ `node server/server.mjs` để chạy cả API, hồ sơ, photobooth, blog và admin. Server mặc định chỉ loopback; tên miền và database cloud chỉ cấu hình khi có yêu cầu triển khai cụ thể.
- `/graphify`: đọc skill graphify được cài trước khi thực hiện.
