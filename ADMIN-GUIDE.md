# Quản trị các trang của Hùng

Đăng nhập [admin.hunghienhoa.com](https://admin.hunghienhoa.com/) bằng tài khoản quản trị hiện có.

- **Tổng quan**: số bài/khung và lượt xem tổng, hôm nay, 7 ngày, 30 ngày. Có phân chia Trang chính, Blog, Photobooth và biểu đồ từng ngày. Nhấn “Làm mới số liệu” để cập nhật.
- **Nội dung web**: sửa thông tin chung, rồi dùng “Tùy chỉnh cả bốn trang” để tìm và sửa từng đoạn chữ, đổi màu nền/chữ/nhấn hoặc thay liên kết mạng xã hội. Nội dung được chia theo trang. “Khôi phục chữ gốc” đặt lại một mục; nhấn “Lưu tùy chỉnh toàn trang” mới lưu thay đổi.
- **Bài viết**, **Khung chờ duyệt**, **Thư viện khung**: tiếp tục quản lý nội dung như trước. Chức năng chụp, đăng nhập, bố cục và mã nguồn được quản lý trong GitHub; trình sửa nội dung không thực thi HTML/JavaScript tùy ý.

Sau khi lưu, tải lại trang công khai để xem. Việc sửa chữ không làm mất ảnh, nhãn dán hoặc hành vi của nút/liên kết. Bài blog vẫn dùng trình biên tập bài riêng; khung dùng xưởng thiết kế và thư viện.

## Ý nghĩa số liệu

Bộ đếm bắt đầu khi triển khai tính năng, không khôi phục lịch sử trước đó. Mỗi lượt tải thành công trang chính/Blog/Photobooth được tính một lượt xem; tải lại trang có thể tăng số đếm. Không phải số người duy nhất và không đếm thao tác trong trang đơn như mở bài blog khi không tải lại tài liệu. Bot nhận diện qua User-Agent, trang quản trị, API, ảnh và tài nguyên không được đếm. Bot không nhận diện được vẫn có thể ảnh hưởng số liệu.

Số liệu chỉ gồm ngày theo giờ Việt Nam, tên nhóm trang và số lượt. Không lưu IP, cookie, tài khoản khách, referrer, ảnh hoặc nội dung biểu mẫu. Chi tiết theo ngày giữ 90 ngày; tổng lượt theo trang được giữ. Trên cloud dùng Cloudflare Durable Object SQLite; trên máy dùng database cục bộ riêng. API xem thống kê yêu cầu quyền admin Supabase trên cloud hoặc phiên admin cục bộ.

Các gói GitHub Releases là backup mã nguồn/giao diện, không bao gồm số liệu thống kê, database hay nội dung động Supabase. Releases có tên “Portfolio Hùng Hiền Hòa V.xxx”; số thứ tự tự tăng theo lần chạy workflow lưu bản web.
