# Triển khai `hunghienhoa`

## Kiến trúc đang dùng

```text
GitHub (mã nguồn) → GitHub Actions (kiểm tra/build/deploy) ─┬→ Supabase (migration trong supabase/migrations)
                                                            └→ Cloudflare Worker
Trình duyệt → hunghienhoa.com (mọi mục theo đường dẫn) → Supabase Auth + Postgres
```

GitHub chỉ giữ mã nguồn và kích hoạt bản triển khai; dữ liệu người dùng không đi qua GitHub. Ảnh chụp photobooth vẫn chỉ ở bộ nhớ trình duyệt. Khung chờ duyệt được gửi qua Worker tới Supabase, bị chặn ngay khi đủ một giờ và được Cron xóa vật lý mỗi phút; khung đã duyệt được giữ lại.

## Tài nguyên

- GitHub: `https://github.com/hunghienhoa/hunghienhoa`, nhánh `main`.
- Cloudflare Worker: `hunghienhoa`.
- Trang chính đang chạy: https://hunghienhoa.com/.
- Quản trị: https://admin.hunghienhoa.com/ (đường dẫn cũ hunghienhoa.com/admin/ tự chuyển sang).
- Blog: https://hunghienhoa.com/blog/.
- Photobooth: https://hunghienhoa.com/photobooth/.
- `workers.dev` được tắt khi triển khai tên miền chính.
- Supabase: dự án `hunghienhoa`, vùng Singapore (`ap-southeast-1`).

## Đổi nameserver tại Nhân Hòa

Zone `hunghienhoa.com` đã **Active**. Website chỉ còn một tên miền: mọi mục nằm dưới đường dẫn của `hunghienhoa.com`. Các bước bên dưới chỉ để đối chiếu khi quản lý tên miền.

1. Đăng nhập trang quản lý tên miền của Nhân Hòa.
2. Mở `hunghienhoa.com` → phần DNS/Nameserver.
3. Xóa bốn nameserver cũ `ns1.zonedns.vn` đến `ns4.zonedns.vn`.
4. Chỉ nhập hai nameserver Cloudflare:
   - `joel.ns.cloudflare.com`
   - `pat.ns.cloudflare.com`
5. Lưu thay đổi. Không cần tạo A/CNAME ở Nhân Hòa.
6. Chờ Cloudflare báo zone `Active`; việc cập nhật thường mất vài phút đến 24 giờ tùy nhà đăng ký.

`cloudflare.config.ts` khai báo ba Custom Domain: `hunghienhoa.com`, `www.hunghienhoa.com` (chuyển hướng 308 về `hunghienhoa.com`) và `admin.hunghienhoa.com` (riêng cho trang quản trị, phục vụ `dist/admin` ở gốc; `/api` và tài nguyên dùng chung như `/ui.css`, `/fonts`, `/assets` lấy từ gốc). Các trang công khai nằm trong đường dẫn:

| Đường dẫn | Nội dung |
| --- | --- |
| `hunghienhoa.com/` | Trang chủ: chia sẻ, công cụ và portfolio |
| `hunghienhoa.com/blog/` | Góc tò mò (blog) |
| `hunghienhoa.com/photobooth/` | Hộp Ảnh |
| `hunghienhoa.com/snaptik/` | Snap (đường dẫn ngắn `/snap/` chuyển về đây) |
| `hunghienhoa.com/lamnet/` | Làm Nét |
| `admin.hunghienhoa.com` | Bảng quản trị (`hunghienhoa.com/admin/` chuyển 308 sang đây) |

