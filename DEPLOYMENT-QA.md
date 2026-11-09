# Kiểm tra triển khai hunghienhoa — 09/11/2026

## Kết quả đã kiểm chứng

- GitHub: https://github.com/hunghienhoa/hunghienhoa, nhánh `main`.
- Cloudflare account CLI: `hunghienhoa2110@gmail.com`; Worker `hunghienhoa`.
- Zone `hunghienhoa.com` đã Active, năm bản ghi Custom Domain do Worker quản lý.
- HTTPS 200 trên trang chính, admin, blog và photobooth. `www` chuyển 308 về trang chính. Các đường dẫn dự án cũ chuyển về miền phụ tương ứng, giữ query string.
- Bản Worker kiểm tra: `a062cc5f-088f-4237-96f3-17960299d248`.
- `npm run check`: 11 nhóm kiểm thử đạt, không có lỗi. Gồm kiểm tra asset/WebP, cookie/CSRF bản cục bộ, Supabase Bearer phía client, xóa phiên bị từ chối, tải ảnh quản trị có xác thực và không cache, ảnh chụp chỉ trong bộ nhớ, xóa dữ liệu theo phiên một giờ.
- `node tools/cloud-smoke.mjs`: 97 trang/tài nguyên/API HTTPS đạt; bốn chuyển hướng đạt; năm API quản trị không có token đều trả 401 và `no-store`.
- Kiểm tra bảo mật trước push: không có `.env`, token bí mật, database hoặc thư mục dữ liệu riêng trong commit. Supabase publishable key là khóa công khai; quyền dữ liệu được kiểm soát bằng RLS.

## Chưa hoàn tất và giới hạn kiểm tra

- Workers Builds chưa được kết nối GitHub. API báo `8000008` Git account disconnected; cần Hùng cấp GitHub App quyền đọc duy nhất kho `hunghienhoa/hunghienhoa`. Chưa có build tự động đầu tiên để xác nhận.
- Chưa đăng nhập admin bằng tài khoản thật. Hùng tự tạo user email `hunghienhoa2110@gmail.com`, đặt mật khẩu trong Supabase, cấu hình URL admin và tắt signup theo `DEPLOYMENT.md`. Connector Supabase hiện từ chối quyền kiểm tra Auth; không suy đoán user đã tồn tại hay chưa.
- Trình duyệt cục bộ bị tắt trong Work settings: chưa kiểm tra giao diện production bằng trình duyệt, điện thoại thật hoặc camera thật trong lượt này. Kiểm tra HTTPS, tài nguyên, API và VM không thay thế kiểm tra đó.
- CLI cf beta trên Windows in lỗi mô phỏng `spawn UNKNOWN` nhưng build, upload và deploy trả thành công; kiểm tra production phía trên xác nhận bản mới đang chạy.

Không đưa tài khoản kiểm thử, mật khẩu mặc định hoặc ảnh cá nhân lên production. Không tạo thêm nội dung thử trong database ở lượt kiểm tra này.

Hướng dẫn hoàn tất hai bước tài khoản nằm trong [DEPLOYMENT.md](DEPLOYMENT.md).
