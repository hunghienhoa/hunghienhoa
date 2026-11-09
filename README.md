# Hùng Hiền Hòa — Một hộp đầy ý tưởng

Hướng dẫn GitHub, Supabase, Cloudflare và kết nối tên miền nằm trong [DEPLOYMENT.md](DEPLOYMENT.md).

Hồ sơ sáng tạo dùng HTML, CSS và JavaScript. Máy chủ Node.js 24+ với SQLite dùng cho bản cục bộ; bản online chạy Cloudflare Worker và Supabase. Toàn bộ giao diện dùng tiếng Việt, trừ tên riêng các nền tảng mạng xã hội và định dạng tệp.

## Dự án đã làm và Hộp Ảnh

Mục `#projects` có Hộp Ảnh và Góc tò mò, trang chia sẻ những điều thú vị. Sáu thiết kế mẫu ở `#work` vẫn được ghi rõ là nội dung minh họa. Không thêm khách hàng, kinh nghiệm hay dự án cũ chưa được cung cấp. Ba bài đầu được ghi rõ là bài viết mẫu và có thể sửa/xóa trong quản trị.

Hộp Ảnh mở bằng liên kết `#photobooth-project` trong cửa sổ riêng; nếu trình duyệt chặn cửa sổ bật lên, liên kết thông thường vẫn mở được trong thẻ mới. Luồng chụp bốn ảnh → chọn khung → tải về tham khảo cấu trúc Fotogram tại `https://www.fotogramstudios.com/`, dùng giao diện, nội dung và tài sản riêng theo phong cách hiện tại.

`dist/photobooth/`, `dist/blog/` và `dist/admin/` chứa giao diện riêng, phông chữ và tài sản cần thiết. Cloudflare Worker phục vụ API cùng origin và ánh xạ `admin`, `blog`, `photobooth` theo hostname; tên miền chỉ hoạt động sau khi zone Cloudflare được kích hoạt. Xem `server/README.md`, `API-CONTRACT.md` và `DEPLOYMENT.md` trước khi triển khai.

Logo mạng xã hội hiện dùng ảnh chính thức tại `dist/assets/social/` thay cho ký tự mô phỏng. Xem nguồn trong `SOCIAL-LOGO-SOURCES.md`.

Các hoa thị trang trí toàn trang hiện dùng sticker SVG sáu cánh bản dày có mắt/miệng, viền tím và vân giấy nhẹ theo hình tham khảo. Năm bảng màu xanh, tím, lục, vàng và coral nằm trong `dist/assets/asterisk-*-face.svg`; kích thước và bố cục dùng `dist/stickers.css`. Giữ riêng sáu chuyển động; không phụ thuộc font ký hiệu trên điện thoại. Các ngôi sao năm cánh, trái tim, chữ và font được giữ nguyên.

Bố cục điện thoại/tablet được sửa trong `dist/mobile-fixes.css`: điều hướng hai hàng, hộp hero căn giữa và thu đúng tỷ lệ, vật thể trong cửa sổ chi tiết vừa khung, nút điều khiển tối thiểu 44px và social một cột ở khổ nhỏ. Xem phạm vi kiểm tra trong `MOBILE-QA.md`.

Sau khi thêm blog, đã tách giấy ghi chú khỏi chữ trong thẻ dự án trên điện thoại, để thẻ giới thiệu/lời chào tự giãn và chừa hàng riêng cho hoa thị liên hệ. Chữ có dấu tăng khoảng dòng, chú thích mẫu xếp dọc; phần giới thiệu/liên hệ xếp một cột từ 1000px trở xuống. Xem giới hạn kiểm tra trực quan của lượt mới trong `MOBILE-QA.md`.

## Chạy tại máy

Chạy `node server/server.mjs` trong thư mục này, mở http://127.0.0.1:4180. Các trang: `/photobooth/`, `/blog/`, `/admin/`. Dừng máy chủ xem tĩnh cũ nếu cổng đang bận. Không dùng Python HTTP server cho tính năng bài viết và duyệt khung vì không có API.

Lần đầu mở `/admin/`, **Hùng tự tạo mật khẩu** từ 12 ký tự. Không có tài khoản hay mật khẩu mặc định. Trên Windows, dữ liệu SQLite riêng mặc định ở `%LOCALAPPDATA%/HungHienHoa/portfolio-data`, ngoài webroot và ngoài OneDrive; môi trường khác dùng `private-data/` hoặc `DATA_DIR`. Không đóng gói dữ liệu riêng vào Git/ZIP. Chưa có database cloud hoặc tên miền công khai.

## Xưởng khung, dữ liệu và WebP

Hộp Ảnh có khung tự tạo: bảng màu, chữ, họa tiết, nhãn dán, dùng ngay hoặc tải WebP trống. Người dùng có thể chủ động gửi thiết kế cùng tên ghi công, liên kết công khai và liên hệ riêng tùy chọn để Hùng duyệt. Khung đang chờ không hiện công khai; quá một giờ sẽ xóa cùng ảnh khung và thông tin riêng. Khi được duyệt, giữ khung/tên/liên kết công khai và xóa thông tin liên hệ riêng.

Ảnh chụp/chọn để ghép **không gửi máy chủ**, chỉ ở bộ nhớ phiên, xóa sau một giờ hoặc khi rời trang. Không lưu localStorage/IndexedDB. Thiết kế gửi duyệt được vẽ trên canvas khung trống riêng, không lấy từ canvas có ảnh cá nhân. Tệp người dùng tải về là bản họ chủ động lưu trên thiết bị.

