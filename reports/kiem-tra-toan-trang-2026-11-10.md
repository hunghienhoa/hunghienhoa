# Kiểm tra toàn bộ website — 10/11/2026

## Phạm vi

Trang chính, Blog và trình đọc bài, Photobooth, phòng chụp /shoot, Admin sau đăng nhập, 4 trang chính sách. Kiểm tra tự động và Chrome riêng với dữ liệu giả trên máy chủ loopback cô lập; không đăng nhập hoặc ghi dữ liệu vào tài khoản quản trị thật.

## Các lỗi đã sửa

- Blog gọi phần tử chân trang đã bị xóa, khiến lỗi JavaScript dừng việc áp dụng nội dung tùy chỉnh.
- Ảnh bìa trình đọc bị cắt: hiển thị trọn ảnh; tăng vùng bấm nút sao chép code và các liên kết chính sách.
- Gỡ dấu ® trang trí trên logo khi chưa có bằng chứng đăng ký; giữ khóa tùy chỉnh cũ để không làm hỏng nội dung đã lưu.
- Admin làm mới token nhiều lần đồng thời, có thể làm mất phiên. Gom thành một yêu cầu; phản hồi cũ không khôi phục phiên đã đăng xuất.
- Bản chờ hết hạn vẫn còn ảnh và liên hệ trên Admin: tự dọn danh sách/bộ nhớ và giải phóng ảnh; chặn phản hồi ảnh đến muộn.
- Làm mới danh sách khiến ảnh bìa nháp đang sửa mất blob: giữ ảnh đang được dùng, đăng xuất vẫn giải phóng toàn bộ.
- Dán nội dung từ trình soạn thảo khác bị mất chữ đậm/nghiêng định dạng bằng CSS: nhận diện trong bộ chuyển đổi an toàn.
- Từ chối bản đóng góp hết hạn/mất vẫn báo thành công: trả lỗi 404 chính xác.
- Photobooth có thanh hiệu ứng khiến cột chụp rộng hơn màn hình nhỏ: cho lưới co đúng kích thước và cuộn thanh hiệu ứng bên trong.
- File khung trong suốt không được áp dụng đúng; khung cộng đồng mất artwork khi chuyển sang /shoot: áp dụng ảnh khung riêng đúng và giữ mã khung công khai trong đường dẫn.
- Nhập nhiều ảnh bị lỗi giữa chừng hoặc rời trang chưa dọn các canvas đã giải mã: giải phóng ngay và hủy việc nhập còn lại.
- Mở lại nút tự tạo khung trong /shoot; đưa nút dùng/tải khung ra khỏi nhóm tùy chọn thu gọn.
- JPEG tải khung trống từ artwork trong suốt có vùng đen: trải nền đúng màu trước khi xuất JPEG.
- Kiểm tra trên web thật phát hiện script thống kê tự chèn bị CSP Admin chặn. Bổ sung `Cache-Control: no-transform` cho HTML để giữ nguyên nội dung/CSP và không tự chèn beacon; bộ đếm riêng vẫn hoạt động.
- Chính sách CSP chặn thẻ base cùng nguồn của /shoot: cho phép base cùng nguồn, giữ các giới hạn nguồn khác.
- Liên kết chính sách ở /shoot chưa có CSS, bị dính chữ: thêm kiểu và vùng bấm phù hợp.
- Sửa lời giới thiệu đóng góp cho cả tải file và tự thiết kế; bỏ số lượng khung cố định dễ sai ở hướng dẫn; chuẩn hóa nhãn mạng xã hội trong Admin.

## Kiểm tra

- `npm run check`: 27 nhóm kiểm tra đạt, bao gồm phiên, phân quyền, CSRF, hết hạn, nội dung nháp, định dạng ảnh, quyền riêng tư, blog, Markdown/HTML negotiation và sitemap.
- `python tools/convert-webp.py --check`: không có PNG tĩnh được phục vụ trong dist; SVG và trường hợp tải mẫu PNG có chủ đích được giữ nguyên.
- Ma trận trình duyệt: 9 trang × 7 chiều rộng 320/360/390/430/768/1440/1920 px. Không tràn ngang, không lỗi JavaScript.
- 36 trường hợp Admin sau đăng nhập, trình đọc bài, hộp tạo khung và hộp chọn khung ở 320/390/768/1440 px: không tràn ngang.
- Luồng viết/xuất bản bài giả, chữ đậm/nghiêng/danh sách/code, sao chép code, tìm kiếm không kết quả, gửi và duyệt khung: đạt trên dữ liệu cô lập. Thông tin liên hệ riêng không có trong API khung công khai.
- Luồng camera bằng video canvas giả lập: chụp 4 tấm, dừng tracks, đổi khung, xuất JPEG, làm lại và nhập 4 PNG. JPEG thực tế 1440 × 4360; ảnh chỉ ở bộ nhớ trình duyệt.

## Chạy lại

`node tools/browser-audit.mjs` dùng Playwright đã cài cùng Chrome; tự tạo máy chủ và tài khoản thử cục bộ, không dùng dữ liệu thật. Kết quả chi tiết nằm trong `tmp/browser-audit-results.json`, ảnh thử trong `tmp/`.

## Giới hạn còn lại

Đây là Chrome với kích thước mobile, chưa phải Safari/iPhone và Android vật lý. Camera, hộp quyền và hành vi lưu/chia sẻ ảnh trên thiết bị thật cần kiểm tra thêm. Chưa thử gửi email thông báo tới hộp thư thật trong lần này để tránh thư thử; lỗi email và lưu đóng góp được kiểm tra cô lập. Chưa thực hiện pentest độc lập hoặc chứng nhận pháp lý/bản quyền. Bài TikTok đang ở dữ liệu cloud chỉ thay đổi khi Hùng dán và lưu bản nội dung đã chuẩn bị; không có quyền sửa dữ liệu cloud trong lần này. Giấy phép 170 khung nhập và hồ sơ pháp lý vẫn cần chủ trang xác nhận.
