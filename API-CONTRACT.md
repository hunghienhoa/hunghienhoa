# Nội dung dùng chung — hợp đồng giao tiếp

Chạy cục bộ bằng Node >=24 (`node server/server.mjs`), phục vụ `dist` và `/api` cùng cổng 4180. Dữ liệu SQLite nằm ngoài webroot: Windows cục bộ dùng `%LOCALAPPDATA%/HungHienHoa/portfolio-data` để tránh OneDrive, môi trường khác dùng `private-data/`; không đóng gói dữ liệu/chứng thực. Mặc định chỉ bind 127.0.0.1. Bản online dùng `worker/index.mjs`, Supabase Auth/Postgres và API cùng origin trên Cloudflare; schema nằm trong `supabase/migrations`.

## Bảo mật và vòng đời

- Ảnh chụp/chọn để ghép không được gửi lên API, lưu browser storage hoặc database. Chỉ tồn tại trong bộ nhớ, xóa khi rời trang và hết phiên 1 giờ.
- Gửi khung tạo poster **không chứa ảnh chụp**, chỉ WebP 720×2180 và cấu hình thiết kế. Có consent trước khi gửi.
- Bản chờ duyệt, poster và thông tin liên hệ tự xóa sau 1 giờ. Đọc/duyệt bản đã hết hạn phải bị chặn ngay; dọn trên startup và bộ định giờ server. Không dùng TTL cloud chậm làm bảo đảm 1 giờ.
- Khung được duyệt giữ poster, thiết kế, tên hiển thị và liên kết công khai. Xóa thông tin liên hệ riêng cùng bản chờ; từ chối xóa ngay.
- Chỉ admin có đăng nhập được xem thông tin riêng, sửa site, quản lý bài/khung. Bản cục bộ dùng Scrypt, cookie HttpOnly/SameSite và CSRF; bản online dùng Supabase Auth, Bearer JWT, RLS theo email quản trị và kiểm tra Origin. Không có mật khẩu mặc định; người sở hữu tự tạo user trong Supabase.
- Không phục vụ private-data/server files, không raw HTML từ nội dung. Tất cả ảnh được phục vụ/upload vào thư viện là WebP; SVG gốc vẫn giữ SVG.

## API public

API trả JSON, lỗi `{error: 'Tiếng Việt'}`. Frontend dùng fetch cùng origin; cấu hình `window.HUNG_API_BASE` (không có slash cuối) nếu sau tách API.

- `GET /api/health` → `{ok:true}`
- `GET /api/site` → đối tượng `{displayName,shortName,intro,about,email,phone,blogTitle,blogIntro}`.
- `GET /api/posts` → `{posts:[{id,slug,title,excerpt,content,category,tags,publishedAt,isSample,coverUrl}]}` chỉ bài published.
- `GET /api/posts/:slug` → `{post:...}` hoặc 404.
- `GET /api/frames` → `{frames:[{id,name,authorName,authorLink,imageUrl,design,createdAt}]}` chỉ approved.
- `GET /api/frames/:id/image.webp` → WebP approved.
- `POST /api/frame-submissions` → body `{name,authorName,authorContact,authorLink,consent:true,design,imageDataUrl}`. `design` gồm các khóa cho phép `{background,ink,accent,title,footer,pattern,sticker}`; không chứa ảnh cá nhân hoặc dataURL. `imageDataUrl` là poster khung-only WebP tối đa 1MB. Trả `{id,status:'pending',expiresAt}`. Tên tác giả bắt buộc, liên hệ riêng tùy chọn; public link chỉ https/http.

## API admin

- `GET /api/admin/session` → `{authenticated,needsSetup,setupAllowed,csrfToken?}`.
- `POST /api/admin/setup` `{password,setupToken?}` → thiết lập admin, đăng nhập và trả `{authenticated:true,csrfToken}`. Chỉ dùng khi chưa có admin.
- `POST /api/admin/login` `{password}` → cookie session + `{authenticated:true,csrfToken}`.
- `POST /api/admin/logout` → `{ok:true}`.
- Mọi ghi sau đăng nhập có header `X-CSRF-Token` và JSON; dùng fetch credentials same-origin/include khi cần.
- `GET /api/admin/site` / `PUT /api/admin/site` → đọc/sửa các trường site nêu trên.
- `GET /api/admin/posts` → `{posts:[...]}`; `POST /api/admin/posts` và `PUT /api/admin/posts/:id` nhận `{title,slug,excerpt,content,category,tags,status,isSample,coverDataUrl?}`. Status draft/published; cover chỉ WebP, tùy chọn. DELETE xóa bài.
- `GET /api/admin/submissions` → `{submissions:[{id,name,authorName,authorContact,authorLink,design,imageUrl,createdAt,expiresAt}]}`.
- `GET /api/admin/submissions/:id/image.webp` → ảnh chờ, cần auth, no-store.
- `POST /api/admin/submissions/:id/approve` → `{frame:...}`; `/reject` → `{ok:true}`.
- `GET /api/admin/frames` → `{frames:[...]}`; `DELETE /api/admin/frames/:id` → `{ok:true}`.

Seed ba bài minh họa nguyên bản, nhãn isSample=true; không bịa trải nghiệm/khách hàng. Giao diện đều tiếng Việt, cùng giấy kem/xanh tím/vàng, Gilroy + Playfair.
