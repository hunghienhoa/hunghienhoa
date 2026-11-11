# Sticker từ 17 ảnh tham chiếu

## Nguồn và xử lý

Đã rà 15 GIF và 2 PNG Hùng cung cấp trong `C:/Users/hungh/Downloads`, gồm các đoạn giữa/cuối GIF; không chỉ lấy frame đầu. GIF được giải mã để quan sát, không phục vụ trực tiếp các GIF nặng lên web. Frame đánh số từ 0; thời điểm tính từ đầu vòng lặp.

Dùng ImageGen ở chế độ chỉnh sửa ảnh tham chiếu để làm sạch/dựng lại các hình, bỏ nền giấy, màng xốp và phản sáng. Đây là **hình tái dựng theo tham chiếu**, không phải cutout nguyên pixel hoặc chuỗi frame GIF gốc. Các nhân vật minh họa được giữ thành mô-típ; ảnh chân dung thật, tên, chữ ký và logo riêng của tác giả/nhãn hàng không được dùng để giới thiệu chủ website. Màn hình điện thoại, nhãn và thẻ được để trống hoặc trang trí lại. Nguồn người dùng cung cấp không tự chứng minh quyền khai thác; tài liệu này ghi quy trình và nguồn, không phải giấy phép.

Ba atlas 4×4 có tổng cộng 48 ô, đọc từ trái sang phải, từ trên xuống dưới. Số ô gồm nhân vật, họa tiết và đồ vật; không có nghĩa là 48 nhân vật khác nhau, cũng không tính mỗi lần lặp trong GIF thành một hình mới. Atlas đầu dùng `assets/sticker-atlas.webp`; PNG nguồn nằm ngoài `dist`. Web dùng WebP có alpha, SVG gốc vẫn giữ SVG; các bản ở main/blog/photobooth phục vụ định tuyến từng miền.

## Tệp phục vụ và nén ảnh

- `dist/assets/sticker-atlas.webp`: ô 01–16, 399.092 byte, chất lượng 88.
- `dist/assets/sticker-atlas-2.webp`: ô 17–32, 584.868 byte, chất lượng 84.
- `dist/assets/sticker-atlas-3.webp`: ô 33–48, 399.024 byte, chất lượng 84.
- Cả ba 1254 × 1254 px, alpha đối chiếu giống PNG gốc. PNG giữ tại `source-assets/original-png/assets/`, không phục vụ trực tiếp. Mỗi miền tải các atlas một lần và dùng lại bằng CSS.

## Bộ prompt

Dùng công cụ ImageGen tích hợp, chế độ chỉnh sửa ảnh tham chiếu và nền trong suốt. Mỗi ảnh là lưới vuông 4×4 ô, đối tượng ở giữa từng ô, không có đường kẻ lưới; giữ màu/viền/chất in theo tham chiếu, bỏ giấy, xốp, phản sáng và nền. Atlas 1 yêu cầu đúng thứ tự ô 01–16 ở dưới. Atlas 2 yêu cầu đúng thứ tự ô 17–32, bỏ que tò he và nhãn sản phẩm ở nhân vật. Atlas 3 yêu cầu đúng thứ tự ô 33–48; màn hình và thẻ trống, bỏ logo, chữ ký, QR, chân dung và tên tác giả. Không thay PNG bằng cách đổi đuôi; mã hóa WebP riêng với alpha giữ nguyên.

## Kiểm kê đủ 17 nguồn