Mọi raster phục vụ trên web dùng WebP, giữ SVG gốc. Sáu logo PNG đã chuyển WebP lossless, giảm 128.244 xuống 85.180 byte (33,6%), giữ nguyên RGBA. Bản nguồn PNG ở `source-assets/original-png/`, không phục vụ HTTP. Từ nay dùng `python tools/convert-webp.py` cho PNG mới; `python tools/convert-webp.py --check` và `node check.cjs` chặn PNG trong `dist`. Ảnh bìa bài viết được đổi WebP trong trình duyệt trước khi lưu.

## Chỉnh nội dung

- `dist/index.html`: tên, giới thiệu, nhãn dự án, phần liên hệ.
- `dist/app.js`: mô tả các concept và hành vi tương tác.
- `dist/style.css`: màu, bố cục và hiệu ứng; `dist/vietnamese.css` điều chỉnh cho chữ tiếng Việt, `dist/completed-work.css` trình bày mục dự án đã làm và `dist/project-window.js` mở trang riêng.
- `dist/bubble-wrap.css` và `dist/assets/bubble-wrap-photo.webp`: chỉ dùng chung chất liệu xốp nhựa tạo bằng Imagegen, lớp nền và film phía trước đứng yên. Xem prompt và nguồn asset trong `IMAGEGEN.md`.
- `dist/motion-123.css` và `dist/motion-456.css`: sáu cảnh có bộ props và chuyển động riêng theo sáu GIF. Không dùng một vòng sticker chung. Nội dung props nằm trong `.scene-props` của từng cảnh, giữ nguyên khi clone vào cửa sổ chi tiết; hiệu ứng tự chạy và hỗ trợ cài đặt giảm chuyển động của thiết bị.

| Cảnh | Mẫu tham khảo | Chuyển động riêng |
| --- | --- | --- |
| 01 Nắng / Branding | `557c57…gif` | Tay và sticker bung ra, giữ rồi thu vào; logo treo đung đưa. |
| 02 Bật chất riêng / Media | `4ed855…gif` | Tay luôn hiện và vẫy, hoa xoay, sao nhún; huy hiệu hạ/nâng. |
| 03 Tần Số / Event | `72b8e2…gif` | Sao và asterisk chạy đổi bên sau cassette; tay vẫy và nốt nhạc hạ xuống. |
| 04 Chạm / Layout | `53c013…gif` | CD lùa vào từ cạnh rồi trượt xuống dưới hộp, xoay và thu về. |
| 05 Mộc / Packaging | `22b98e…gif` | Hai dải họa tiết dồn về giữa rồi tách ra, bộ hình thoi trượt ngang và nhãn trà thả xuống. |
| 06 Những điều bé xíu / Illustration | `ed8fc2…gif` | Hai cánh giấy mở ngang sau bìa và thu lại, thẻ sách hạ xuống riêng. |
- `dist/assets/`: sticker SVG gốc, có thể thay bằng hình dự án thật.
- `dist/fonts/`: SVN-Gilroy từ dự án hiện có theo yêu cầu người dùng. Quyền sử dụng webfont chưa được xác minh.

Phối chữ: SVN-Gilroy giữ vai trò chính cho nội dung, điều hướng, nút và thiết kế dự án. Playfair Display SemiBold nghiêng nhấn ở “Ý TƯỞNG”, các đoạn tiêu đề như “đã làm.”, “ý tưởng.”, “Hùng.”, “MỞ HỘP.” và ghi chú viết nghiêng; bản đứng dùng cho lời dẫn phần giới thiệu. Hai WOFF2 được lưu cùng website, gồm ký tự tiếng Việt; giấy phép SIL OFL1.1 đi kèm ở `dist/fonts/Playfair-Display-OFL.txt`.

Sáu dự án đều là concept minh họa; không phải khách hàng, kinh nghiệm hay dự án thực tế của chủ portfolio. Tên gọi là Hùng; tên hiển thị đầy đủ Hùng Hiền Hòa, trong đó Hiền Hòa là phần tên theo sau. Không sao chép thông tin cá nhân hoặc đồ án của tác giả bộ ảnh tham khảo.

Phần liên hệ dùng email và số điện thoại do người dùng cung cấp: nút gửi email mở ứng dụng thư, số điện thoại mở trình gọi và Zalo dùng liên kết theo số điện thoại. Facebook, Instagram, Threads, TikTok và YouTube trỏ tới URL người dùng cung cấp; kênh YouTube là `https://www.youtube.com/@hunghienhoa98886`. WeChat sao chép ID `bqhtit` khi bấm nút; thông báo thành công tự ẩn sau 3 giây. Hướng dẫn sao chép thủ công vẫn hiển thị nếu trình duyệt từ chối clipboard. Không gửi tin nhắn tự động. Giao diện liên hệ nằm trong `dist/contact.css`, xử lý WeChat trong `dist/contact.js`.

Hiệu ứng: hộp mở bằng thao tác chạm, sticker lắc/nảy, dải chữ chạy, cassette quay, CD xoay, ánh nilon khi hover, nội dung xuất hiện khi cuộn. Hiệu ứng tự chạy, đã bỏ nút tạm dừng theo yêu cầu; vẫn hỗ trợ prefers-reduced-motion. Dialog dùng phần tử HTML gốc hỗ trợ Escape và giữ focus.
