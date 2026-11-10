# Hiệu ứng khuôn mặt của Hộp Ảnh

Mười hiệu ứng 2D tự vẽ bằng canvas: Kính ngầu, Tai mèo, Má hồng, Vương miện, Tim bay, Lấp lánh; Xem thêm mở Tai thỏ, Nơ xinh, Râu tinh nghịch, Tàn nhang. Không hiệu ứng tắt lớp ghép. Các bộ lọc màu vẫn độc lập.

Sử dụng MediaPipe Tasks Vision 0.10.32 và BlazeFace short-range float16 model version 1, tải từ nguồn Google và phục vụ cùng website. SDK/WASM/model chỉ tải khi chọn hiệu ứng; nhận diện tối đa khoảng 8 lần/giây, không tạo yêu cầu mạng chứa ảnh hoặc tọa độ mặt. Không nhận diện danh tính, không lưu landmarks hoặc video. Khi tắt camera/rời trang, lớp ghép và tọa độ tạm được xóa; rời trang đóng mô hình. Ảnh chụp ghép hiệu ứng vào canvas cục bộ trước khi xuất; khung đóng góp vẫn chỉ từ thiết kế trống.

Hiệu ứng bám theo hộp mặt và góc hai mắt, không phải mô hình trang điểm/biến đổi khuôn mặt 3D của TikTok. Có thể chậm hoặc lệch khi thiếu sáng, che mặt, xoay nghiêng nhiều hoặc thiết bị yếu. Nếu không tải được mô hình vẫn chụp bình thường; không bật camera tự động. Ảnh chọn từ máy không được tự động phân tích khuôn mặt.

Nguồn:
- https://developers.google.com/edge/mediapipe/solutions/vision/face_detector/web_js
- https://www.npmjs.com/package/@mediapipe/tasks-vision/v/0.10.32
- https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite
- Giấy phép Apache-2.0: `dist/photobooth/vendor/mediapipe/LICENSE`.