| Mã | Tệp nguồn | Chi tiết đã quan sát, gồm phần xuất hiện muộn |
|---|---|---|
| R01 | `6da879244803829.69a72180071f6.png` | Hộp mở, giấy cảm ơn vàng, băng dính; bỏ chữ ký gốc. |
| R02 | `b73fc7244803829.69a6bcb63fc17.gif` | Voi đàn/lân ở đầu; dũng sĩ cầm giáo và người múa quạt hồng ở f14–21, 0,70–1,05 giây. |
| R03 | `306080244803829.69a6991ecc52d.gif` | Chữ Totto nhiều màu, dải nhựa và khuông nhạc trượt vào; rõ ở f36, 1,80 giây. Không thấy nhân vật cô bé riêng trong GIF này. |
| R04 | `ed8fc2244803829.69a67dab5423e.gif` | Túi minh họa, cánh tam giác viền lửa và bảng treo hình sách mở; f18, 1,44 giây. |
| R05 | `22b98e244803829.69a6549c07029.gif` | Bao gói, dải hoa văn và bộ rosette xanh/hình thoi đỏ/cross hồng; f18, 1,44 giây. |
| R06 | `53c013244803829.69a5af26c8c43.gif` | Hộp CD, mặt đĩa sticker ở f9, 0,72 giây; mặt sau đĩa có nét sao, burst, sò ba múi, vòng cung và nét cuộn ở f27, 2,16 giây. |
| R07 | `86af06244803829.69a55e9e3f436.gif` | Cổng/vòm kiến trúc đỏ và tiêu đề đi vào từ hai phía; f14–28, 0,70–1,40 giây. Không chép nguyên logo chữ vào atlas. |
| R08 | `72b8e2244803829.69a521935359d.gif` | Cassette, tay OK/chữ V, hoa thị, tim, sao; cụm khóa Sol/nốt nhạc/sao bạc hạ xuống ở f18, 1,44 giây. |
| R09 | `05d376244803829.69a3fe9d9a0ed.gif` | Ba học sinh: xe đạp, ngồi bàn vẫy tay, trượt ván cùng bóng; nền tia gấp vàng, f0 và toàn vòng. |
| R10 | `52de8d244803829.69a33677ac760.gif` | Hoa nhiều màu; cánh tay hồng và chân mèo xanh bạc hà xuất hiện muộn, rõ ở f36, 1,80 giây. |
| R11 | `4ed855244803829.69a300cc866f1.gif` | Phong bì bạc, nhãn bưu kiện xanh, dàn sticker và bảng treo hạ xuống; f18, 1,44 giây. |
| R12 | `0b5626244803829.69a1c8ae49f8a.gif` | Móc khóa acrylic, hai thẻ đỏ/xanh; bàn tay chấm tram cầm thẻ đi vào ở f18, 0,90 giây. Không lấy phần ảnh bàn tay thật. |
| R13 | `280ae1244803829.69a1b582cc628.png` | Hộp mở chứa các gói, cassette, CD, điện thoại phím tím, USB, danh thiếp, cuốn giới thiệu; bỏ chân dung và thông tin riêng. |
| R14 | `557c57244803829.699ff3865e3fa.gif` | Kiện carton dài, tay/hoa thị/tim trồi lên, nhãn ly dễ vỡ, nhãn hoa hình học; bảng thương hiệu hạ xuống ở f12, 0,96 giây, không chép chữ/logo. |
| R15 | `354157244803829.69a7218007822.gif` | Góc nhìn trong hộp, giấy vàng; sticker ló vào khoảng f18–27, 1,44–2,16 giây. Bỏ ảnh chân dung thật. |
| R16 | `5ae432244803829.699fe629cb59d.gif` | Dải chữ/sticker chạy liên tục 6,96 giây; lặp tay, sao, tim, hoa thị đã có, không tính thành hình mới. |
| R17 | `e83131244803829.699f5cb0bf59d.gif` | Hộp vận chuyển đóng, nhãn lửa/nước/ô/tái chế/ly/mũi tên lên; mascot hộp trắng giơ tay trên ô xanh ở f0. Cả vòng chỉ thêm xốp di chuyển. |

## Atlas 1 — ô 01–16

Chỉnh sửa 4 ảnh frame tham chiếu thành atlas vuông nền trong suốt 4×4 ô; mỗi sticker ở giữa ô với khoảng trống xung quanh; giữ hình dáng, màu và viền xanh tím cùng hạt in giấy. Loại bỏ lưới giấy, nhựa xốp, chữ, logo, nền hộp và ánh lóa; không thêm ảnh người, chữ ký hoặc nhãn mới. Thứ tự ô:

1. Tay OK cam; 2. tay chữ V tím; 3. chong chóng xanh kính đỏ; 4. hoa thị xanh dương.
5. Hoa thị tím; 6. sao vàng có mặt; 7. tim đỏ mắt xanh; 8. hoa vàng nhụy cam.
9. Hoa bốn cánh hồng; 10. hoa xanh lơ; 11. tò he voi xanh cầm đàn, bỏ que; 12. tò he lân cam, bỏ que.
13. Nhãn lửa hồng; 14. nhãn giọt nước xanh; 15. nhãn ô tím; 16. nhãn tái chế xanh ngọc.

