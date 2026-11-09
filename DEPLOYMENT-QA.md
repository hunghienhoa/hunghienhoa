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

## Sửa biểu mẫu đăng nhập — 10/11/2026

- Hùng báo đã tạo tài khoản nhưng chưa đăng nhập được; chưa cung cấp thông báo lỗi cụ thể.
- Kiểm chứng kết nối: HTML/config/JS production đều 200, Supabase Auth settings 200, email provider bật, xác nhận email bắt buộc và CORS preflight 200. API quản trị chưa có token trả 401 đúng thiết kế.
- Phát hiện biểu mẫu đang đặt `minlength=12` cả lúc đăng nhập Supabase. Đã bỏ quy tắc tạo mật khẩu khỏi bước đăng nhập; chỉ áp dụng tối thiểu 12 ký tự khi tạo mật khẩu quản trị cục bộ. Không thay đổi mật khẩu hay chính sách xác thực của Supabase.
- Thông báo lỗi Auth đã phân biệt email chưa xác nhận, sai thông tin, giới hạn số lần thử, tài khoản bị khóa và lỗi kết nối bằng tiếng Việt. Script admin đổi URL sang `app.js?v=2` để tải bản mới.
- `npm run check`: 12 nhóm kiểm thử đạt. Live HTML không còn ràng buộc độ dài lúc đăng nhập; live JS khớp mã nguồn. Smoke 97 tài nguyên/API, bốn chuyển hướng và năm API quản trị tiếp tục đạt.
- Worker production: `48df0aad-334d-4579-a52a-0f4ad2bc4a9d`.
- Chưa coi lỗi tài khoản thật đã được giải quyết: connector Supabase vẫn từ chối quyền đọc log/advisors; cần Hùng thử lại và cung cấp dòng lỗi nếu còn thất bại. Không yêu cầu hoặc lưu mật khẩu, không gửi thử mật khẩu sai tới tài khoản thật.
