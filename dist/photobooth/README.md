# Hộp Ảnh — Một dự án của Hùng

Ứng dụng chụp bốn ảnh, chọn/tự tạo khung, thêm sắc ảnh, viết lời nhắn và tải JPEG. Ảnh chụp được xử lý trong bộ nhớ trình duyệt, không có API nhận ảnh cá nhân. Thiết kế khung trống có thể gửi vào hàng chờ duyệt với thông tin ghi công và sự đồng ý của tác giả.

## Chạy và tách sang tên miền riêng

Thư mục này chứa riêng `index.html`, JavaScript, CSS, phông chữ và nhãn dán. Có thể sao chép giao diện lên một website tĩnh, không cần build hoặc cài thư viện. Tính năng đóng góp/thư viện cần API máy chủ; dùng API cùng origin hoặc cấu hình `HUNG_API_BASE` trong `config.js` và allowlist server. Chụp/chọn ảnh và tự tạo khung vẫn dùng được khi chưa kết nối API.

Camera cần HTTPS hoặc `localhost` và quyền do người dùng cấp. Không mở trực tiếp qua `file://`. Từ thư mục gốc project chạy `node server/server.mjs`, mở `http://127.0.0.1:4180/photobooth/` để có đủ API.

Trong portfolio, chỉ cần thay URL ở liên kết mở Hộp Ảnh khi có tên miền mới. Trang riêng không yêu cầu biết URL của portfolio.

## Hành vi

- Camera chỉ được yêu cầu sau khi bấm “Bật máy ảnh”, không thu âm. Có nút tắt; đóng/chuyển khỏi trang sẽ dừng các track camera.
- Chụp một tấm hoặc chụp bốn tấm liên tiếp, mỗi tấm đếm ngược ba giây. Chọn ô để thay riêng ảnh, xóa ảnh hoặc làm lại.
- Ảnh chọn từ máy chấp nhận PNG/JPEG/WebP, tối đa bốn ảnh/lần, 12 MB/ảnh và 45 triệu điểm ảnh. Ảnh được thu nhỏ còn tối đa 2560px mỗi chiều để giảm bộ nhớ. Ảnh chọn từ máy không bị lật gương.
- Bộ lọc chỉ áp dụng một lần khi vẽ bản xuất; ảnh gốc trong bộ nhớ được giữ để đổi bộ lọc. Trình duyệt hỗ trợ `canvas.filter` dùng bộ lọc gốc; trình duyệt chưa hỗ trợ dùng phép biến đổi điểm ảnh và lưu bộ đệm theo ảnh/bộ lọc. Dải tải về là JPEG 1440×4360.
- Phiên ảnh tự xóa sau một giờ tính từ ảnh đầu, hoặc ngay khi rời trang. Không ghi ảnh vào browser storage, API hoặc database. Người dùng cần tải ảnh xuống trước khi rời đi.
- Xưởng khung cho sửa ba màu, chữ, họa tiết, nhãn dán; tải khung trống JPEG hoặc dùng trực tiếp; khung PNG/WebP trong suốt cũng có thể chọn trong phòng chụp. Gửi duyệt chỉ tạo canvas từ thiết kế và tài sản cố định, không truyền ảnh cá nhân vào bộ vẽ này.
- Bản chờ duyệt và thông tin riêng tự xóa sau một giờ trên máy chủ. Khung được duyệt giữ thiết kế và thông tin ghi công công khai; liên hệ riêng được xóa ngay khi duyệt/từ chối.

## Kiểm tra

`node core.test.mjs` kiểm tra cắt ảnh và sắc ảnh; `node design.test.mjs` kiểm tra cấu hình khung, hạn phiên và bộ vẽ khung-only. `node server/server.test.mjs` từ thư mục gốc kiểm tra duyệt, hết hạn, quyền và dữ liệu riêng. Bản cộng đồng mới chưa kiểm tra trực quan do quyền trình duyệt Work đang tắt; camera/Safari thật chưa kiểm tra.

Phông Be Vietnam Pro và Playfair Display được lưu cục bộ dưới WOFF2, giấy phép SIL OFL tương ứng ở `fonts/BeVietnamPro-OFL.txt` và `fonts/Playfair-Display-OFL.txt`. Canvas chờ tải đủ hai họ phông trước khi xuất ảnh hoặc gửi khung trống. Sticker vector là tài sản gốc dùng chung với portfolio, không sao chép ảnh/khung của website tham khảo.
