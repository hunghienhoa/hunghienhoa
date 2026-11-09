# Kiểm tra bản sticker và mobile — 09/11/2026

Đã lưu tại thư mục nguồn cũ. Bản xem cục bộ: http://127.0.0.1:4180/#work (chỉ trên máy đang chạy server).

- Thay hoa thị ký tự bằng năm biến thể SVG có khuôn mặt ở dự án, marquee, hộp, giới thiệu và liên hệ. Không phụ thuộc font ký hiệu của điện thoại.
- Sửa hộp hero bị cắt, điều hướng chật, kích thước vật thể trong dialog và lưới social. Giữ font Gilroy/Playfair và sáu bộ chuyển động riêng.
- Kiểm tra trình duyệt ở 320, 375, 390, 430, 768, 1024 và 1440px. Không có tràn ngang toàn trang; ảnh tải đủ. Kiểm tra lại tablet sau khi chuyển hero thành một cột.
- Mở đủ sáu concept ở 320 và 390px: vật thể chính nằm trong khung, đóng dialog hoạt động. Kiểm tra trực quan sticker và poster ở 375px.
- Thử mở/đóng hộp ở 320px, sao chép WeChat, kiểm tra liên hệ và social. Nút tạm dừng đã được bỏ theo yêu cầu mới; hiệu ứng tự chạy, vẫn hỗ trợ cài đặt giảm chuyển động của thiết bị.
- `node check.cjs`: đạt kiểm tra asset, anchor, sáu concept, cú pháp JavaScript, dialog, reduced-motion và hai nhánh clipboard. `git diff --check`: đạt.

Chưa thử trên điện thoại thật hoặc Safari iOS. Bản online vẫn là bản trước: kết nối Sites hiện tại không truy cập được project gốc; cần khôi phục đúng tài khoản/workspace trước khi xuất bản các thay đổi cục bộ này. Không tạo site thay thế.

## Rà icon, tên gọi và YouTube

- Tên gọi đã được xác nhận là Hùng, giữ tên hiển thị đầy đủ Hùng Hiền Hòa. Lời giới thiệu và subject email đều dùng Hùng; tiêu đề có dấu tiếng Việt vừa khung 320px.
- Bật liên kết YouTube `https://www.youtube.com/@hunghienhoa98886`, mở trong tab mới với `noopener noreferrer`; bỏ trạng thái và lời nhắc đang chờ link.
- Kiểm tra ở 320, 390, 768 và 1440px: không tràn ngang, không ảnh lỗi, đủ 7 logo trong ô 26×26px với `object-fit:contain`, không nội dung social tràn ô. Tất cả 55 sticker hoa thị trên trang tải đủ; SVG có viewBox và không dùng tài nguyên ngoài.
- Kiểm tra trực quan mũi tên, dấu sao chép và logo YouTube trên PC/mobile; WeChat sao chép thành công. Kiểm tra thêm sticker trong cửa sổ Tần Số.

Thông báo sao chép WeChat bắt đầu trống, chỉ hiện sau thao tác bấm và thành công, tự ẩn sau 3 giây. Test VM kiểm tra trạng thái đầu, nhánh thành công tự ẩn và nhánh từ chối clipboard giữ hướng dẫn thủ công; bản xem được để lại với trạng thái trống sau QA.

## Sửa chồng lớp trang chính sau khi thêm blog

Hùng xác nhận phần bị chồng là trang chính, không phải trang blog riêng. Bản sửa chỉ thay `dist/mobile-fixes.css`, `dist/completed-work.css` và URL phiên bản CSS trong trang chính:

- Thẻ blog: giấy ghi chú chuyển xuống đáy, vùng minh họa có thêm chiều cao để không che chữ “tò mò.” trong sổ.
- Giới thiệu: nhãn trên thẻ, thẻ tên và lời chào dưới thẻ đi theo bố cục tự giãn. Thẻ tên bỏ chiều cao cố định để mã trang trí/chữ nhiều dòng không tràn xuống lời chào; có khoảng cho góc nghiêng và bóng.
- Liên hệ: chừa riêng 76px ở đáy thiệp cho hoa thị; lời mô tả không dùng chung vùng với icon. Thiệp cảm ơn về luồng bình thường và các cột giới thiệu/liên hệ xếp dọc từ 1000px trở xuống.
- Chú thích thiết kế mẫu xếp dọc trên điện thoại; tiêu đề/subtitle và chữ có dấu tăng khoảng dòng. Phần đầu/cuối hero cho phép nhãn xuống dòng.
- Phiên bản mới: `mobile-fixes.css?v=3`, `completed-work.css?v=3`.

`node check.cjs`, kiểm tra HTTP đang chạy và `git diff --check` đạt. **Chưa kiểm tra trực quan lượt sửa này**: công cụ trả “Local browser use is disabled in Work settings”. Các mục kiểm tra khổ màn hình ở phần trước là kết quả của lượt cũ, không dùng làm bằng chứng cho lượt sửa mới.

## Dải chữ photobooth/blog và khoảng cách hướng dẫn mở hộp

- Photobooth và blog: mỗi dải có sáu câu riêng bằng tiếng Việt, hai nhóm giống nhau chạy nối tiếp liên tục từ phải sang trái. Giữ màu xanh/vàng, góc nghiêng, Gilroy và quy tắc giảm chuyển động của thiết bị. Phiên bản CSS mới: photobooth `v=6`, blog `v=2`.
- Trang chính: chừa 28px dưới cảnh hộp ở màn hình tối đa 1000px, đặt tâm xoay dòng hướng dẫn ở mép trái và cho phép xuống dòng. Giữ nguyên vị trí hộp và hành vi mở/đóng; `mobile-fixes.css?v=4`.
- Trình duyệt đã truy cập được trở lại trong lượt này. Đã xem trực quan hai dải trên PC/390px, đo ở 320, 390, 768, 1440 và 3440px: không tràn ngang trang, hai nhóm có cùng độ rộng, CSS animation chạy và giá trị transform thay đổi. Dòng hướng dẫn cách đường kẻ khoảng 28px ở 320/390/768px; thao tác mở/đóng hộp vẫn hoạt động.
- `node check.cjs`, kiểm tra WebP và `git diff --check` đạt. Ảnh chụp minh chứng nằm trong `outputs/`, ngoài webroot. Máy chủ cục bộ đã được khởi động lại tại `http://127.0.0.1:4180`.

Chưa kiểm tra trên điện thoại thật hoặc Safari iOS; quy tắc giảm chuyển động được kiểm tra trong CSS, chưa đổi cài đặt hệ điều hành để thử trực tiếp. Không có thay đổi API, ảnh người dùng, dữ liệu hay mật khẩu.
