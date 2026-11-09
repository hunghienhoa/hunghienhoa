# Triển khai `hunghienhoa`

## Kiến trúc đang dùng

```text
GitHub (mã nguồn) → Workers Builds (chờ cấp quyền GitHub) → Cloudflare Worker
                                                   ↓
Trình duyệt → hunghienhoa.com / các miền phụ → Supabase Auth + Postgres
```

GitHub chỉ giữ mã nguồn và kích hoạt bản triển khai; dữ liệu người dùng không đi qua GitHub. Ảnh chụp photobooth vẫn chỉ ở bộ nhớ trình duyệt. Khung chờ duyệt được gửi qua Worker tới Supabase, bị chặn ngay khi đủ một giờ và được Cron xóa vật lý mỗi phút; khung đã duyệt được giữ lại.

## Tài nguyên

- GitHub: `https://github.com/hunghienhoa/hunghienhoa`, nhánh `main`.
- Cloudflare Worker: `hunghienhoa`.
- Trang chính đang chạy: https://hunghienhoa.com/.
- Quản trị: https://admin.hunghienhoa.com/.
- Blog: https://blog.hunghienhoa.com/.
- Photobooth: https://photobooth.hunghienhoa.com/.
- `workers.dev` được tắt khi triển khai tên miền chính.
- Supabase: dự án `hunghienhoa`, vùng Singapore (`ap-southeast-1`).

## Đổi nameserver tại Nhân Hòa

Zone `hunghienhoa.com` đã **Active**. Cả bốn tên miền đã được gắn vào Worker và kiểm tra HTTPS thành công ngày 09/11/2026. Các bước bên dưới chỉ để đối chiếu khi quản lý tên miền, không cần thay lại cấu hình đang đúng.

1. Đăng nhập trang quản lý tên miền của Nhân Hòa.
2. Mở `hunghienhoa.com` → phần DNS/Nameserver.
3. Xóa bốn nameserver cũ `ns1.zonedns.vn` đến `ns4.zonedns.vn`.
4. Chỉ nhập hai nameserver Cloudflare:
   - `joel.ns.cloudflare.com`
   - `pat.ns.cloudflare.com`
5. Lưu thay đổi. Không cần tạo A/CNAME cho bốn địa chỉ web ở Nhân Hòa.
6. Chờ Cloudflare báo zone `Active`; việc cập nhật thường mất vài phút đến 24 giờ tùy nhà đăng ký.

Bốn Custom Domain đã được khai báo trong `cloudflare.config.ts` của Worker `hunghienhoa`:

| Tên miền | Nội dung |
| --- | --- |
| `hunghienhoa.com` | Portfolio chính |
| `admin.hunghienhoa.com` | Bảng quản trị |
| `blog.hunghienhoa.com` | Blog |
| `photobooth.hunghienhoa.com` | Hộp ảnh |

Cloudflare tự tạo DNS và chứng chỉ TLS cho Custom Domain. `www.hunghienhoa.com` đã chuyển hướng 308 về `hunghienhoa.com`; các đường dẫn `/admin/`, `/blog/`, `/photobooth/` trên trang chính chuyển đến miền phụ tương ứng. Không thêm bản ghi A/CNAME thủ công trỏ sang IP hay dịch vụ khác.

## Hoàn tất GitHub → Cloudflare tự triển khai

Mã nguồn đã có trên GitHub, nhưng **tự triển khai chưa được kết nối**. API Workers Builds báo Git account chưa được cấp quyền. Hùng cần xác nhận GitHub App trong dashboard; đăng nhập CLI GitHub không tự cấp quyền này.