Nhóm này đối chiếu chính với R02, R08, R10, R14, R16 và R17. Hoa xanh/cam là biến thể trong cùng họ hoa cánh tròn, không được kê thành nhân vật mới chỉ vì đổi màu.

## Atlas 2 — ô 17–32

PNG ImageGen đã xem: `exec-81f307c6-ca54-4175-b25a-c2b4fc720f6e.png`, 1254×1254, RGBA. Prompt yêu cầu 16 mô-típ trên nền trong suốt, giữ nét in giấy và màu tham chiếu, không thêm chữ/logo.

| Ô | Mô-típ | Đối chiếu |
|---|---|---|
| 17 | Dũng sĩ đỏ cầm giáo | R02, f14–21 / 0,70–1,05 giây |
| 18 | Người múa quạt hồng, mũ hoa | R02, f14–21 / 0,70–1,05 giây |
| 19 | Học sinh đi xe đạp | R09, f0 |
| 20 | Học sinh ngồi bàn vẫy tay | R09, f0 |
| 21 | Học sinh trượt ván, cầm bóng | R09, f0 |
| 22 | Cánh tay hồng, đầu ngón tròn | R10, f36 / 1,80 giây |
| 23 | Chân mèo xanh bạc hà, đệm chân kem | R10, f36 / 1,80 giây |
| 24 | Sao nét mảnh sáu tia cam | R06, f27 / 2,16 giây |
| 25 | Burst nhọn xanh bạc hà | R06, f27 / 2,16 giây |
| 26 | Họa tiết hồng ba múi | R06, f27 / 2,16 giây |
| 27 | Dải vòng cung xanh | R06, f27 / 2,16 giây |
| 28 | Nét cuộn tím | R06, f27 / 2,16 giây |
| 29 | Hoa văn rosette xanh | R05, f18 / 1,44 giây |
| 30 | Hoa văn dệt hình thoi đỏ/cam | R05, f18 / 1,44 giây |
| 31 | Hoa văn cross bậc hồng | R05, f18 / 1,44 giây |
| 32 | Cụm khóa Sol, nốt nhạc và sao bạc | R08, f18 / 1,44 giây |

## Atlas 3 — ô 33–48

PNG ImageGen đã xem: `exec-7628019c-8ccc-4b49-b944-d7c5b5fbf8dd.png`, 1254×1254, RGBA. Nhóm này tái dựng đồ vật thành sticker riêng, bỏ ảnh người và nội dung nhãn gốc; không lấy nguyên toàn cảnh dự án.

| Ô | Đồ vật/mô-típ | Đối chiếu |
|---|---|---|
| 33 | Hộp vận chuyển đóng | R17, f0 |
| 34 | Hộp carton mở | R01, R13 |
| 35 | Kiện carton dài | R14, f12 / 0,96 giây |
| 36 | Phong bì bạc | R11, f18 / 1,44 giây |
| 37 | Băng cassette trong | R08, f0–18 |
| 38 | Hộp CD xanh | R06, f0–9 |
| 39 | Đĩa đen có họa tiết | R06, f27 / 2,16 giây |
| 40 | Điện thoại phím tím, màn hình trống | R13 |
| 41 | USB tím/kem | R13 |
| 42 | Bưu thiếp trang trí | R04 có nhãn dự án postcard; kết hợp chất liệu thẻ ở R13, phần trang trí được dựng lại |
| 43 | Danh thiếp trống | R13 |
| 44 | Móc khóa acrylic viền hồng | R12, f0; kiểu viền được dựng lại, không giữ nhãn Enkai |
| 45 | Cánh tam giác viền lửa dân gian | R04, f18 / 1,44 giây |
| 46 | Bảng hình sách mở viền dân gian | R04, f18 / 1,44 giây |
| 47 | Mascot hộp trắng giơ hai tay | R17, f0, nhãn xanh trên mặt hộp |
| 48 | Nhãn ly dễ vỡ | R14, f12; R17, f0 |

