# Rà soát sơ bộ website Hùng Hiền Hòa — 10/11/2026

Kết luận: chưa đủ căn cứ xác nhận website tuân thủ đầy đủ pháp luật. Có một số thiếu sót minh bạch cần khắc phục; đây là rà soát kỹ thuật và tài liệu công khai, không phải chứng nhận pháp lý.

## Phạm vi và bằng chứng

Đã lấy HTML trực tiếp của hunghienhoa.com, blog.hunghienhoa.com, photobooth.hunghienhoa.com và admin.hunghienhoa.com bằng curl; đối chiếu mã nguồn hiện tại. Không đăng nhập tài khoản quản trị, không kiểm tra nhật ký nhà cung cấp, hồ sơ pháp lý hay giấy phép tài nguyên. Không thay đổi website trong lần rà soát này.

- Ba trang công khai có script Google AdSense. Admin không có script này.
- Không thấy liên kết chính sách riêng tư, cookie hoặc điều khoản trên các trang vừa kiểm tra. Photobooth có mục riêng tư ngắn nhưng chưa bao quát toàn bộ hoạt động dữ liệu của hệ thống.
- Không thấy tích hợp quản lý đồng ý quảng cáo trong HTML/mã nguồn đã kiểm tra. Chưa kiểm tra cấu hình riêng trong tài khoản AdSense hoặc hành vi cookie trên trình duyệt thực.
- Mã chụp/ghép xử lý ảnh trong bộ nhớ trình duyệt, có dọn phiên; bản đóng góp khác với ảnh chụp cá nhân. Chưa xác minh độc lập toàn bộ lưu lượng mạng, log, backup và cấu hình dọn dữ liệu đang chạy trên môi trường thật.
- Đóng góp gồm tên hiển thị, liên hệ tùy chọn và bản thiết kế; có bước đồng ý và duyệt. Mã nguồn có xử lý hết hạn một giờ và xóa liên hệ riêng khi duyệt.
- Thống kê và giới hạn đóng góp dùng SHA-256 từ ngày + IP. Không lưu IP gốc trong các bảng đếm này, nhưng không nên coi mã băm là ẩn danh tuyệt đối. Nhà cung cấp hạ tầng vẫn có thể xử lý IP/log riêng.
- FRAME-SOURCES.md ghi 170 khung được nhập từ hai ZIP do chủ trang cung cấp. Chưa có bằng chứng giấy phép tương ứng trong phạm vi rà soát.

## Ưu tiên khắc phục

1. Công bố chính sách riêng tư dùng chung cho các miền công khai: chủ thể vận hành và liên hệ, dữ liệu/mục đích/căn cứ xử lý, bên nhận và nhà cung cấp, thời hạn lưu, quyền yêu cầu truy cập/chỉnh sửa/xóa/rút đồng ý, trẻ em, bảo mật và xử lý sự cố. Phân biệt ảnh chụp không gửi lên máy chủ với tên/liên hệ/thiết kế đóng góp và dữ liệu quảng cáo, thống kê. Không tuyên bố toàn website không thu thập dữ liệu.
2. Công bố cookie/quảng cáo và cách lựa chọn phù hợp. Việc có script chưa chứng minh quảng cáo đã hoạt động hay cookie đã được ghi, nhưng cần hoàn thiện minh bạch trước khi vận hành. Google yêu cầu chính sách riêng tư đối với AdSense; nếu phục vụ quảng cáo tới EEA/Anh/Thụy Sĩ, kiểm tra CMP được Google chứng nhận. Chính sách nền tảng khác với nghĩa vụ pháp luật Việt Nam.
3. Đặt điều khoản đóng góp và quy trình báo cáo/gỡ khung: quyền sử dụng, phạm vi cấp phép cho website/người chụp, ghi công, nội dung cấm, khiếu nại, gỡ bỏ và yêu cầu xóa dữ liệu. Không có trang tên “Điều khoản” riêng không tự động chứng minh vi phạm; cần nội dung thỏa thuận phù hợp hoạt động thực tế.
4. Kiểm tra quyền của 170 khung nhập, sticker, nhân vật, logo và các tài nguyên ngoài. Có file hoặc ghi nguồn không tự động thay thế giấy phép. Tạm ngừng công khai mẫu không chứng minh được quyền nếu cần.
5. Xác nhận vị trí xử lý/lưu trữ của các nhà cung cấp, hợp đồng và nghĩa vụ đánh giá tác động xử lý/chuyển dữ liệu xuyên biên giới nếu thuộc diện áp dụng; kiểm tra log, backup và thực thi xóa thật. Xóa bảng chính không đồng nghĩa mọi bản sao đã được xóa.
6. Xác định phân loại pháp lý theo hoạt động thật: blog tự viết/portfolio khác trang tổng hợp tin; thư viện đóng góp công khai cần xem xét phạm vi dịch vụ thông tin/mạng xã hội, không chỉ dựa tên gọi. Nếu bổ sung bán hàng, đặt dịch vụ có thu phí hoặc chức năng thương mại, rà soát nghĩa vụ thương mại điện tử theo luật hiện hành trước khi triển khai. Không tự gắn biểu tượng đã thông báo/đăng ký khi chưa có xác nhận.

