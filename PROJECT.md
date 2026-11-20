# Hướng dẫn mã nguồn — Hùng Hiền Hòa

Hướng dẫn GitHub, Supabase, Cloudflare và kết nối tên miền nằm trong [DEPLOYMENT.md](DEPLOYMENT.md).

Hồ sơ sáng tạo dùng HTML, CSS và JavaScript. Máy chủ Node.js 24+ với SQLite dùng cho bản cục bộ; bản online chạy Cloudflare Worker và Supabase. Toàn bộ giao diện dùng tiếng Việt, trừ tên riêng các nền tảng mạng xã hội và định dạng tệp.

## Dự án đã làm và Hộp Ảnh

Mục `#projects` có Hộp Ảnh và Góc tò mò, trang chia sẻ những điều thú vị. Sáu thiết kế mẫu ở `#work` vẫn được ghi rõ là nội dung minh họa. Không thêm khách hàng, kinh nghiệm hay dự án cũ chưa được cung cấp. Ba bài đầu được ghi rõ là bài viết mẫu và có thể sửa/xóa trong quản trị.

Hộp Ảnh mở bằng liên kết `#photobooth-project` trong cửa sổ riêng; nếu trình duyệt chặn cửa sổ bật lên, liên kết thông thường vẫn mở được trong thẻ mới. Luồng chụp bốn ảnh → chọn khung → tải về tham khảo cấu trúc Fotogram tại `https://www.fotogramstudios.com/`, dùng giao diện, nội dung và tài sản riêng theo phong cách hiện tại.

`dist/photobooth/`, `dist/blog/` và `dist/admin/` chứa giao diện riêng, phông chữ và tài sản cần thiết. Cloudflare Worker phục vụ API cùng origin trên `hunghienhoa.com`, `admin.hunghienhoa.com`, `blog.hunghienhoa.com` và `photobooth.hunghienhoa.com`; HTTPS đã hoạt động, Hùng đã xác nhận đăng nhập admin thành công. Push `main` kích hoạt kiểm tra/build/triển khai bằng `.github/workflows/deploy.yml`; xem `DEPLOYMENT.md` để theo dõi GitHub Actions và quản lý khóa triển khai.

Logo mạng xã hội hiện dùng ảnh chính thức tại `dist/assets/social/` thay cho ký tự mô phỏng. Xem nguồn trong `SOCIAL-LOGO-SOURCES.md`.

Các hoa thị trang trí toàn trang hiện dùng sticker SVG sáu cánh bản dày có mắt/miệng, viền tím và vân giấy nhẹ theo hình tham khảo. Năm bảng màu xanh, tím, lục, vàng và coral nằm trong `dist/assets/asterisk-*-face.svg`; kích thước và bố cục dùng `dist/stickers.css`. Giữ riêng sáu chuyển động; không phụ thuộc font ký hiệu trên điện thoại. Các ngôi sao năm cánh, trái tim, chữ và font được giữ nguyên.

Bố cục điện thoại/tablet được sửa trong `dist/mobile-fixes.css`: điều hướng hai hàng, hộp hero căn giữa và thu đúng tỷ lệ, vật thể trong cửa sổ chi tiết vừa khung, nút điều khiển tối thiểu 44px và social một cột ở khổ nhỏ. Xem phạm vi kiểm tra trong `MOBILE-QA.md`.

Sau khi thêm blog, đã tách giấy ghi chú khỏi chữ trong thẻ dự án trên điện thoại, để thẻ giới thiệu/lời chào tự giãn và chừa hàng riêng cho hoa thị liên hệ. Chữ có dấu tăng khoảng dòng, chú thích mẫu xếp dọc; phần giới thiệu/liên hệ xếp một cột từ 1000px trở xuống. Xem giới hạn kiểm tra trực quan của lượt mới trong `MOBILE-QA.md`.

## Chạy tại máy

Chạy `node server/server.mjs` trong thư mục này, mở http://127.0.0.1:4180. Các trang: `/photobooth/`, `/blog/`, `/admin/`. Dừng máy chủ xem tĩnh cũ nếu cổng đang bận. Không dùng Python HTTP server cho tính năng bài viết và duyệt khung vì không có API.

Lần đầu mở `/admin/` trên loopback, **Hùng tự tạo mật khẩu** từ 12 ký tự. Bản online dùng Supabase Auth theo `DEPLOYMENT.md`; không có mật khẩu mặc định. Trên Windows, dữ liệu SQLite riêng mặc định ở `%LOCALAPPDATA%/HungHienHoa/portfolio-data`, ngoài webroot và ngoài OneDrive; môi trường khác dùng `private-data/` hoặc `DATA_DIR`. Không đóng gói dữ liệu riêng vào Git/ZIP; dữ liệu cục bộ không tự đồng bộ lên database cloud.

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
- `dist/fonts/` và các bản tương ứng trong trang con: Be Vietnam Pro WOFF2 có đủ dấu tiếng Việt, cùng Playfair Display. Nguồn, giấy phép SIL OFL và cách chuyển định dạng nằm trong `FONT-SOURCES.md`. Phông Gilroy cũ được giữ ngoài webroot ở `source-assets/original-fonts`.

