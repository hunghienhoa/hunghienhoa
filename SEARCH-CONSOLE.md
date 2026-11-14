# Search Console cho website của Hùng

Chọn tài sản **Miền (Domain): `hunghienhoa.com`** để quản lý cả trang chính, Blog, Hộp Ảnh và Snap. Không nhập `https://` hoặc đường dẫn vào ô tài sản Miền.

## Xác minh quyền sở hữu

1. Mở [Google Search Console](https://search.google.com/search-console) bằng tài khoản Google Hùng muốn dùng để quản lý website.
2. Chọn **Thêm tài sản → Miền**, nhập `hunghienhoa.com`.
3. Chọn bản ghi TXT. Sao chép **nguyên dòng** `google-site-verification=...` do Google cung cấp.
4. Thêm dòng này vào DNS của `hunghienhoa.com`, loại TXT, tên `@`. Giữ nguyên các bản ghi email và các mã xác minh khác. Mã này là dữ liệu DNS công khai, không phải mật khẩu hay khóa API.
5. Quay lại Search Console, bấm **Xác minh**. Không xóa TXT sau khi xác minh thành công.

Nếu tài sản đã được xác minh, giữ nguyên cách xác minh đang hoạt động; không cần tạo lại hoặc xóa tài sản. Kiểm tra ở **Cài đặt → Xác minh quyền sở hữu**.

## Gửi sitemap

Trong tài sản Miền đã xác minh, vào **Lập chỉ mục → Sơ đồ trang web**, gửi lần lượt bốn địa chỉ:

- `https://hunghienhoa.com/sitemap.xml`
- `https://blog.hunghienhoa.com/sitemap.xml`
- `https://photobooth.hunghienhoa.com/sitemap.xml`
- `https://snap.hunghienhoa.com/sitemap.xml`

Các sitemap tự sinh từ nội dung công khai. Bài nháp, dữ liệu quản trị và liên kết tải file của Snap không được đưa vào. Không cần tạo sitemap thủ công hoặc khai báo ngày cập nhật giả.

## Kiểm tra URL và yêu cầu lập chỉ mục

1. Dùng ô **Kiểm tra URL**, nhập trang chính hoặc một bài viết cụ thể.
2. Đọc trạng thái Google đã lập chỉ mục, URL chuẩn Google chọn và lần thu thập gần nhất.
3. Nếu cần, chọn **Kiểm tra URL đang hoạt động**. Khi trang truy cập được và không bị chặn lập chỉ mục, chọn **Yêu cầu lập chỉ mục**.
4. Theo dõi báo cáo **Trang** và **Hiệu suất → Kết quả tìm kiếm**. Các truy vấn thương hiệu nên theo dõi gồm Hùng Hiền Hòa, Hộp Ảnh của Hùng, Góc tò mò của Hùng và Snap của Hùng; đây là truy vấn theo dõi, không phải lời hứa thứ hạng.

Không gửi trang quản trị, API hoặc bài chưa xuất bản. Không dùng Indexing API dành cho nội dung khác để ép lập chỉ mục portfolio. Không gửi lặp đi lặp lại cùng URL.

## Những phần đã có trên website

- Bốn sitemap công khai, robots.txt theo từng miền, URL chuẩn HTTPS và dữ liệu tên website.
- Nội dung bài viết và liên kết dự án đọc được từ HTML trả bởi máy chủ.
- Bài không tồn tại/chưa công khai trả 404. Phần quản trị yêu cầu đăng nhập và chặn trình thu thập.
- Thẻ meta keywords đã bỏ vì Google không dùng; cho phép bản xem trước ảnh lớn trên trang nội dung công khai.

Website sẵn sàng về kỹ thuật không đồng nghĩa tài sản đã được xác minh hoặc sitemap đã được gửi trong tài khoản Google. Chỉ kết luận các bước đó đã xong sau khi màn hình Search Console xác nhận thành công.

Nguồn: [Xác minh quyền sở hữu](https://support.google.com/webmasters/answer/9008080), [tạo và gửi sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [yêu cầu Google thu thập lại URL](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl).

## Trạng thái đã kiểm tra ngày 14/11/2026

Trong tài sản Miền `hunghienhoa.com`, đã gửi cả bốn sitemap và Google hiển thị **Thành công** cho từng sitemap: trang chính 5 URL, Blog 9 URL, Hộp Ảnh 2 URL, Snap 1 URL (tổng 17 URL được khám phá). Đây là số URL trong sitemap, không phải số trang đã lập chỉ mục.

Công cụ Kiểm tra URL xác nhận trang gốc của trang chính, Blog và Hộp Ảnh **đã lập chỉ mục**. Snap là URL mới, chưa có trong chỉ mục tại thời điểm kiểm tra; theo dõi kết quả yêu cầu lập chỉ mục riêng trong Search Console.
