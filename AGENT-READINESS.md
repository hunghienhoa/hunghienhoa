# Nội dung dành cho agent và công cụ tìm kiếm

## URL và giao thức

Trên ba tên miền công khai `hunghienhoa.com`, `blog.hunghienhoa.com`, `photobooth.hunghienhoa.com`:

- `/` và `/index.html`: GET/HEAD với `Accept: text/markdown` trả Markdown; `Accept: text/html` trả HTML. Tôn trọng trọng số `q`, wildcard, loại bị từ chối với `q=0`; trả 406 nếu không có định dạng phù hợp. Phản hồi có `Vary: Accept` và `Cache-Control: no-store`.
- `/index.md`: bản Markdown trực tiếp. Blog hỗ trợ `?bai=slug` cho bài đã xuất bản.
- `/llms.txt`: theo cấu trúc đề xuất llms.txt v2: H1, tóm tắt blockquote, ghi chú và các danh sách liên kết dưới H2. Có phần “When to use this” với tình huống phù hợp và đường dẫn đọc.
- `/agent-instructions.md`: cách truy cập, trường hợp sử dụng, giới hạn hành động và riêng tư.
- `/sitemap.xml`: XML theo giao thức sitemaps.org, chỉ URL cùng host. Sitemap Blog lấy bài đã xuất bản. Không gán lastmod tùy ý.
- `/robots.txt`: cho phép nội dung công khai, chỉ sitemap và loại API/admin khỏi thu thập. Robots không thay thế phân quyền.
- URL không tồn tại với Accept Markdown: HTTP **404**, `text/markdown`, lời giải thích và liên kết `/llms.txt`.

Admin có robots `Disallow: /`; không phát hành Markdown, llms, hướng dẫn hoặc sitemap. API admin vẫn yêu cầu quyền hiện có, không chuyển lỗi đăng nhập thành nội dung công khai.

## Nội dung và nhận diện

HTML có canonical, mô tả, từ khóa, Open Graph, alternate Markdown, describedby llms và JSON-LD. Trang chính khai báo ProfilePage/Person đúng danh tính Hùng, liên kết mạng xã hội HTTPS, dự án SoftwareApplication Hộp Ảnh và Blog. Không thêm đánh giá, khách hàng, chứng chỉ hoặc thành tích không có thật.

Các bộ dựng nội dung dùng cùng settings và pageTexts được admin lưu, cùng truy vấn chỉ bài published. Không đọc token, bản chờ duyệt, ảnh chụp, khung riêng hoặc database quản trị để tạo Markdown. Markdown là bản tóm lược có chọn lọc, không sao chép nhãn trang trí hay giao diện quản trị. JSON-LD được escape trước khi chèn vào HTML; CSP nonce/AdSense và giao diện hiện tại được giữ.

Giới hạn hiện tại: một sitemap tối đa 50.000 URL. Nếu vượt giới hạn, cần chia sitemap và thêm sitemap index; không tự cắt bỏ URL. Bài mẫu được ghi rõ, bài nháp không được công khai.

## Kiểm tra

```powershell
curl.exe -sS -L -i -H "Accept: text/markdown" https://hunghienhoa.com/
curl.exe -sS -L -i -H "Accept: text/html" https://hunghienhoa.com/
curl.exe -sS -L -i -H "Accept: text/markdown" https://hunghienhoa.com/__ora-404-probe-7k3ld154
npm run check
node tools/agent-smoke.mjs
```

Kiểm tra cả status, Content-Type, Vary và nội dung; riêng 404 phải có lời giải thích và liên kết. CI chạy kiểm thử cục bộ trước triển khai, rồi kiểm tra endpoint thật trước khi coi lần triển khai thành công và tạo Release.

## Việc cần chủ trang thực hiện

Xác minh quyền sở hữu tên miền trong Google Search Console rồi gửi sitemap của ba tên miền công khai; theo dõi lập chỉ mục và truy vấn thương hiệu. Bổ sung bài/dự án thật và các liên kết nhắc đến thương hiệu có nguồn gốc thật. Không thể bảo đảm top 10, thời gian lập chỉ mục hay điểm Ora bằng thay đổi kỹ thuật; cần chạy lại audit sau triển khai.

## Nguồn

- https://llmstxt.org/
- https://acceptmarkdown.com/reference
- https://www.rfc-editor.org/rfc/rfc9110.html#section-12.5.1
- https://www.rfc-editor.org/rfc/rfc7763
- https://www.sitemaps.org/protocol.html
- https://schema.org/Person
- https://developers.google.com/search/docs/appearance/structured-data/profile-page