Phối chữ: Be Vietnam Pro (400, 500, 600, 700, 800, 900) giữ vai trò chính cho nội dung, điều hướng, biểu mẫu và thiết kế dự án trên cả bốn trang. Playfair Display SemiBold đứng/nghiêng nhấn ở “Ý TƯỞNG”, các đoạn tiêu đề, lời dẫn và ghi chú. Canvas photobooth dùng cùng hai họ phông và chờ tải phông trước khi xuất WebP hoặc gửi khung trống. Mọi WOFF2 được lưu cùng website, không cần gọi Google Fonts từ trình duyệt; giấy phép SIL OFL1.1 đi kèm mỗi bộ phông.

Sáu dự án đều là concept minh họa; không phải khách hàng, kinh nghiệm hay dự án thực tế của chủ portfolio. Tên gọi là Hùng; tên hiển thị đầy đủ Hùng Hiền Hòa, trong đó Hiền Hòa là phần tên theo sau. Không sao chép thông tin cá nhân hoặc đồ án của tác giả bộ ảnh tham khảo.

Phần liên hệ dùng email và số điện thoại do người dùng cung cấp: nút gửi email mở ứng dụng thư, số điện thoại mở trình gọi và Zalo dùng liên kết theo số điện thoại. Facebook, Instagram, Threads, TikTok và YouTube trỏ tới URL người dùng cung cấp; kênh YouTube là `https://www.youtube.com/@hunghienhoa98886`. WeChat sao chép ID `bqhtit` khi bấm nút; thông báo thành công tự ẩn sau 3 giây. Hướng dẫn sao chép thủ công vẫn hiển thị nếu trình duyệt từ chối clipboard. Không gửi tin nhắn tự động. Giao diện liên hệ nằm trong `dist/contact.css`, xử lý WeChat trong `dist/contact.js`.

Hiệu ứng: hộp mở bằng thao tác chạm, sticker lắc/nảy, dải chữ chạy, cassette quay, CD xoay, ánh nilon khi hover, nội dung xuất hiện khi cuộn. Hiệu ứng tự chạy, đã bỏ nút tạm dừng theo yêu cầu; vẫn hỗ trợ prefers-reduced-motion. Dialog dùng phần tử HTML gốc hỗ trợ Escape và giữ focus.

## Kiểm tra giao diện và luồng bằng trình duyệt

Khi máy đã có Playwright hoặc `@playwright/cli` và Chrome, chạy `node tools/browser-audit.mjs`. Bộ kiểm tra tự tạo máy chủ loopback ở cổng ngẫu nhiên và dữ liệu giả trong thư mục cục bộ riêng; không dùng tài khoản hoặc dữ liệu trên website thật. Nó kiểm tra 9 trang ở 7 kích thước (320–1920 px), các bảng Admin sau đăng nhập, đọc/sao chép bài viết, gửi–duyệt khung và chụp bằng luồng video giả lập. Báo cáo JSON và ảnh kiểm tra nằm trong `tmp/`. Đây là kiểm tra Chrome với viewport mobile, không thay thế thử camera/quyền tải file trên iPhone hoặc Android thật. Bộ này tùy chọn, không nằm trong `npm run check` vì cần trình duyệt được cài trên máy.

## Snap của Hùng

Trang `https://snap.hunghienhoa.com/` (cục bộ: `/snaptik/`) tự nhận diện link TikTok, Instagram và Facebook. TikTok dùng TikWM; Instagram/Facebook đọc dữ liệu nhúng công khai trực tiếp từ nền tảng, không dùng tài khoản hoặc cookie. API Node và Worker dùng chung `server/snaptik.mjs`; chỉ truyền file từ các miền nguồn được cho phép, kiểm tra chữ ký định dạng và giới hạn mỗi file 200 MB. Không tạo kho video; ảnh tải qua giao diện chuyển thành JPEG trong bộ nhớ trình duyệt. Chỉ tải và sử dụng nội dung khi có quyền.

Không cần khóa API riêng. Nguồn TikWM có thể thay đổi, gián đoạn hoặc giới hạn truy cập; không cam kết mọi bài đều tải được. Worker giới hạn tần suất bằng binding `SNAPTIK_LIMIT`, máy chủ cục bộ dùng bộ giới hạn hiện có.

