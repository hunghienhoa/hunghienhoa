# Hướng dẫn mã nguồn — Hùng Hiền Hòa

Hướng dẫn GitHub, Supabase, Cloudflare và kết nối tên miền nằm trong [DEPLOYMENT.md](DEPLOYMENT.md).

## Giao diện 2026

Website chỉ còn một tên miền và một bộ giao diện mới làm từ đầu (bố cục tham khảo supahero.io, navbar.gallery, footer.design; phông Be Vietnam Pro, phần nhấn Playfair Display nghiêng):

- `dist/ui.css`: phông, màu (`--cream`, `--blue`, `--yellow`, theo màu chỉnh trong admin), nút, thẻ, form, thanh điều hướng dạng viên nổi, footer tối nhiều cột, trang chính sách và 404. Mọi trang nạp `/ui.css`, `/i18n.js`, `/sitebar.js`, `/contact.js`, `/page-customization.js` từ gốc; không còn bản sao trong từng thư mục.
- `dist/tools.css`: phần chung của trang công cụ (hero căn giữa, các bước, riêng tư, hỏi đáp). Mỗi mục có stylesheet riêng: `home.css`, `blog/style.css`, `photobooth/style.css`, `snaptik/style.css`, `lamnet/style.css`, `admin/style.css`.
- Trang chủ (`dist/index.html`) là blog chia sẻ: bài nổi bật ở hero, lưới bài mới lọc theo chủ đề (`dist/app.js` đọc `/api/posts`), ba tiện ích Hộp Ảnh, Snap Video, Làm Nét Ảnh và giới thiệu ngắn. Ảnh "about" trong admin là ảnh đại diện ở mục Về Hùng.
- `python tools/site-chrome.py [trang.html …]` sinh lại thanh điều hướng và footer cho các trang công khai từ một mẫu. `python tools/build-content-fields.py` gắn `data-edit` cho chữ mới và ghi lại `content-fields.json` (gốc và admin). Ô chữ, ảnh dự án của giao diện cũ đã lưu được máy chủ bỏ qua khi lưu, không báo lỗi.
- **Quy tắc chữ** (biến `--fs-display`, `--fs-h2`, `--fs-h3`, `--fs-title` trong `ui.css`): Be Vietnam Pro cho mọi tiêu đề, đoạn văn, nút, nhãn, số thứ tự, dải băng và tiêu đề thẻ. Playfair Display nghiêng chỉ dùng cho: một cụm nhấn `<em>` trong tiêu đề h1/h2 (kèm vệt vàng), câu dẫn và trích dẫn trong trang đọc bài, lời chúc ở footer. Không dùng Playfair cho liên kết "Đọc bài", số, nhãn hay chữ trong hình minh họa.
- Trang chủ hiện bài nổi bật ở hero và tối đa 6 bài mới trong lưới; xem tất cả ở `/blog/`.
- Phần portfolio cũ (hộp quà, sáu thẻ thiết kế, nhãn dán, hình động tham khảo) đã xóa khỏi mã nguồn; dữ liệu Supabase (bài viết, khung) giữ nguyên.

## Dự án đã làm và Hộp Ảnh

Mục `#projects` có Hộp Ảnh và Góc tò mò, trang chia sẻ những điều thú vị. Sáu thiết kế mẫu ở `#work` vẫn được ghi rõ là nội dung minh họa. Không thêm khách hàng, kinh nghiệm hay dự án cũ chưa được cung cấp. Ba bài đầu được ghi rõ là bài viết mẫu và có thể sửa/xóa trong quản trị.

Hộp Ảnh mở bằng liên kết `#photobooth-project` trong cửa sổ riêng; nếu trình duyệt chặn cửa sổ bật lên, liên kết thông thường vẫn mở được trong thẻ mới. Luồng chụp bốn ảnh → chọn khung → tải về tham khảo cấu trúc Fotogram tại `https://www.fotogramstudios.com/`, dùng giao diện, nội dung và tài sản riêng theo phong cách hiện tại.

`dist/photobooth/`, `dist/blog/` và `dist/admin/` chứa giao diện riêng; phông, giao diện chung và script dùng chung nằm ở gốc `dist/`. Cloudflare Worker phục vụ mọi mục và API cùng origin trên một tên miền `hunghienhoa.com` (`/blog/`, `/photobooth/`, `/snaptik/`, `/lamnet/`); riêng trang quản trị ở `admin.hunghienhoa.com`; HTTPS đã hoạt động, Hùng đã xác nhận đăng nhập admin thành công. Push `main` kích hoạt kiểm tra/build/triển khai bằng `.github/workflows/deploy.yml`; xem `DEPLOYMENT.md` để theo dõi GitHub Actions và quản lý khóa triển khai.

