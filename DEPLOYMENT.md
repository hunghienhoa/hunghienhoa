# Triển khai `hunghienhoa`

## Kiến trúc đang dùng

```text
GitHub (mã nguồn) → GitHub Actions (kiểm tra/build/deploy) → Cloudflare Worker
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

## GitHub → Cloudflare tự triển khai

Quy trình nằm trong `.github/workflows/deploy.yml`; xem các lượt chạy tại [GitHub Actions](https://github.com/hunghienhoa/hunghienhoa/actions/workflows/deploy.yml). Dùng GitHub Actions để không phụ thuộc kết nối GitHub App của Workers Builds đang thiếu quyền. Không cần bật thêm một quy trình Workers Builds thứ hai cho cùng Worker.

1. Push hoặc merge vào `main` sẽ chạy `npm ci` và `npm run check`.
2. Build một lần bằng `npm run build -- --mode production`, rồi dry-run đúng build đó.
3. Chỉ nhánh `main` và sự kiện push/chạy thủ công được nhận token để deploy bằng `npx cf deploy --prebuilt --mode production`.
4. Sau deploy, kiểm tra website thật bằng `node tools/cloud-smoke.mjs`.
5. Pull request chỉ kiểm tra/build/dry-run; không nhận token và không triển khai production.

Node.js được khóa ở `24.22.1` trong `.node-version`, thư viện khóa bởi `package-lock.json`, hai GitHub Actions chính thức khóa theo commit SHA. Có thể chạy lại từ **Actions → Triển khai hunghienhoa → Run workflow** trên nhánh `main`.

Khóa `CLOUDFLARE_API_TOKEN` đã lưu mã hóa trong **GitHub Settings → Secrets and variables → Actions**. Biến `CLOUDFLARE_ACCOUNT_ID` chọn đúng tài khoản. Token chỉ có Workers Scripts Write trong tài khoản Cloudflare đang dùng, cùng Workers Routes Write và Zone Read cho zone `hunghienhoa.com`; không có quyền Supabase, quản lý token hay sửa DNS tùy ý.

Token tên `hunghienhoa-github-deploy` hết hạn **10/11/2027**. Trước ngày này, tạo token mới cùng phạm vi trong Cloudflare, cập nhật GitHub Secret, chạy workflow kiểm tra rồi thu hồi token cũ. Không chép token vào file, commit hay chat.

Nguồn hướng dẫn: [Dùng cf với GitHub Actions](https://developers.cloudflare.com/cf/ci/).

## Tạo tài khoản quản trị Supabase

Mã nguồn không chứa mật khẩu mặc định. Hùng tự tạo tài khoản đầu tiên:

1. Mở Supabase Dashboard → dự án `hunghienhoa` → Authentication → Users.
2. Chọn **Add user** và tạo user `hunghienhoa2110@gmail.com` với mật khẩu riêng từ 12 ký tự; bật xác nhận email cho user này.
3. Vào Authentication → URL Configuration, đặt Site URL là `https://admin.hunghienhoa.com` và thêm cùng URL vào Redirect URLs.
4. Mở https://admin.hunghienhoa.com/ và đăng nhập thử. Sau đó tắt **Allow new users to sign up**. RLS chỉ cấp quyền quản trị cho đúng email trên, nhưng tắt signup vẫn giảm tài khoản rác.

Hùng đã xác nhận đăng nhập bằng tài khoản thật thành công sau bản sửa `95c4e6b`. Lần kiểm tra connector gần nhất bị từ chối quyền quản trị Supabase; quyền connector độc lập với đăng nhập admin của website. Không tạo user trực tiếp bằng SQL vào bảng `auth.users`.

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
3. Theo dõi GitHub Actions đến khi toàn bộ lượt chạy xanh. Nếu kiểm thử lỗi, website giữ nguyên bản production trước đó. Vẫn có thể chạy `npm run deploy` thủ công từ máy đã đăng nhập đúng Cloudflare khi cần.
4. Thay đổi nội dung hằng ngày thực hiện tại `admin.hunghienhoa.com`; nội dung được lưu trực tiếp trong Supabase, không cần commit Git.

## Giới hạn đã ghi nhận

- Bản cục bộ tiếp tục dùng cookie/CSRF và SQLite riêng; dữ liệu trên máy và dữ liệu Supabase online là hai bộ dữ liệu khác nhau. Không tự đồng bộ database riêng lên GitHub.
- `cf` beta trên máy Windows hiện in `spawn UNKNOWN` ở bước mô phỏng Miniflare, nhưng build output, upload và triển khai production đều thành công. GitHub Actions chạy Ubuntu; bước smoke kiểm tra trang thật sau mỗi lần deploy.
- WebP guard chỉ cần Python chuẩn; Pillow chỉ cần khi chạy chuyển đổi ảnh, không cần để kiểm tra `--check`.
