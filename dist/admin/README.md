# Quản trị của Hùng

Chạy đầy đủ từ gốc project bằng `node server/server.mjs`, mở `http://127.0.0.1:4180/admin/`. Lần đầu Hùng tự tạo mật khẩu 12–128 ký tự. Không có mật khẩu mặc định; không dùng tài khoản kiểm tra cho tài khoản thật.

Các mục gồm tổng quan, khung chờ duyệt, khung đã duyệt, bài viết (nháp/xuất bản/ảnh bìa) và nội dung trang chính. Ảnh bìa PNG/JPEG được chuyển WebP trên thiết bị trước khi gửi. Nội dung dùng văn bản an toàn, không thực thi HTML.

Giao diện online đang phục vụ ở `https://admin.hunghienhoa.com`, dùng Supabase Auth và API cùng origin qua Cloudflare Worker. Tài khoản quản trị cho email `hunghienhoa2110@gmail.com` do Hùng tự tạo mật khẩu trong Supabase Dashboard; xem `DEPLOYMENT.md` ở gốc mã nguồn. Không đưa database, cookie/session hoặc token thiết lập vào thư mục này.

Không có chế độ quản trị công khai bỏ qua đăng nhập. Bản cục bộ dùng mật khẩu băm scrypt, cookie HttpOnly và CSRF; bản online dùng Bearer token Supabase, kiểm tra email quản trị và RLS. Ảnh quản trị riêng được tải bằng token, không cache và giải phóng URL bộ nhớ khi đăng xuất. Mọi cấu hình/database riêng nằm ngoài webroot.