Logo mạng xã hội hiện dùng ảnh chính thức tại `dist/assets/social/` thay cho ký tự mô phỏng. Xem nguồn trong `SOCIAL-LOGO-SOURCES.md`.

## Chạy tại máy

Chạy `node server/server.mjs` trong thư mục này, mở http://127.0.0.1:4180. Các trang: `/photobooth/`, `/blog/`, `/admin/`. Dừng máy chủ xem tĩnh cũ nếu cổng đang bận. Không dùng Python HTTP server cho tính năng bài viết và duyệt khung vì không có API.

Lần đầu mở `/admin/` trên loopback, **Hùng tự tạo mật khẩu** từ 12 ký tự. Bản online dùng Supabase Auth theo `DEPLOYMENT.md`; không có mật khẩu mặc định. Trên Windows, dữ liệu SQLite riêng mặc định ở `%LOCALAPPDATA%/HungHienHoa/portfolio-data`, ngoài webroot và ngoài OneDrive; môi trường khác dùng `private-data/` hoặc `DATA_DIR`. Không đóng gói dữ liệu riêng vào Git/ZIP; dữ liệu cục bộ không tự đồng bộ lên database cloud.

## Xưởng khung, dữ liệu và WebP

Hộp Ảnh có khung tự tạo: bảng màu, chữ, họa tiết, nhãn dán, dùng ngay hoặc tải WebP trống. Người dùng có thể chủ động gửi thiết kế cùng tên ghi công, liên kết công khai và liên hệ riêng tùy chọn để Hùng duyệt. Khung đang chờ không hiện công khai; quá một giờ sẽ xóa cùng ảnh khung và thông tin riêng. Khi được duyệt, giữ khung/tên/liên kết công khai và xóa thông tin liên hệ riêng.

Ảnh chụp/chọn để ghép **không gửi máy chủ**, chỉ ở bộ nhớ phiên, xóa sau một giờ hoặc khi rời trang. Không lưu localStorage/IndexedDB. Thiết kế gửi duyệt được vẽ trên canvas khung trống riêng, không lấy từ canvas có ảnh cá nhân. Tệp người dùng tải về là bản họ chủ động lưu trên thiết bị.

Mọi raster phục vụ trên web dùng WebP, giữ SVG gốc. Sáu logo PNG đã chuyển WebP lossless, giảm 128.244 xuống 85.180 byte (33,6%), giữ nguyên RGBA. Bản nguồn PNG ở `source-assets/original-png/`, không phục vụ HTTP. Từ nay dùng `python tools/convert-webp.py` cho PNG mới; `python tools/convert-webp.py --check` và `node check.cjs` chặn PNG trong `dist`. Ảnh bìa bài viết được đổi WebP trong trình duyệt trước khi lưu.

## Chỉnh nội dung

- `dist/index.html`: trang chủ blog: hero, bài mới, ba tiện ích, giới thiệu.
- `dist/app.js`: bài nổi bật, lưới bài mới và lọc chủ đề trên trang chủ.
- `dist/ui.css`: màu, phông, bố cục chung; `dist/home.css`: riêng trang chủ.

- `dist/assets/`: sticker SVG gốc, có thể thay bằng hình dự án thật.
- `dist/fonts/` (một bản dùng chung cho mọi trang): Be Vietnam Pro WOFF2 có đủ dấu tiếng Việt, cùng Playfair Display. Nguồn, giấy phép SIL OFL và cách chuyển định dạng nằm trong `FONT-SOURCES.md`. Phông Gilroy cũ được giữ ngoài webroot ở `source-assets/original-fonts`.

