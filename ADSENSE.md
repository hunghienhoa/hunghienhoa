# Google AdSense

Mã nhà xuất bản: `ca-pub-1643127618182542`, theo ảnh Hùng cung cấp.

Đã đặt script AdSense bất đồng bộ trong `<head>` của Trang chính, Blog và Photobooth. Không thêm vào Admin. Backend cục bộ và Cloudflare cấp nonce mới cho từng phản hồi HTML có mã quảng cáo; các trang này dùng strict CSP theo hướng dẫn Google. Admin giữ CSP cũ, không cho tải script quảng cáo.

Nguồn chính thức:
- [Vị trí đặt mã AdSense](https://support.google.com/adsense/answer/9274516)
- [Tích hợp với Content Security Policy](https://support.google.com/adsense/answer/16283098)

Sau triển khai, chủ tài khoản mở AdSense, chọn “Tôi đã đặt mã” rồi “Xác minh”. Việc thêm mã không đồng nghĩa Google đã duyệt website hoặc quảng cáo sẽ xuất hiện ngay. Không thay đổi tùy chọn quảng cáo tự động, tài khoản hoặc gửi yêu cầu xét duyệt thay Hùng.

Script bên thứ ba do Google cung cấp; việc phục vụ quảng cáo và xử lý dữ liệu quảng cáo theo thiết lập AdSense của chủ trang. Mã photobooth của dự án vẫn không gửi ảnh chụp/chọn lên API hoặc lưu browser storage/database. Không có mã quảng cáo trong trang quản trị.
