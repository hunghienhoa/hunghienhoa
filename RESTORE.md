# Khôi phục bản web đã lưu

Mở [GitHub Releases](https://github.com/hunghienhoa/hunghienhoa/releases), chọn phiên bản và tải **hunghienhoa-source-….zip**. Gói **web** chỉ chứa giao diện, không đủ để chạy API quản trị.

1. Giải nén vào thư mục mới, giữ cấu trúc các thư mục.
2. Cài Node.js theo `.node-version`, mở terminal tại thư mục đã giải nén.
3. Chạy `npm ci`, `npm run check`, rồi `node server/server.mjs`.
4. Mở `http://127.0.0.1:4180/`. Tự thiết lập mật khẩu quản trị khi chạy cục bộ lần đầu.
5. Để triển khai lại cloud, đọc `DEPLOYMENT.md`, kết nối lại tài khoản Cloudflare/Supabase và thiết lập secrets riêng; gói không chứa credentials. Không triển khai bản cũ đè dữ liệu hiện tại khi chưa kiểm tra migration tương thích.

`BACKUP-MANIFEST.json` ghi commit và SHA-256 từng tệp; `SHA256SUMS.txt` ở Releases chứa mã kiểm tra gói ZIP. Trên PowerShell, dùng `Get-FileHash .\ten-goi.zip -Algorithm SHA256` để đối chiếu.

Đây là bản sao mã nguồn/giao diện, **không phải bản sao database**. Bài blog, cấu hình đã sửa trên cloud, khung đã duyệt và tài khoản Supabase cần sao lưu database/storage riêng. Ảnh chụp cá nhân và bản chờ duyệt hết hạn không được đưa vào backup.

Sau mỗi lần triển khai `main` thành công, workflow “Lưu bản web” tự tạo một Release mang ngày giờ UTC và mã commit. Có thể chạy thủ công workflow trong Actions. Mỗi phiên bản có gói source, web và checksum; các bản cũ được giữ lại.
