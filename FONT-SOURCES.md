# Phông chữ website

Từ 10/11/2026, toàn bộ portfolio, blog, photobooth và quản trị dùng **Be Vietnam Pro + Playfair Display** theo yêu cầu của Hùng.

## Be Vietnam Pro

- Tác giả: Lâm Bảo, Tony Le, ViệtAnh Nguyễn.
- Nguồn chính thức: [Google Fonts](https://github.com/google/fonts/tree/c13390277dfb1fcc7415d84ef7ef9cfc1e52f8c1/ofl/bevietnampro), bản chốt `c13390277dfb1fcc7415d84ef7ef9cfc1e52f8c1`.
- Tệp gốc: `BeVietnamPro-Regular.ttf`, `Medium`, `SemiBold`, `Bold`, `ExtraBold`, `Black` — độ đậm 400/500/600/700/800/900.
- Chuyển nguyên bộ glyph TTF sang WOFF2 bằng FontTools/Brotli; không cắt bỏ chữ tiếng Việt, không đổi tên họ phông hoặc sửa hình dáng chữ.
- Giấy phép SIL OFL 1.1 giữ trong `fonts/BeVietnamPro-OFL.txt` ở mỗi trang độc lập. Tổng sáu WOFF2 khoảng 241 KB mỗi bộ; trình duyệt chỉ tải độ đậm được dùng.

## Playfair Display

Giữ hai WOFF2 SemiBold 600 đứng/nghiêng hiện có, dùng thống nhất tên CSS `Playfair Display` trên cả bốn trang. Giấy phép SIL OFL nằm trong `fonts/Playfair-Display-OFL.txt`; nguồn gốc đi kèm bộ phông chính ở `dist/fonts/Playfair-Display-SOURCE.txt`.

Be Vietnam Pro dùng cho nội dung và điều khiển; Playfair Display cho tiêu đề nhấn, lời dẫn, ghi chú và lời nhắn trên dải ảnh. Photobooth tải rõ các độ đậm dùng trong canvas trước khi xuất WebP/gửi khung trống. Không gửi ảnh người dùng để tải hoặc xử lý phông chữ.

Mọi phông phục vụ từ cùng origin của website, không cần Google Fonts/CDN ở thời gian chạy. Phông Gilroy cũ đã chuyển khỏi `dist` sang `source-assets/original-fonts`, giữ nguyên bản nguồn. Hình SVG hồ sơ GitHub là tài sản riêng, không thuộc giao diện các trang web này.
