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


## Dung lượng & hạn mức — chỉ dữ liệu tự động

Tab 06 chỉ đọc số liệu từ API, không có biểu mẫu nhập tay và không nhận PUT. Dữ liệu nhập tay của phiên bản cũ không được đọc lại. Không tự xóa dữ liệu, nâng gói hoặc chặn dịch vụ.

- **Supabase**: database và Storage của dự án qua RPC bảo vệ quyền admin. Database so với quota riêng dự án; Storage của dự án hiển thị riêng, không coi là tổng Storage tổ chức. Quota Storage tổ chức, egress, MAU cần quyền Management Usage API; khi chưa kết nối thì báo chưa lấy được, không dùng số ước đoán hay 0.
- **GitHub**: dung lượng mã nguồn, cache và artifact của repo qua REST API dùng secret GITHUB_USAGE_TOKEN chỉ đọc Actions/Metadata của repo hunghienhoa. Billing tháng dùng quyền Plan Read-only, hiển thị tổng phí trước miễn giảm, được miễn giảm, phải trả và phút chạy toàn tài khoản. Phút gồm cả workflow công khai được miễn phí; không so tổng phí trước miễn giảm với quota compute. Artifacts được phân trang; không hiển thị tổng thiếu trang. Dung lượng artifact và LFS toàn tài khoản chưa có nguồn API đúng đơn vị; không quy GB-giờ billing thành dung lượng hiện tại. Token hết hạn ngày 11/02/2027, cần thay token cùng quyền để tiếp tục đồng bộ. Không coi số repo là số toàn tài khoản.
- **Cloudflare**: requests Worker ngày/tháng, requests Durable Objects, dòng đọc/ghi SQLite và dung lượng SQLite lấy từ GraphQL Analytics toàn tài khoản. Ngày và tháng dương lịch theo UTC; ngày mới lúc 07:00 Việt Nam. Dung lượng SQLite là tổng đỉnh từng namespace trong ngày, không phải billing chính xác từng thời điểm; không có mẫu thì không ghi 0.

Tab tự làm mới mỗi 5 phút khi đang mở và trình duyệt đang hiển thị. Nút Làm mới cũng chỉ tải API. Lỗi API hoặc thiếu quyền không được biến thành 0, và số nhập tay cũ không được dùng để lấp chỗ trống. Chỉ số chưa có API nằm trong nhóm thu gọn riêng. Cảnh báo từ 80% và 100% chỉ tính khi có số liệu.

Trên điện thoại, chọn Supabase/GitHub/Cloudflare bằng ba nút cố định phía trên để xem từng dịch vụ; phần giải thích và chỉ số chưa có quyền API mặc định thu gọn. Trên máy tính vẫn thấy đủ ba dịch vụ, các số liệu xếp hai cột.

Database RPC dùng SECURITY INVOKER. Tổng Storage cần đọc độc lập với RLS bucket nên helper SECURITY DEFINER nằm trong schema usage_private không được expose Data API, chỉ trả một số tổng, kiểm tra auth.uid và email admin, không cấp execute cho PUBLIC/anon. RPC public chỉ là wrapper SECURITY INVOKER. Cả hai RPC được kiểm tra quyền admin/non-admin.

Cloudflare dùng secret CLOUDFLARE_USAGE_TOKEN, chỉ Account Analytics Read của đúng tài khoản, hết hạn 11/11/2027. Giữ bindings.secret() trong cloudflare.config.ts khi deploy. Không ghi secret ra mã nguồn hoặc log. Hạn mức gói Free tham khảo tài liệu ngày 11/11/2026; dashboard nhà cung cấp là nguồn đối chiếu chính thức.

Nguồn: [Supabase](https://supabase.com/docs/guides/platform/billing-on-supabase), [GitHub](https://docs.github.com/en/billing/reference/product-usage-included), [Workers](https://developers.cloudflare.com/workers/platform/pricing/), [Durable Objects](https://developers.cloudflare.com/durable-objects/observability/metrics-and-analytics/).

Kiểm tra: npm run check; node tools/browser-usage-audit.mjs. Bộ kiểm tra browser dùng tài khoản cục bộ và API fixture tự động, không cần mật khẩu production.