Các nền xốp, nhựa, giấy ô ly, chữ dự án và biến thể màu vẫn là tư liệu bố cục; không biến mỗi chi tiết thành một sticker độc lập. Cổng kiến trúc ở R07 và lettering/khuông nhạc ở R03 đã được kiểm kê nhưng không nằm trong 48 ô trên.

## Chuyển động

Atlas dùng CSS sprite, không tải lại ảnh khi chuyển động. Bàn tay vẫy cổ tay; chong chóng và hoa nhỏ xoay ngược chiều; hoa thị đi quỹ đạo ngắn; sao trôi/lắc; tim đập nhẹ; hoa cánh tròn nở/lắc; tò he đung đưa; nhãn vận chuyển nghiêng luân phiên. Các sticker trang trí nằm trong vùng minh họa sẵn có, không nhận click và không tham gia thông tin trợ năng. Giảm chuyển động theo cài đặt hệ thống; không thêm bộ trang trí vào Admin; phòng chụp chỉ dùng dấu tim nhỏ ở đầu trang. Các cảnh mở hộp/bao bì trước đó vẫn giữ chuyển động riêng.


## Phân bố và giữ hiệu ứng gốc

Nhóm sticker được phân riêng theo trang, không dùng một ô atlas trên nhiều trang: trang chính ưu tiên hộp, bàn tay, đồ vật âm nhạc và hoa văn; Blog dùng giấy, thẻ và đồ vật ghi chép; Hộp Ảnh dùng các nhân vật; phòng chụp chỉ có một dấu tim nhỏ ở đầu trang; mỗi trang chính sách có một nét hình học nhỏ ở chân trang. Những bản lặp trong dải chạy là hai nửa giống nhau để nối vòng liên tục. Bỏ rack ba đồ vật dưới ghi chú Blog và hai nhãn dân gian ở bộ khung Photobooth. Thẻ 06 dùng lại hai SVG cờ `illustration-wing.svg` với hiệu ứng bung cờ gốc; sticker tò he chuyển vào minh họa khung ảnh, không thay thế cờ. Trang quản trị không thêm trang trí.

Phân bố xuyên suốt: hoa hồng ở giới thiệu chủ trang; hộp nhỏ ở lời mời liên hệ trang chính; CD ở thẻ dự án; bưu thiếp ở trạng thái danh sách bài viết; danh thiếp và phong bì ở phần liên hệ Blog/Hộp Ảnh; tim ở trạng thái máy ảnh đang tắt. Di chuyển các hình từ dải chạy và thẻ dự án, không nhân thêm chúng vào nhiều vùng. Các cảnh gốc, đặc biệt hai cờ thẻ 06, giữ nguyên.

Yêu cầu cuối cùng: sáu thẻ 01–06 được khôi phục nguyên phần HTML và CSS chuyển động trước bộ sticker (bb93421). Không đặt bất kỳ art-sticker mới nào vào sáu thẻ, kể cả bản sao trong cửa sổ chi tiết. Bộ 48 hình vẫn giữ như tài sản sẵn có; chỉ dùng các hình phù hợp ở những phần khác, không ép mọi hình phải xuất hiện. Các mô tả phân bố trong sáu thẻ ở trên là lịch sử đã được thay thế bởi quy tắc này.

Theo yêu cầu tiếp theo, chỉ keyframe chuyển động của 6 thẻ được chỉnh theo GIF gốc: 01 vòng 4,96 giây; 02–06 vòng 3,60 giây, riêng các chuyển động đối xứng lặp hai nhịp 1,80 giây. Toàn bộ HTML/hình/chữ của 6 thẻ vẫn khớp bản gốc. Đã quan sát frame đầu,15%,30%,50%,70%,90%; CSS là bản dựng lại quỹ đạo và nhịp, không phát nguyên GIF và không cam kết trùng từng pixel.

Bản thử nhịp GIF fc85091 bị chủ trang từ chối vì chuyển động chưa đúng. Đã gỡ keyframe thử nghiệm (xoay dải quá mức, kéo giãn cờ và nhịp đĩa); trả về chuyển động ổn định c926cc7. Không coi bản này là tái hiện giống GIF. Cần chốt giữ hình thẻ hay dùng animation nguyên bản trước khi sửa tiếp.