1. Mở [Cloudflare Dashboard](https://dash.cloudflare.com/), chọn tài khoản `hunghienhoa2110@gmail.com`.
2. Vào **Workers & Pages** → Worker `hunghienhoa` → **Settings → Builds → Connect**.
3. Chọn GitHub và đăng nhập tài khoản `hunghienhoa`. Nếu có màn hình cài ứng dụng, chọn **Only select repositories** và chỉ cấp kho `hunghienhoa/hunghienhoa`.
4. Chọn nhánh production `main`, thư mục gốc `/`, đặt cấu hình:

   | Trường | Giá trị |
   | --- | --- |
   | Build command | `npm run check && npm run build` |
   | Deploy command | `npx cf deploy --prebuilt --mode production` |
   | Node.js | `.node-version` đã khóa `24.22.1`, khớp build image hiện tại |
   | Previews / non-production branches | Tạm tắt; chỉ triển khai `main` |

5. Chọn build token tự quản lý mà Cloudflare đề xuất. Không gửi token qua chat, không chép token vào Git.
6. Lưu kết nối và bấm build/retry nếu có. Nếu giao diện yêu cầu, push commit kế tiếp để chạy bản đầu. Chỉ coi tự triển khai hoàn tất khi có một build thành công trong dashboard.

Nguồn hướng dẫn: [Connect an existing Worker](https://developers.cloudflare.com/workers/ci-cd/builds/#connect-an-existing-worker), [cf trong CI](https://developers.cloudflare.com/cf/ci/) và [Build image](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/).

## Tạo tài khoản quản trị Supabase

Mã nguồn không chứa mật khẩu mặc định. Hùng tự tạo tài khoản đầu tiên:

1. Mở Supabase Dashboard → dự án `hunghienhoa` → Authentication → Users.
2. Chọn **Add user** và tạo user `hunghienhoa2110@gmail.com` với mật khẩu riêng từ 12 ký tự; bật xác nhận email cho user này.
3. Vào Authentication → URL Configuration, đặt Site URL là `https://admin.hunghienhoa.com` và thêm cùng URL vào Redirect URLs.
4. Mở https://admin.hunghienhoa.com/ và đăng nhập thử. Sau đó tắt **Allow new users to sign up**. RLS chỉ cấp quyền quản trị cho đúng email trên, nhưng tắt signup vẫn giảm tài khoản rác.

Chưa kiểm chứng đăng nhập bằng tài khoản thật: Hùng tự đặt mật khẩu trong dashboard. Lần kiểm tra connector gần nhất bị từ chối quyền quản trị Supabase; API công khai của web vẫn hoạt động. Không tạo user trực tiếp bằng SQL vào bảng `auth.users`.

Không gửi mật khẩu qua chat và không thêm mật khẩu, access token, database URL hoặc secret key vào GitHub.

## Lệnh kiểm tra và triển khai thủ công

```powershell
npm ci
npm run check
npm run build
npm run deploy
node tools/cloud-smoke.mjs
```

Các migration Supabase nằm trong `supabase/migrations`. Sau mỗi thay đổi schema, chạy Security/Performance Advisors và xác nhận RLS trước khi triển khai.

## Cập nhật hằng ngày

1. Sửa và kiểm tra trên máy.
2. Commit rồi push nhánh `main` lên GitHub.
3. Sau khi cấp quyền theo mục trên, Workers Builds build và triển khai Worker `hunghienhoa`. Trước đó chạy `npm run deploy` thủ công từ máy đã đăng nhập đúng Cloudflare.
4. Thay đổi nội dung hằng ngày thực hiện tại `admin.hunghienhoa.com`; nội dung được lưu trực tiếp trong Supabase, không cần commit Git.

## Giới hạn đã ghi nhận

- Bản cục bộ tiếp tục dùng cookie/CSRF và SQLite riêng; dữ liệu trên máy và dữ liệu Supabase online là hai bộ dữ liệu khác nhau. Không tự đồng bộ database riêng lên GitHub.
- `cf` beta trên máy Windows hiện in `spawn UNKNOWN` ở bước mô phỏng Miniflare, nhưng build output, upload và triển khai production đều thành công. Kiểm tra trang thật bằng lệnh smoke sau mỗi lần deploy. Chưa kiểm chứng build đầu tiên trên Workers Builds cho đến khi GitHub App được cấp quyền.
- WebP guard chỉ cần Python chuẩn; Pillow chỉ cần khi chạy chuyển đổi ảnh, không cần để kiểm tra `--check`.
