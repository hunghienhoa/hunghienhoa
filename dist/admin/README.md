# Quản trị của Hùng

Chạy đầy đủ từ gốc project bằng `node server/server.mjs`, mở `http://127.0.0.1:4180/admin/`. Lần đầu Hùng tự tạo mật khẩu 12–128 ký tự. Không có mật khẩu mặc định; không dùng tài khoản kiểm tra cho tài khoản thật.

Các mục gồm tổng quan, khung chờ duyệt, khung đã duyệt, bài viết (nháp/xuất bản/ảnh bìa) và nội dung trang chính. Ảnh bìa PNG/JPEG được chuyển WebP trên thiết bị trước khi gửi. Nội dung dùng văn bản an toàn, không thực thi HTML.

Giao diện riêng này chứa đủ phông/tài sản để sau phục vụ ở `admin.hunghienhoa.com`. Cần DNS, HTTPS và API quản trị cùng origin hoặc reverse proxy, theo `server/README.md`; chưa gắn tên miền. Không đưa database, cookie/session hoặc token thiết lập vào thư mục này.

Không có chế độ quản trị công khai bỏ qua đăng nhập. Mật khẩu được băm bằng scrypt; cookie HttpOnly, CSRF và kiểm tra Origin bảo vệ thao tác ghi. Mọi cấu hình/database riêng nằm ở máy chủ ngoài webroot.