Phối chữ: Be Vietnam Pro giữ vai trò chính, theo thang độ đậm: 400 đoạn văn và câu dẫn; 500 điều hướng và thông tin phụ; 600 nút, nhãn, eyebrow, tiêu đề thẻ và h3; 700 h1/h2 và tiêu đề khối; 800 chỉ cho chữ ký "hhh." và số/chữ trang trí lớn; không dùng 900. Chữ nghiêng dùng bản Italic thật (400, 600, 700) và tắt nghiêng/đậm giả (`font-synthesis:none`). Be Vietnam Pro giữ vai trò chính cho nội dung, điều hướng, biểu mẫu và thiết kế dự án trên cả bốn trang. Playfair Display SemiBold đứng/nghiêng nhấn ở “Ý TƯỞNG”, các đoạn tiêu đề, lời dẫn và ghi chú. Canvas photobooth dùng cùng hai họ phông và chờ tải phông trước khi xuất WebP hoặc gửi khung trống. Mọi WOFF2 được lưu cùng website, không cần gọi Google Fonts từ trình duyệt; giấy phép SIL OFL1.1 đi kèm mỗi bộ phông.

Phần liên hệ dùng email và số điện thoại do người dùng cung cấp: nút gửi email mở ứng dụng thư, số điện thoại mở trình gọi và Zalo dùng liên kết theo số điện thoại. Facebook, Instagram, Threads, TikTok và YouTube trỏ tới URL người dùng cung cấp; kênh YouTube là `https://www.youtube.com/@hunghienhoa98886`. WeChat sao chép ID `bqhtit` khi bấm nút; thông báo thành công tự ẩn sau 3 giây. Hướng dẫn sao chép thủ công vẫn hiển thị nếu trình duyệt từ chối clipboard. Không gửi tin nhắn tự động. Giao diện liên hệ nằm trong `dist/contact.css`, xử lý WeChat trong `dist/contact.js`.

## Kiểm tra giao diện và luồng bằng trình duyệt

Khi máy đã có Playwright hoặc `@playwright/cli` và Chrome, chạy `node tools/browser-audit.mjs`. Bộ kiểm tra tự tạo máy chủ loopback ở cổng ngẫu nhiên và dữ liệu giả trong thư mục cục bộ riêng; không dùng tài khoản hoặc dữ liệu trên website thật. Nó kiểm tra 9 trang ở 7 kích thước (320–1920 px), các bảng Admin sau đăng nhập, đọc/sao chép bài viết, gửi–duyệt khung và chụp bằng luồng video giả lập. Báo cáo JSON và ảnh kiểm tra nằm trong `tmp/`. Đây là kiểm tra Chrome với viewport mobile, không thay thế thử camera/quyền tải file trên iPhone hoặc Android thật. Bộ này tùy chọn, không nằm trong `npm run check` vì cần trình duyệt được cài trên máy.

## Snap của Hùng

Trang `https://hunghienhoa.com/snaptik/` (cục bộ: `/snaptik/`) tự nhận diện link TikTok, Instagram và Facebook. TikTok dùng TikWM; Instagram/Facebook đọc dữ liệu nhúng công khai trực tiếp từ nền tảng, không dùng tài khoản hoặc cookie. API Node và Worker dùng chung `server/snaptik.mjs`; chỉ truyền file từ các miền nguồn được cho phép, kiểm tra chữ ký định dạng và giới hạn mỗi file 200 MB. Không tạo kho video; ảnh tải qua giao diện chuyển thành JPEG trong bộ nhớ trình duyệt. Chỉ tải và sử dụng nội dung khi có quyền.

Không cần khóa API riêng. Nguồn TikWM có thể thay đổi, gián đoạn hoặc giới hạn truy cập; không cam kết mọi bài đều tải được. Worker giới hạn tần suất bằng binding `SNAPTIK_LIMIT`, máy chủ cục bộ dùng bộ giới hạn hiện có.

Chạy `node --test tools/snaptik.test.mjs` để kiểm tra luồng và đầu vào; `node tools/browser-snaptik.mjs` kiểm tra Chrome ở 320/390/768/1440 px bằng nguồn giả lập. Đặt `SITE_URL=https://hunghienhoa.com/snaptik/` để kiểm tra trang thật bằng liên kết mẫu. Bộ trình duyệt không tải toàn bộ video lớn; thử việc lưu file trên thiết bị thật riêng.

## Tên website và liên kết trên Google

HTML trả từ máy chủ có `WebSite` với tên và URL chuẩn của từng tên miền công khai, `og:site_name`, một canonical và quan hệ giữa portfolio với ba dự án. Trang chính dùng các liên kết HTML trực tiếp tới Hộp Ảnh, Góc tò mò và Snap; sitemap riêng được công bố trong robots.txt của từng miền.

