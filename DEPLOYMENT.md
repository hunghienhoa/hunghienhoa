# Triển khai `hunghienhoa`

## Kiến trúc đang dùng

```text
GitHub (mã nguồn) → Cloudflare Workers Builds → Cloudflare Worker
                                                   ↓
Trình duyệt → hunghienhoa.com / các miền phụ → Supabase Auth + Postgres
```

GitHub chỉ giữ mã nguồn và kích hoạt bản triển khai; dữ liệu người dùng không đi qua GitHub. Ảnh chụp photobooth vẫn chỉ ở bộ nhớ trình duyệt. Khung chờ duyệt được gửi qua Worker tới Supabase, bị chặn ngay khi đủ một giờ và được Cron xóa vật lý mỗi phút; khung đã duyệt được giữ lại.

## Tài nguyên

- GitHub: `https://github.com/hunghienhoa/hunghienhoa`, nhánh `main`.
- Cloudflare Worker: `hunghienhoa`.
- Bản đang chạy trước khi gắn tên miền: `https://hunghienhoa.hunghienhoa.workers.dev`.
- Supabase: dự án `hunghienhoa`, vùng Singapore (`ap-southeast-1`).

## Đổi nameserver tại Nhân Hòa

Zone `hunghienhoa.com` hiện đã có trong Cloudflare nhưng chỉ được kích hoạt sau khi nameserver ở nhà đăng ký được thay đổi.

1. Đăng nhập trang quản lý tên miền của Nhân Hòa.
2. Mở `hunghienhoa.com` → phần DNS/Nameserver.
3. Xóa bốn nameserver cũ `ns1.zonedns.vn` đến `ns4.zonedns.vn`.
4. Chỉ nhập hai nameserver Cloudflare:
   - `joel.ns.cloudflare.com`
   - `pat.ns.cloudflare.com`
5. Lưu thay đổi. Không cần tạo A/CNAME cho bốn địa chỉ web ở Nhân Hòa.
6. Chờ Cloudflare báo zone `Active`; việc cập nhật thường mất vài phút đến 24 giờ tùy nhà đăng ký.

Sau khi zone hoạt động, thêm bốn Custom Domain vào Worker `hunghienhoa`:

| Tên miền | Nội dung |
| --- | --- |
| `hunghienhoa.com` | Portfolio chính |
| `admin.hunghienhoa.com` | Bảng quản trị |
| `blog.hunghienhoa.com` | Blog |
| `photobooth.hunghienhoa.com` | Hộp ảnh |

Cloudflare tự tạo DNS và chứng chỉ TLS cho Custom Domain. `www.hunghienhoa.com` nên chuyển hướng 308 về `hunghienhoa.com`.

## Tạo tài khoản quản trị Supabase

Mã nguồn không chứa mật khẩu mặc định. Hùng tự tạo tài khoản đầu tiên:

1. Mở Supabase Dashboard → dự án `hunghienhoa` → Authentication → Users.
2. Chọn **Add user** và tạo user `hunghienhoa2110@gmail.com` với mật khẩu riêng từ 12 ký tự; bật xác nhận email cho user này.
3. Vào Authentication → URL Configuration, đặt Site URL là `https://admin.hunghienhoa.com` và thêm cùng URL vào Redirect URLs.
4. Sau khi đăng nhập thử thành công, tắt **Allow new users to sign up**. RLS chỉ cấp quyền quản trị cho đúng email trên, nhưng tắt signup vẫn giảm tài khoản rác.

Không gửi mật khẩu qua chat và không thêm mật khẩu, access token, database URL hoặc secret key vào GitHub.

## Lệnh kiểm tra và triển khai thủ công

```powershell
npm install
npm run check
npm run build
npm run deploy
```

Các migration Supabase nằm trong `supabase/migrations`. Sau mỗi thay đổi schema, chạy Security/Performance Advisors và xác nhận RLS trước khi triển khai.

## Cập nhật hằng ngày

1. Sửa và kiểm tra trên máy.
2. Commit rồi push nhánh `main` lên GitHub.
3. Workers Builds build và triển khai Worker `hunghienhoa`.
4. Thay đổi nội dung hằng ngày thực hiện tại `admin.hunghienhoa.com`; nội dung được lưu trực tiếp trong Supabase, không cần commit Git.
