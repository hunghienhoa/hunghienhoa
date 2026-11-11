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


## Dung lượng & hạn mức

Tab 06 theo dõi Supabase, GitHub và Cloudflare Free; cảnh báo 80% và 100%, hiển thị lượng còn lại. Số liệu chưa nhập là chưa biết, không được coi là 0. Quota tham khảo tài liệu chính thức ngày 11/11/2026, dùng chung tài khoản/tổ chức trừ database Supabase tính theo dự án. Tab không tự xóa dữ liệu, nâng gói hay chặn dịch vụ.

- Nhấn **Mở dashboard**, xem mức dùng, mở **Cập nhật từ dashboard** ở chỉ số tương ứng rồi lưu. Hạn mức ngày của Cloudflare dùng UTC, reset lúc 07:00 Việt Nam. Số liệu của ngày cũ không dùng cho ngày mới.
- Với chỉ số tháng, nhập đúng ngày đầu/cuối kỳ theo dashboard từng dịch vụ (ngày cuối tính cả ngày). Không mặc định mọi tài khoản reset ngày 1. Qua kỳ, số liệu cũ được đánh dấu hết kỳ và cần nhập lại; dung lượng đang lưu không tự reset.
- Nút **Làm mới** tải snapshot đã lưu, không biến số nhập tay thành đo tự động. Snapshot hơn 24 giờ có nhắc cập nhật. Database Supabase, dung lượng repo/artifact GitHub và request Worker theo ngày tự lấy từ API khi mở/làm mới tab. Quota billing còn lại vẫn nhập từ dashboard; số nhập tay không tự tăng theo lưu lượng. Hạn mức GitHub compute là 12 USD/tháng được bao gồm, không phải 2.000 phút cố định. GitHub artifact storage hiển thị dung lượng tại thời điểm nhập; cách tính billing có thể dùng mức trung bình theo giờ.
- Database Supabase đo tự động qua RPC admin_database_usage, SECURITY INVOKER, chỉ cho tài khoản admin có phiên hợp lệ; không cần Management token. Chỉ đo pg_database_size, không đọc bản ghi cá nhân. GitHub đọc hai API công khai của repo hunghienhoa/hunghienhoa, không dùng token GitHub cá nhân. Dung lượng repo/artifact hiển thị riêng, không trừ vào quota tổng toàn tài khoản. Nếu hơn 100 artifacts thì không tổng hợp danh sách thiếu mà báo API chưa trả đủ dữ liệu.
- Cloud lưu tối đa một snapshot mỗi chỉ số trong Durable Object SQLite hiện có, migration Supabase admin_database_usage chỉ tạo hàm đo database, không thay đổi bảng hay dữ liệu. Bản cục bộ lưu trong database SQLite riêng. Đây không phải lịch sử billing. API GET/PUT /api/admin/usage yêu cầu admin; PUT cục bộ còn kiểm tra CSRF/Origin. Snapshot không nằm trong nội dung web công khai hay browser storage.

Nguồn: [Supabase](https://supabase.com/docs/guides/platform/billing-on-supabase), [GitHub](https://docs.github.com/en/billing/reference/product-usage-included), [Workers](https://developers.cloudflare.com/workers/platform/pricing/), [Durable Objects](https://developers.cloudflare.com/durable-objects/platform/pricing/).

Kiểm tra: npm run check; node tools/browser-usage-audit.mjs (Chrome/Playwright đã cài, chỉ dùng database thử tạm thời).

Kết nối Cloudflare: secret CLOUDFLARE_USAGE_TOKEN chỉ có Account Analytics Read trên đúng tài khoản, hết hạn 11/11/2027. Giữ bindings.secret() trong cloudflare.config.ts khi deploy. Số request Worker hôm nay lấy từ GraphQL Analytics toàn tài khoản theo UTC, có thể trễ/lấy mẫu; không giả lập tổng tháng từ số ngày. Không lưu secret vào mã nguồn.