Các subdomain cũ của trang công khai (`blog.`, `photobooth.`, `snap.`, `lamnet.`) đã bỏ hẳn; mọi trang và API chạy trên `hunghienhoa.com`. Lịch đăng bài tự động gọi `https://hunghienhoa.com/api/agent/publish`; mã đăng bài là network secret của môi trường Claude chạy lịch, gắn cho host `hunghienhoa.com` (header Authorization). Đổi hoặc đăng ký mã mới: mở cửa sổ 10 phút bằng SQL (xem `supabase/migrations/20261127010509_agent_enroll_token.sql`), rồi từ môi trường đó gọi `curl -X POST https://hunghienhoa.com/api/agent/enroll`; database chỉ lưu bản băm SHA-256.

## GitHub → Cloudflare tự triển khai

Quy trình nằm trong `.github/workflows/deploy.yml`; xem các lượt chạy tại [GitHub Actions](https://github.com/hunghienhoa/hunghienhoa/actions/workflows/deploy.yml). Dùng GitHub Actions để không phụ thuộc kết nối GitHub App của Workers Builds đang thiếu quyền. Không cần bật thêm một quy trình Workers Builds thứ hai cho cùng Worker.

1. Push hoặc merge vào `main` sẽ chạy `npm ci` và `npm run check`.
2. Build một lần bằng `npm run build -- --mode production`, rồi dry-run đúng build đó.
3. Chỉ nhánh `main` và sự kiện push/chạy thủ công mới được nhận secret: trước tiên `supabase db push` áp các migration mới trong `supabase/migrations` lên Supabase, sau đó `npx cf deploy --prebuilt --mode production` triển khai Worker. Nếu migration lỗi, Worker không được triển khai.
4. Sau deploy, kiểm tra website thật bằng `node tools/cloud-smoke.mjs`.
5. Pull request chỉ kiểm tra/build/dry-run; không nhận token và không triển khai production.

Node.js được khóa ở `24.22.1` trong `.node-version`, thư viện khóa bởi `package-lock.json`, hai GitHub Actions chính thức khóa theo commit SHA. Có thể chạy lại từ **Actions → Triển khai hunghienhoa → Run workflow** trên nhánh `main`.

Khóa `CLOUDFLARE_API_TOKEN` đã lưu mã hóa trong **GitHub Settings → Secrets and variables → Actions**. Biến `CLOUDFLARE_ACCOUNT_ID` chọn đúng tài khoản. Token chỉ có Workers Scripts Write trong tài khoản Cloudflare đang dùng, cùng Workers Routes Write và Zone Read cho zone `hunghienhoa.com`; không có quyền Supabase, quản lý token hay sửa DNS tùy ý.

Secret `SUPABASE_DB_URL` chứa chuỗi kết nối **Session pooler** của Supabase (Dashboard → Connect → Session pooler, dạng `postgresql://postgres.sybdjztpsaffwcvjuimd:<mật khẩu DB>@aws-...pooler.supabase.com:5432/postgres`). Không dùng Direct connection vì máy GitHub Actions không có IPv6. Chỉ lưu trong GitHub Secrets, không chép vào file hay chat. Đổi mật khẩu database thì cập nhật secret này.

Tên file migration phải trùng `version` trong lịch sử của Supabase (`supabase_migrations.schema_migrations`); `db push` chỉ chạy file có version chưa có trong lịch sử và báo lỗi nếu lịch sử có version không có file tương ứng. Không sửa hay đổi tên migration đã chạy; muốn thay đổi thì thêm migration mới. Không áp migration thủ công trên Dashboard/MCP nữa, để lịch sử luôn khớp repo.

Token tên `hunghienhoa-github-deploy` hết hạn **10/11/2027**. Trước ngày này, tạo token mới cùng phạm vi trong Cloudflare, cập nhật GitHub Secret, chạy workflow kiểm tra rồi thu hồi token cũ. Không chép token vào file, commit hay chat.

Nguồn hướng dẫn: [Dùng cf với GitHub Actions](https://developers.cloudflare.com/cf/ci/).

## Tạo tài khoản quản trị Supabase

Mã nguồn không chứa mật khẩu mặc định. Hùng tự tạo tài khoản đầu tiên:

1. Mở Supabase Dashboard → dự án `hunghienhoa` → Authentication → Users.
2. Chọn **Add user** và tạo user `hunghienhoa2110@gmail.com` với mật khẩu riêng từ 12 ký tự; bật xác nhận email cho user này.
3. Vào Authentication → URL Configuration, đặt Site URL là `https://admin.hunghienhoa.com/` và thêm cùng URL vào Redirect URLs (đăng nhập bằng email + mật khẩu không cần chuyển hướng, cài đặt này dùng cho email xác nhận/đặt lại mật khẩu).
4. Mở https://admin.hunghienhoa.com/ và đăng nhập thử. Sau đó tắt **Allow new users to sign up**. RLS chỉ cấp quyền quản trị cho đúng email trên, nhưng tắt signup vẫn giảm tài khoản rác.

Hùng đã xác nhận đăng nhập bằng tài khoản thật thành công sau bản sửa `95c4e6b`. Lần kiểm tra connector gần nhất bị từ chối quyền quản trị Supabase; quyền connector độc lập với đăng nhập admin của website. Không tạo user trực tiếp bằng SQL vào bảng `auth.users`.

Không gửi mật khẩu qua chat và không thêm mật khẩu, access token, database URL hoặc secret key vào mã nguồn GitHub; các giá trị này chỉ nằm trong GitHub Secrets. Lỡ để lộ một giá trị như vậy thì làm theo tình huống A trong [quy trình ứng phó sự cố](INCIDENT-RESPONSE.md).

## Lệnh kiểm tra và triển khai thủ công

```powershell
npm ci
npm run check
npm run build
npm run deploy
node tools/cloud-smoke.mjs
```

Các migration Supabase nằm trong `supabase/migrations` và được GitHub Actions áp khi merge vào `main`. Sau mỗi thay đổi schema, chạy Security/Performance Advisors và xác nhận RLS.

## Cập nhật hằng ngày

1. Sửa và kiểm tra trên máy.
2. Commit rồi push nhánh `main` lên GitHub.
3. Theo dõi GitHub Actions đến khi toàn bộ lượt chạy xanh. Nếu kiểm thử lỗi, website giữ nguyên bản production trước đó. Vẫn có thể chạy `npm run deploy` thủ công từ máy đã đăng nhập đúng Cloudflare khi cần.
4. Thay đổi nội dung hằng ngày thực hiện tại `admin.hunghienhoa.com`; nội dung được lưu trực tiếp trong Supabase, không cần commit Git.
5. CSS/JS được tham chiếu kèm `?v=` được trình duyệt cache một năm (`immutable`). Khi sửa một tệp như vậy, tăng `v` ở mọi chỗ tham chiếu rồi chạy `node tools/asset-versions.mjs --write`; `npm run check` báo lỗi nếu nội dung đổi mà `v` giữ nguyên. Font cache 30 ngày, ảnh trong `assets` cache 1 ngày; HTML không cache.
6. Worker giữ dữ liệu Supabase công khai tại máy chủ Cloudflare gần người xem: nội dung trang, danh sách và từng bài, danh sách khung 60 giây; ảnh bìa bài và ảnh khung đã duyệt 5 phút. Khi lưu trong admin, cache ở trung tâm dữ liệu đang dùng được xóa ngay; nơi khác tự cập nhật trong tối đa 60 giây (ảnh 5 phút). Ảnh `/api/media/` không cache để ảnh bị gỡ biến mất ngay.

## Giám sát

Workflow `Giám sát website` (`.github/workflows/monitor.yml`) chạy mỗi giờ: kiểm tra các tên miền, `/api/site`, `/api/frames`, sitemap blog và gọi nhẹ Supabase REST để dự án gói miễn phí không bị tạm dừng vì không hoạt động. Lượt chạy đỏ thì GitHub gửi email (GitHub → Settings → Notifications → Actions). Có thể chạy tay ở tab Actions. GitHub tự tắt lịch chạy nếu repo không có commit trong 60 ngày; khi đó bật lại trong tab Actions.

## Sao lưu database

Workflow `Sao lưu database` (`.github/workflows/backup.yml`) chạy 02:41 sáng thứ Hai (giờ Việt Nam) và chạy tay được ở tab Actions. Nó dump cấu trúc và dữ liệu schema `public`, **trừ** bảng `frame_submissions` (bản chờ có liên hệ riêng, chỉ sống một giờ). Gói được mã hóa AES-256 rồi lưu thành artifact `database-backup` trong 90 ngày. Bản sao lưu không vào repo, `dist`, ZIP mã nguồn hay Releases.

Cần một GitHub Secret `BACKUP_PASSPHRASE`: chuỗi ngẫu nhiên từ 20 ký tự, tạo bằng trình quản lý mật khẩu và cất ở đó. Mất chuỗi này thì không giải mã được bản sao lưu. Không gửi chuỗi này qua chat hay email.

Khôi phục:

1. Tab Actions → lượt chạy `Sao lưu database` → tải artifact `database-backup`, giải nén file zip.
2. Giải mã (nhập `BACKUP_PASSPHRASE` khi được hỏi):
   ```bash
   openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -in hunghienhoa-db-*.tar.gz.enc | tar -xzf -
   ```
3. Dự án Supabase mới hoặc trống: chạy migration (`supabase db push --db-url ...`) rồi nạp dữ liệu `psql "$SUPABASE_DB_URL" -f data.sql`. Dự án đang có dữ liệu thì chỉ nạp bảng cần khôi phục, kiểm tra kỹ trước khi ghi đè. `schema.sql` là ảnh chụp cấu trúc để đối chiếu.

## AI đám mây cho Làm Nét (miễn phí)

Làm Nét có lựa chọn AI đám mây (làm nét ảnh và tạo ảnh mới) qua `/api/lamnet/ai`, chạy model `@cf/black-forest-labs/flux-2-klein-4b` của Cloudflare Workers AI bằng binding `AI` (khai báo `AI: bindings.ai()` trong `cloudflare.config.ts`). Không cần khóa API hay nạp tiền.

- Workers AI cho 10.000 Neuron miễn phí mỗi ngày (cả gói Workers Free lẫn Paid). Ảnh 1024px tốn khoảng 104 Neuron, làm nét (có ảnh gửi vào) khoảng 126 Neuron.
- Website giới hạn 3 lượt/người và 30 lượt/website mỗi ngày (giờ Việt Nam), tức tối đa khoảng 3.800 Neuron/ngày, luôn trong phần miễn phí; lỗi thì trả lại lượt. Đừng nâng `AI_DAILY_LIMIT` quá khoảng 75 nếu không muốn phát sinh phí trên gói Paid.
- FLUX.2 chỉ nhận ảnh đầu vào nhỏ hơn 512px: trình duyệt thu ảnh về tối đa 496px, model vẽ lại thành ảnh cạnh dài 1024px.
- Workers AI không giữ lại ảnh/kết quả và không dùng để huấn luyện (trang Data usage của Workers AI).
- Chạy cục bộ không có Workers AI nên lựa chọn này hiện “chưa bật”.

## Giới hạn đã ghi nhận

- Bản cục bộ tiếp tục dùng cookie/CSRF và SQLite riêng; dữ liệu trên máy và dữ liệu Supabase online là hai bộ dữ liệu khác nhau. Không tự đồng bộ database riêng lên GitHub.
- `cf` beta trên máy Windows hiện in `spawn UNKNOWN` ở bước mô phỏng Miniflare, nhưng build output, upload và triển khai production đều thành công. GitHub Actions chạy Ubuntu; bước smoke kiểm tra trang thật sau mỗi lần deploy.
- WebP guard chỉ cần Python chuẩn; Pillow chỉ cần khi chạy chuyển đổi ảnh, không cần để kiểm tra `--check`.