Google tự quyết định sitelinks; mã đánh dấu không bảo đảm bố cục như ảnh mẫu hoặc thời gian xuất hiện. Quản trị viên có thể gửi sitemap và yêu cầu thu thập lại URL trong Search Console đã xác minh. Xem [sitelinks](https://developers.google.com/search/docs/appearance/sitelinks) và [tên website](https://developers.google.com/search/docs/appearance/site-names).

## Skill và plugin cho Claude Code

Khai báo ở phạm vi dự án, áp dụng cho mọi phiên mở repo này (cloud và máy cục bộ):

- `.claude/settings.json` bật 7 plugin từ marketplace GitHub: `mattpocock-skills` (mattpocock/skills), `ponytail` (DietrichGebert/ponytail), `impeccable` (pbakaus/impeccable), `diagram-design` (cathrynlavery/diagram-design), `superpowers` (obra/superpowers), `taste-skill` (Leonxlnx/taste-skill), `hallmark` (Nutlope/hallmark). Lần đầu mở dự án, Claude Code có thể hỏi tin cậy và cài các plugin này. Ponytail có tùy chọn webhook, mặc định để trống nên không gửi dữ liệu ra ngoài; bảng thống kê chỉ ghi vào `~/.config/ponytail/` trên máy.
- `.claude/skills/security-audit`: chép từ cloudflare/security-audit-skill (MIT, xem `SOURCE.txt`).
- `.claude/skills/graphify`: tạo bằng `graphify install --project` (graphifyy 0.9.112). Lệnh `graphify` cần cài trên từng máy: `uv tool install graphifyy==0.9.112` (hoặc `pipx install graphifyy==0.9.112`). Hook trong `.claude/settings.json` tự bỏ qua khi máy chưa có `graphify`. Chạy `/graphify .` để dựng đồ thị lần đầu.
- Anatomy (wheresryan22/anatomy) nặng ~27 MB nên không đưa vào repo; môi trường cloud `hunghienhoa` cài nó cùng humanizer, visual-explainer, last30days, yt-dlp và Graphify qua setup script. Máy cục bộ: `git clone https://github.com/wheresryan22/anatomy ~/.claude/skills/anatomy`.

## Làm Nét

Trang `https://hunghienhoa.com/lamnet/` (cục bộ: `/lamnet/`) làm nét và phóng to ảnh 4 lần bằng Real-ESRGAN `realesr-general-x4v3` chạy trong trình duyệt qua ONNX Runtime Web 1.22.0 (WebGPU nếu máy có GPU thật, nếu không thì WebAssembly nhiều luồng trong luồng phụ). Ảnh chỉ nằm trong bộ nhớ trang, tải về JPEG, xóa khi rời trang hoặc sau một giờ.

- `dist/lamnet/core.mjs`: giới hạn kích thước (WebGPU 1024×1024, CPU 1024×768), chia ô 256px kèm viền 12px, đổi ảnh ↔ tensor, làm nét thêm sau AI (unsharp mask, chọn Tự nhiên / Nét / Rất nét). Test: `tools/lamnet.test.mjs`.
- `dist/lamnet/models/realesr-general-x4v3.onnx` dựng lại bằng `python tools/build-lamnet-model.py realesr-general-x4v3.pth` (cần numpy, onnx, onnxruntime; không cần PyTorch). Script tự đối chiếu với bản tính numpy.
- `server/lamnet-ai.mjs`: AI đám mây cho Làm Nét (Cloudflare Workers AI, FLUX.2 [klein] 4B) (kiểm tra yêu cầu, đếm lượt 3/người và 30/website mỗi ngày, gọi API). Worker đếm lượt trong Durable Object `VisitCounter`, server cục bộ trong SQLite. Khóa và model: xem DEPLOYMENT.md. Test: `tools/lamnet-ai.test.mjs`.
- `dist/lamnet/vendor/ort-1.22.0/`: chép nguyên từ npm `onnxruntime-web@1.22.0`. Bản 1.2x mới hơn có tệp WebGPU trên 25 MiB, vượt giới hạn mỗi tệp của Cloudflare.
- Worker và máy chủ cục bộ gắn cho mọi phản hồi của Làm Nét CSP có `'wasm-unsafe-eval'` và COOP/COEP (crossOriginIsolated để WebAssembly chạy nhiều luồng). Trang không gắn mã quảng cáo.
