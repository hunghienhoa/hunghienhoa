# Chất liệu và chuyển động tham khảo GIF

Dùng công cụ Imagegen tích hợp để tạo mới chất liệu, không dùng CLI. File website: `dist/assets/bubble-wrap-photo.webp` (1902×827, alpha giữ nguyên; mã hóa WebP quality88, không thay đổi kích thước). Bản PNG gốc được giữ tại `C:/Users/hungh/.codex/generated_images/01a1be34-4efd-7f01-8826-04949bddbd4d/exec-177d2c66-c8ef-4caf-99e1-ad9eff73b78b.png`.

## Prompt cuối

Use case: product-mockup. Asset type: transparent photographic bubble-wrap material overlay for an animated portfolio website. Create ONLY a single wide rectangular sheet of clear transparent packing bubble wrap, straight top-down orthographic view, spread flat horizontally, entire sheet fully visible with narrow transparent margins. Aspect ratio about 2.3:1. Genuine transparent alpha background and translucent plastic membrane so website colors can show through; no opaque white or gray backing, no checkerboard printed into image. Densely packed small round air cells in regular rows, roughly 24 bubbles across the width and 10 rows tall. Photographic crinkled polyethylene with uneven white specular crescent highlights, soft gray tiny refractive shadows, fine seams and occasional crumpled folds. Slightly wavy cut edges. Soft upper-left studio light. Material should look physically real, not vector circles or a polka-dot pattern. Bubbles must look like flattened sealed air cushions, not water droplets, glass beads, soap bubbles, ice or jewels. Fairly flat membrane between bubbles. No dramatic perspective or rolled up corners. No objects, hands, products, text, logos, paper, grid lines, background surface, or watermark. Intended as a reusable transparent material sheet to layer over colorful paper layouts.

## Chuyển động

Sáu GIF dùng sáu bộ chuyển động khác nhau. Bảng đối chiếu từng cảnh nằm trong `PROJECT.md`. Lớp xốp dùng chung và đứng yên; chuyển động riêng nằm trong `dist/motion-123.css` và `dist/motion-456.css`. Đây là tái dựng cho concept hiện có, không sao chép chính xác đồ họa của tác giả tham khảo.

Chất liệu thực thi trong `dist/bubble-wrap.css`; props trang trí `aria-hidden` riêng trong sáu cảnh ở `dist/index.html`, tự giữ khi clone vào dialog. Lớp xốp sau đồ vật và lớp film screen-blend phía trước dùng cùng ảnh alpha. Chuyển động tự chạy không cần thêm JavaScript hay dependency, vẫn tuân theo prefers-reduced-motion.

