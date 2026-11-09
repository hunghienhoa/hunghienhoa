# Xưởng khung, blog, quản trị và WebP — 09/11/2026

## Đã triển khai trên máy

- Trang chính có hai dự án: Hộp Ảnh và Góc tò mò. Blog lấy bài đã xuất bản từ API, có tìm kiếm không dấu, lọc chuyên mục và trang đọc riêng. Ba bài khởi đầu ghi rõ bài mẫu, không bịa trải nghiệm hay khách hàng.
- Photobooth có hiệu ứng dải ảnh nổi, tem lắc, khung chuyển nhẹ, chớp khi chụp và ảnh xuất hiện; hỗ trợ giảm chuyển động. Xưởng khung chỉnh ba màu, chữ, họa tiết, nhãn dán; dùng/tải khung WebP hoặc chủ động gửi thiết kế vào hàng chờ với tên, liên kết công khai, liên hệ riêng tùy chọn và đồng ý gửi duyệt.
- Hàng chờ chỉ gửi canvas khung trống riêng. Ảnh chụp/chọn ghép không được gửi API, lưu localStorage/IndexedDB hoặc database. Xóa bộ nhớ ảnh khi rời trang và khi hết phiên một giờ. Tệp tải về là bản người dùng chủ động lưu trên máy.
- Máy chủ Node + SQLite có API thật, không mô phỏng bằng localStorage. Bản chờ/poster/thông tin riêng xóa sau một giờ; đọc/duyệt quá hạn bị chặn. Từ chối xóa ngay; duyệt giữ thiết kế và ghi công công khai, xóa liên hệ riêng. Khung đã duyệt không hết hạn một giờ.
- Trang `/admin/` có đăng nhập, duyệt/từ chối khung, gỡ khung, soạn bài/nháp/xuất bản/ảnh bìa, sửa tên/giới thiệu/liên hệ/nội dung blog. Tài khoản thật chưa được thiết lập, Hùng tự tạo mật khẩu lần đầu. Không có mật khẩu mặc định.
- Trên Windows, dữ liệu riêng mặc định ở `%LOCALAPPDATA%/HungHienHoa/portfolio-data`, ngoài webroot và OneDrive. Mã nguồn vẫn ở thư mục project cũ. Máy chủ chỉ lắng nghe `127.0.0.1:4180`, chưa công khai ra mạng.
- Sáu logo PNG được chuyển WebP lossless, kích thước/RGBA giữ nguyên, giảm 128.244 → 85.180 byte (33,6%). SVG giữ SVG. Có công cụ chuyển, quy tắc AGENTS và kiểm tra chặn PNG mới trong `dist`. Ảnh bìa, khung và ảnh xuất mới dùng WebP.

## Kiểm tra đạt

- `node check.cjs`: tài nguyên/neo lồng nhau, không PNG trong webroot, sáu thiết kế mẫu, cú pháp, popup/fallback và thông báo WeChat.
- `node server/server.test.mjs`: thiết lập quản trị, băm mật khẩu, phiên HttpOnly/SameSite, CSRF/Origin, chặn API/file riêng, nháp không công khai, đăng/sửa/xóa bài, ảnh WebP, duyệt không lộ liên hệ riêng, giữ khung đã duyệt, hạn một giờ chặn ngay và dọn vật lý khi bộ định giờ chạy/khởi động lại, giới hạn tần suất/kích thước và khóa thiết lập quản trị production.
- `node dist/photobooth/core.test.mjs`: cắt ảnh và các phép đổi màu/alpha; `node dist/photobooth/design.test.mjs`: cấu hình khung, hạn phiên, bộ vẽ khung-only.
- `node tools/photo-privacy.test.mjs`: chạy các handler ứng dụng thật với ảnh tổng hợp trong VM, bốn ảnh đang có trong dải vẫn gửi riêng FRAME-ONLY; hết một giờ/rời trang xóa ảnh, không tự bật camera. Đây là kiểm tra logic, không phải kiểm tra trình duyệt.
- `node dist/blog/core.test.mjs`: tìm kiếm tiếng Việt, thời gian đọc, lọc bản nháp, nội dung văn bản an toàn và origin ảnh bìa.
- `node tools/http-smoke.mjs`: bốn trang đang chạy trả 200, đúng MIME WebP/JavaScript, ba bài mẫu đọc được, API riêng trả 401, file riêng/PNG cũ trả 404, tài khoản chủ trang vẫn chưa thiết lập.
- Đã kiểm tra cú pháp toàn bộ JavaScript phục vụ và `git diff --check`; logo WebP được đối chiếu từng byte RGBA với bản nguồn.

## Giới hạn còn lại

Lượt này không kiểm tra trực quan PC/mobile vì quyền trình duyệt cục bộ trong Work settings bị tắt. Chưa thử máy ảnh thật, Safari/iPhone thật hoặc thiết lập tài khoản thật. Các phần giao diện trước lượt mở rộng này đã được kiểm tra, nhưng không dùng kết quả cũ để khẳng định giao diện mới.

Chưa gắn `admin.hunghienhoa.com`, DNS/HTTPS hoặc database cloud. Website có API mới cần host Node/API tương thích; đưa riêng `dist` lên hosting tĩnh sẽ không có blog/quản trị/duyệt khung. Khi tách tên miền, cấu hình reverse proxy/API cùng origin và allowlist theo `server/README.md`. Manifest Sites gốc được giữ nguyên, không tạo site thay thế.

Bộ định giờ chỉ chạy khi máy chủ hoạt động; nếu máy chủ tắt, bản quá hạn bị xóa ngay khi chạy lại trước khi phục vụ. Không đưa database bản chờ vào sao lưu/đồng bộ ngoài.

Máy chủ QA cổng 4192 đã dừng. Lượt xóa thư mục mẫu `tmp/admin-ui-qa` và database khởi tạo thử trong project bị phê duyệt tự động chặn với lý do chung “blocked by policy”, nên không xóa tiếp. Những tệp này chỉ là dữ liệu kiểm tra, không phải tài khoản thật; nằm ngoài webroot, bị Git bỏ qua và không có trong ZIP. Dữ liệu thật mới dùng thư mục AppData nêu trên.
