# Việt hóa và Hộp Ảnh — 09/11/2026

## Kết quả

- Giao diện hồ sơ đã chuyển sang tiếng Việt, gồm tiêu đề, nhãn trên hộp, sáu thiết kế mẫu, bộ lọc, cửa sổ chi tiết, phần giới thiệu và liên hệ. Giữ tên riêng các nền tảng và định dạng tệp.
- Mục “Dự án đã làm” có Hộp Ảnh, đúng lựa chọn trước mắt chỉ thêm dự án này. Sáu thiết kế minh họa vẫn được ghi rõ là mẫu.
- Hộp Ảnh nằm riêng tại `dist/photobooth/`, có đủ tài sản và phông chữ. Có thể đưa nội dung thư mục này lên gốc một tên miền khác; không dùng đường dẫn phụ thuộc hồ sơ cha.
- Luồng chụp bốn ảnh → chọn khung → tải ảnh tham khảo Fotogram, giao diện và tài sản được làm riêng theo màu/phông/nhân vật hiện tại. Không sao chép thương hiệu, ảnh, khung cộng đồng hay tuyên bố về người dùng của trang tham khảo.

## Đã kiểm tra

- Hồ sơ ở 320px và PC 1440px: không tràn ngang, ảnh tải đủ, tiêu đề tiếng Việt và thẻ dự án vừa khung. Các thiết kế mẫu vẫn giữ sáu bộ chuyển động riêng.
- Hộp Ảnh ở 320, 390, 768 và 1440px: không tràn ngang, ảnh tải đủ, nút tương tác tối thiểu 44px. Đã bọc dải chữ nghiêng để không tạo thanh cuộn ngang.
- Chọn bốn ảnh PNG màu tổng hợp từ máy, chuyển sang khung xanh và bộ lọc đen trắng, nhập lời nhắn có dấu rồi tải PNG thành công.
- Đọc tệp tải về: 720×2180px, nền đúng `#303487`, bốn vùng ảnh có R=G=B, lời nhắn tiếng Việt hiển thị đúng. Không dùng ảnh cá nhân trong lượt kiểm tra.
- Xóa riêng ảnh 2: số lượng còn 3/4 và nút tải tắt; chọn ảnh thay vào ô đó: trở lại 4/4 và nút tải bật. Làm lại xóa đủ ảnh và lời nhắn.
- Lượt xem cuối để trống 0/4 ảnh, máy ảnh đang tắt; không có lỗi JavaScript ghi nhận.
- `node check.cjs`: tài nguyên và neo của cả hai trang, sáu thiết kế mẫu, cú pháp JavaScript, mở cửa sổ/fallback khi bị chặn hoặc Ctrl+click, thông báo WeChat 3 giây đều đạt.
- `node dist/photobooth/core.test.mjs`: phép cắt ảnh, dữ liệu kích thước lỗi, bộ lọc RGBA, giữ alpha và dữ liệu gốc đều đạt. Trình duyệt thiếu `ctx.filter` có bộ xử lý điểm ảnh dự phòng.

## Giới hạn kiểm tra và xuất bản

Chưa cấp quyền hoặc chụp bằng máy ảnh thật, chưa thử Safari/iPhone thật. Camera cần HTTPS hoặc localhost. Trong môi trường xem nhúng, không quan sát được cửa sổ con do `window.open`; trang riêng đã được mở trực tiếp để kiểm tra, và các nhánh xử lý popup được kiểm tra bằng VM. Trình duyệt có thể mở thành thẻ mới theo thiết lập của người dùng.

Chưa gắn tên miền mới hoặc xuất bản bản cập nhật online. Project Sites gốc vẫn được giữ nguyên; không tạo site thay thế. Mã nguồn và hai gói ZIP đều được lưu trên máy.