Chạy `node --test tools/snaptik.test.mjs` để kiểm tra luồng và đầu vào; `node tools/browser-snaptik.mjs` kiểm tra Chrome ở 320/390/768/1440 px bằng nguồn giả lập. Đặt `SITE_URL=https://snap.hunghienhoa.com` để kiểm tra trang thật bằng liên kết mẫu. Bộ trình duyệt không tải toàn bộ video lớn; thử việc lưu file trên thiết bị thật riêng.

## Tên website và liên kết trên Google

HTML trả từ máy chủ có `WebSite` với tên và URL chuẩn của từng tên miền công khai, `og:site_name`, một canonical và quan hệ giữa portfolio với ba dự án. Trang chính dùng các liên kết HTML trực tiếp tới Hộp Ảnh, Góc tò mò và Snap; sitemap riêng được công bố trong robots.txt của từng miền.

Google tự quyết định sitelinks và cách nhóm tên miền phụ; mã đánh dấu không bảo đảm bố cục như ảnh mẫu hoặc thời gian xuất hiện. Quản trị viên có thể gửi sitemap và yêu cầu thu thập lại URL trong Search Console đã xác minh. Xem [sitelinks](https://developers.google.com/search/docs/appearance/sitelinks) và [tên website](https://developers.google.com/search/docs/appearance/site-names).

## Skill và plugin cho Claude Code

Khai báo ở phạm vi dự án, áp dụng cho mọi phiên mở repo này (cloud và máy cục bộ):

- `.claude/settings.json` bật 7 plugin từ marketplace GitHub: `mattpocock-skills` (mattpocock/skills), `ponytail` (DietrichGebert/ponytail), `impeccable` (pbakaus/impeccable), `diagram-design` (cathrynlavery/diagram-design), `superpowers` (obra/superpowers), `taste-skill` (Leonxlnx/taste-skill), `hallmark` (Nutlope/hallmark). Lần đầu mở dự án, Claude Code có thể hỏi tin cậy và cài các plugin này. Ponytail có tùy chọn webhook, mặc định để trống nên không gửi dữ liệu ra ngoài; bảng thống kê chỉ ghi vào `~/.config/ponytail/` trên máy.
- `.claude/skills/security-audit`: chép từ cloudflare/security-audit-skill (MIT, xem `SOURCE.txt`).
- `.claude/skills/graphify`: tạo bằng `graphify install --project` (graphifyy 0.9.112). Lệnh `graphify` cần cài trên từng máy: `uv tool install graphifyy==0.9.112` (hoặc `pipx install graphifyy==0.9.112`). Hook trong `.claude/settings.json` tự bỏ qua khi máy chưa có `graphify`. Chạy `/graphify .` để dựng đồ thị lần đầu.
- Anatomy (wheresryan22/anatomy) nặng ~27 MB nên không đưa vào repo; môi trường cloud `hunghienhoa` cài nó cùng humanizer, visual-explainer, last30days, yt-dlp và Graphify qua setup script. Máy cục bộ: `git clone https://github.com/wheresryan22/anatomy ~/.claude/skills/anatomy`.

## Làm Nét

Trang `https://lamnet.hunghienhoa.com/` (cục bộ: `/lamnet/`) làm nét và phóng to ảnh 4 lần bằng Real-ESRGAN `realesr-general-x4v3` chạy trong trình duyệt qua ONNX Runtime Web 1.22.0 (WebGPU nếu máy có GPU thật, nếu không thì WebAssembly nhiều luồng trong luồng phụ). Ảnh chỉ nằm trong bộ nhớ trang, tải về JPEG, xóa khi rời trang hoặc sau một giờ.

- `dist/lamnet/core.mjs`: giới hạn kích thước (WebGPU 1024×1024, CPU 1024×768), chia ô 256px kèm viền 12px, đổi ảnh ↔ tensor, làm nét thêm sau AI (unsharp mask, chọn Tự nhiên / Nét / Rất nét). Test: `tools/lamnet.test.mjs`.
- `dist/lamnet/models/realesr-general-x4v3.onnx` dựng lại bằng `python tools/build-lamnet-model.py realesr-general-x4v3.pth` (cần numpy, onnx, onnxruntime; không cần PyTorch). Script tự đối chiếu với bản tính numpy.
- `dist/lamnet/vendor/ort-1.22.0/`: chép nguyên từ npm `onnxruntime-web@1.22.0`. Bản 1.2x mới hơn có tệp WebGPU trên 25 MiB, vượt giới hạn mỗi tệp của Cloudflare.
- Worker và máy chủ cục bộ gắn cho mọi phản hồi của Làm Nét CSP có `'wasm-unsafe-eval'` và COOP/COEP (crossOriginIsolated để WebAssembly chạy nhiều luồng). Trang không gắn mã quảng cáo.
