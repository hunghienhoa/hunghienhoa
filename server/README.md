# Máy chủ nội dung và quản trị

Dùng Node.js 24 trở lên có `node:sqlite`; máy hiện tại dùng Node 26. Không cần cài thư viện.

Từ thư mục project:

```powershell
node server/server.mjs
```

Mặc định chỉ phục vụ trên `http://127.0.0.1:4180`. Dừng máy chủ cũ chiếm cổng trước khi chạy. Trang chính, `/photobooth/`, `/blog/` và `/admin/` cùng dùng API `/api`.

## Thiết lập quản trị

Lần đầu vào `/admin/`, chủ website tự tạo mật khẩu từ 12–128 ký tự. Không có mật khẩu mặc định. Thiết lập không cần token chỉ được bật khi server bind loopback, yêu cầu đến từ loopback, Origin hợp lệ và không chạy chế độ production. Mật khẩu lưu dưới dạng scrypt với salt ngẫu nhiên; phiên HttpOnly/SameSite Strict có thời hạn tám giờ. Thao tác ghi quản trị cần cookie, token CSRF và Origin hợp lệ.

Khi triển khai public cần `NODE_ENV=production`, HTTPS qua reverse proxy và `ADMIN_SETUP_TOKEN` ngẫu nhiên tối thiểu 32 ký tự cho lần tạo quản trị đầu tiên. Không đưa token vào mã frontend hoặc commit vào Git. Sau khi thiết lập tài khoản có thể bỏ biến token. Giao diện quản trị không cung cấp cách bỏ qua đăng nhập.

Các biến cấu hình:

| Biến | Mặc định / ý nghĩa |
| --- | --- |
| `PORT` | `4180` |
| `HOST` | `127.0.0.1`; chỉ đổi khi thực sự triển khai có cấu hình mạng/HTTPS |
| `DATA_DIR` | Windows cục bộ: `%LOCALAPPDATA%/HungHienHoa/portfolio-data`, nằm ngoài thư mục OneDrive. Môi trường khác: `private-data` trong project. Luôn phải nằm ngoài `dist` và thư mục sao lưu/đồng bộ bản chờ. |
| `NODE_ENV` | Đặt `production` khi triển khai để bật cookie Secure và khóa setup loopback |
| `ADMIN_SETUP_TOKEN` | Token máy chủ cho lần thiết lập đầu khi public; không có giá trị mặc định |
| `ALLOWED_ORIGINS` | Danh sách origin HTTP/HTTPS đầy đủ ngăn bằng dấu phẩy; không wildcard; ví dụ `https://admin.hunghienhoa.com,https://hunghienhoa.com` |
| `ADMIN_HOST` | `admin.hunghienhoa.com`; host này phục vụ giao diện `dist/admin` ở gốc domain |

Khi tách domain, giữ API quản trị cùng origin với trang admin qua reverse proxy để cookie hoạt động ổn định. API public hỗ trợ CORS theo allowlist; cấu hình `window.HUNG_API_BASE` ở frontend nếu cần. Không tin `X-Forwarded-For`; giới hạn tần suất hiện dùng IP socket, nên khi đặt sau proxy cần rà lại giới hạn theo hạ tầng trước khi public nhiều người dùng.

## Dữ liệu và thời hạn

SQLite `content.sqlite` nằm ngoài webroot; trên máy Windows này mặc định ở `%LOCALAPPDATA%/HungHienHoa/portfolio-data` để tránh đồng bộ bản chờ vào OneDrive. Không đóng gói thư mục dữ liệu riêng vào ZIP/mã deploy; không thêm thư mục này vào tác vụ sao lưu bản chờ. Server không có API nhận ảnh chụp hay dải ảnh cá nhân. Payload đóng góp chỉ nhận cấu hình và poster thiết kế khung WebP 720×2180, tối đa 1 MB, kèm thông tin tác giả có sự đồng ý. Không nhận PNG/SVG, ảnh động hoặc metadata EXIF/XMP trong ảnh đóng góp.

Bản chờ duyệt, ảnh poster và liên hệ riêng có `expires_at` sau đúng một giờ. Server chặn đọc/duyệt khi hết hạn, dọn bằng bộ định giờ gần nhất và dọn trước khi phục vụ sau mỗi lần khởi động lại. SQLite bật `secure_delete`, dùng journal DELETE. Từ chối xóa ngay; duyệt chuyển poster/thiết kế/tên và liên kết công khai sang thư viện, đồng thời xóa bản chờ và liên hệ riêng. Khung đã duyệt không bị bộ dọn một giờ xóa.

Server phải đang chạy thì bộ định giờ mới thực thi; nếu máy chủ tắt, dữ liệu quá hạn được xóa ngay lúc chạy lại trước khi nhận yêu cầu. Không dùng TTL tự động của dịch vụ database làm lời hứa xóa đúng một giờ. Khi đổi sang database/cloud khác, phải giữ bộ chặn đọc hết hạn và tác vụ dọn tương đương.

Ba bài viết ban đầu được gắn nhãn bài mẫu. Nội dung là văn bản, không thực thi HTML; frontend phải tiếp tục render bằng DOM text an toàn.

## Kiểm tra

```powershell
node server/server.test.mjs
```

Các bài kiểm tra chạy cổng ngẫu nhiên và thư mục tạm riêng, không thiết lập tài khoản quản trị thật hoặc sửa dữ liệu người dùng. Kiểm tra xác thực, CSRF/Origin, nháp/công khai, CRUD, ảnh WebP, không rò liên hệ riêng, duyệt/giữ khung, hết hạn/khởi động lại, bộ định giờ, giới hạn dữ liệu/tần suất và chặn truy cập file riêng.