## Căn cứ đã tra cứu

- Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15, hiệu lực 01/01/2026: https://vanban.chinhphu.vn/?classid=1&docid=214590&pageid=27160&typegroup=
- Nghị định 356/2025/NĐ-CP hướng dẫn: https://vanban.chinhphu.vn/?classid=1&docid=216387&pageid=27160
- Hướng dẫn của Bộ Công an về xử lý dữ liệu và căn cứ pháp luật: https://bocongan.gov.vn/chinh-sach-phap-luat/bai-viet/canh-bao-nguy-co-vi-pham-phap-luat-ve-an-ninh-mang-doi-voi-doanh-nghiep-ho-kinh-doanh-trong-qua-trinh-chuyen-doi-so-1785806444
- Nghị định 147/2024/NĐ-CP: https://vanban.chinhphu.vn/?classid=1&docid=211654&orggroupid=2&pageid=27160
- Luật Thương mại điện tử 122/2025/QH15, hiệu lực 01/07/2026: https://chinhphu.vn/?classid=1&docid=216503&orggroupid=1&pageid=27160
- Danh mục văn bản thương mại điện tử, gồm Nghị định 248/2026/NĐ-CP: https://online.gov.vn/sct-25/van-ban-phap-luat
- Nội dung riêng tư bắt buộc theo AdSense: https://support.google.com/adsense/answer/1348695?hl=vi
- CMP cho quảng cáo tới EEA/Anh/Thụy Sĩ: https://support.google.com/adsense/answer/13554020?hl=en

## Điều cần chủ trang xác nhận

Giấy phép khung/ảnh/tài nguyên; có bán hàng hoặc nhận đặt dịch vụ trả phí hay không; khu vực người dùng mục tiêu; cấu hình quảng cáo; hồ sơ/địa điểm lưu trữ và hợp đồng nhà cung cấp. Cần người có chuyên môn pháp lý xác nhận các nghĩa vụ hồ sơ/cấp phép theo mô hình vận hành thực tế. Không thể suy ra chứng nhận tuân thủ từ mã nguồn, HTTPS hoặc điểm kiểm toán tự động.

## Cập nhật triển khai sau rà soát

Đã bổ sung bốn trang chính sách công khai, liên kết ở chân trang, liên kết trước bước đồng ý đóng góp và sửa lời xác nhận quyền sử dụng. Tạm bỏ script quảng cáo trên mọi trang công khai, giữ meta xác minh tài khoản theo phương thức Google hỗ trợ; chưa bật CMP hoặc tải quảng cáo.

Việc thêm tài liệu không thay thế giấy phép tài nguyên, hồ sơ xử lý/chuyển dữ liệu, kiểm tra hợp đồng và thời hạn log/backup. 170 khung nhập vẫn cần chủ trang cung cấp bằng chứng quyền sử dụng; chưa tự ý gỡ tài nguyên trong đợt bổ sung tài liệu. Các bản đồng ý trước khi cập nhật không tự động trở thành chấp thuận điều khoản mới.

Trước khi bật quảng cáo lại: xác minh trạng thái AdSense, chính sách khu vực người dùng, cấu hình CMP phù hợp và kiểm thử việc chặn/tải quảng cáo theo lựa chọn thực tế. Hướng dẫn xác minh bằng meta: https://support.google.com/adsense/answer/7584263?hl=en
