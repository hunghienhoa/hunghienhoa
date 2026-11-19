# Quy trình ứng phó sự cố

Dùng khi nghi ngờ hoặc phát hiện: lộ mật khẩu/khóa bí mật, tài khoản quản trị bị chiếm, lộ dữ liệu người đóng góp, trang bị chèn mã lạ, website bị tấn công làm sập, hoặc có nội dung vi phạm được đăng. Hùng là người phụ trách duy nhất, nên quy trình viết để một người làm được từ đầu đến cuối.

Bốn nguyên tắc:

1. **Ghi giờ phát hiện trước tiên.** Thời hạn 72 giờ báo cơ quan chức năng tính từ lúc phát hiện, không phải lúc xảy ra.
2. **Chặn trước, tìm nguyên nhân sau.** Đổi khóa, khóa tài khoản, tạm dừng tính năng rồi mới điều tra.
3. **Không xóa bằng chứng.** Không xóa log, commit lạ hay tài khoản lạ trước khi chụp màn hình và ghi lại.
4. **Không dán mật khẩu, khóa hoặc chuỗi kết nối database vào chat, issue, email hay commit.** Nếu lỡ dán thì coi như đã lộ, làm theo tình huống A.

Nhật ký sự cố và ảnh chụp bằng chứng lưu ngoài GitHub, ở thư mục riêng tư (ví dụ `%LOCALAPPDATA%/HungHienHoa/su-co`). Không commit vào kho mã. Nhật ký chỉ ghi loại và số lượng dữ liệu bị ảnh hưởng, không chép lại dữ liệu cá nhân bị lộ.

## 1. Bản đồ dữ liệu và tài khoản

### Dữ liệu cá nhân website đang giữ

| Dữ liệu | Nơi lưu | Thời hạn | Nếu bị lộ |
| --- | --- | --- | --- |
| Ảnh chụp, ảnh chọn để ghép | Chỉ bộ nhớ trình duyệt của người dùng | Xóa khi rời trang hoặc sau 1 giờ | Máy chủ không có ảnh để lộ. Rủi ro thật là **mã lạ chèn vào trang** đọc trộm camera (tình huống D) |
| Bản đóng góp chờ duyệt: tên khung, tên hiển thị, **thông tin liên hệ**, liên kết, ảnh khung | Supabase, bảng `frame_submissions` | Bị chặn khi đủ 1 giờ; pg_cron xóa mỗi phút | Lộ liên hệ của người gửi trong khoảng 1 giờ gần nhất (hoặc trong suốt thời gian kẻ tấn công còn quyền truy cập) |
| Khung đã duyệt: tên, tên hiển thị, liên kết, thời điểm đồng ý | Supabase, bảng `frames` | Lâu dài | Đây là dữ liệu công khai, không có liên hệ riêng |
| Bài viết, nội dung trang, ảnh media | Supabase | Lâu dài | Không chứa dữ liệu cá nhân của người khác |
| Đếm lượt truy cập | Cloudflare Durable Object `VisitCounter` | Mã băm IP theo ngày, thống kê khoảng 90 ngày | Lộ mã băm, không có IP gốc |
| Tài khoản quản trị | Supabase Auth, chỉ `hunghienhoa2110@gmail.com` | Lâu dài | Kẻ chiếm quyền đọc được bản chờ, sửa hoặc xóa nội dung |
| Nhật ký kỹ thuật | Cloudflare Workers Logs (đang bật), Supabase Logs | Theo thời hạn của nhà cung cấp | Có đường dẫn và địa chỉ mạng của người truy cập |

Vì bản chờ tự xóa sau 1 giờ và khung đã duyệt không giữ liên hệ, phạm vi lộ dữ liệu cá nhân thường nhỏ. Vẫn phải làm đủ các bước bên dưới.

### Tài khoản và khóa bí mật

| Tên | Dùng cho | Đổi ở đâu | Đổi xong cập nhật ở đâu |
| --- | --- | --- | --- |
| Mật khẩu database Supabase | Áp migration khi deploy | Supabase → Project Settings → Database → Reset database password | GitHub → repo → Settings → Secrets and variables → Actions → `SUPABASE_DB_URL` |
| Mật khẩu admin website | Đăng nhập admin.hunghienhoa.com | Supabase → Authentication → Users → `hunghienhoa2110@gmail.com` → đặt lại mật khẩu | Không cần cập nhật nơi khác |
| Khóa ký JWT Supabase | Phiên đăng nhập | Supabase → Project Settings → JWT Keys → xoay khóa | Không cần cập nhật code; mọi phiên cũ hết hiệu lực |
| Secret key Supabase (`sb_secret_…`) | Code không dùng | Supabase → Project Settings → API Keys → thu hồi, tạo mới | Không cần |
| Publishable key Supabase (`sb_publishable_…`) | Công khai theo thiết kế, RLS bảo vệ dữ liệu | Chỉ đổi khi bị lạm dụng | `cloudflare.config.ts` và `config.js` trong `dist`, rồi deploy |
| `CLOUDFLARE_API_TOKEN` | GitHub Actions deploy Worker | Cloudflare → My Profile → API Tokens → Roll hoặc Revoke | GitHub Actions secret `CLOUDFLARE_API_TOKEN` |
| `CLOUDFLARE_USAGE_TOKEN`, `GITHUB_USAGE_TOKEN` | Bảng số liệu dùng tài nguyên trong admin | Cloudflare API Tokens / GitHub → Settings → Developer settings → Tokens | Cloudflare → Workers & Pages → `hunghienhoa` → Settings → Variables and Secrets |
| Tài khoản GitHub, Cloudflare, Supabase | Toàn bộ mã, deploy và dữ liệu | Đổi mật khẩu, kiểm tra 2FA | — |
| Gmail `hunghienhoa2110@gmail.com` | Khôi phục mật khẩu admin, nhận thông báo | Google Account → Security | Kiểm tra cả quy tắc chuyển tiếp thư lạ |
| Tài khoản tên miền tại Nhân Hòa | Nameserver trỏ về Cloudflare | Trang quản lý tên miền Nhân Hòa | Kiểm tra nameserver vẫn là của Cloudflare, bật khóa chuyển tên miền |

Mật khẩu có ký tự đặc biệt khi đưa vào `SUPABASE_DB_URL` phải mã hóa URL, ví dụ `@` thành `%40`. Dùng chuỗi Session pooler (`aws-0-ap-southeast-1.pooler.supabase.com`, cổng 5432).

## 2. Mức độ

| Mức | Ví dụ | Bắt đầu xử lý |
| --- | --- | --- |
| **1 – Nghiêm trọng** | Lộ liên hệ người đóng góp; admin hoặc GitHub/Cloudflare bị chiếm; trang có mã lạ; khóa bí mật đã bị dùng | Ngay lập tức, tính giờ 72 giờ |
| **2 – Cao** | Khóa bí mật bị lộ nhưng chưa thấy bị dùng; website sập; deploy lạ | Trong ngày |
| **3 – Thường** | Spam bản đóng góp, lạm dụng Snap, nội dung vi phạm bản quyền | Trong 1–3 ngày, theo trang Báo cáo bản quyền |

Không chắc mức nào thì xếp mức cao hơn.

## 3. Sáu bước

### Bước 1. Ghi nhận (0–15 phút)

- [ ] Ghi vào nhật ký: giờ phát hiện, ai/cái gì báo, dấu hiệu thấy được.
- [ ] Chụp màn hình dấu hiệu (trang lạ, email cảnh báo, log, commit lạ).
- [ ] Xếp mức độ theo mục 2.

### Bước 2. Ngăn chặn (trong 1 giờ đầu)

Làm theo tình huống khớp nhất. Nhiều tình huống cùng lúc thì làm tất cả.

**A. Lộ mật khẩu hoặc khóa bí mật** (dán nhầm vào chat, commit lên GitHub, ảnh chụp màn hình…)

- [ ] Đổi ngay khóa đó theo bảng ở mục 1, rồi cập nhật nơi đang dùng.
- [ ] Mật khẩu database: sau khi đổi và cập nhật `SUPABASE_DB_URL`, chạy lại workflow deploy và xác nhận bước "Cập nhật cơ sở dữ liệu Supabase" xanh.
- [ ] Nếu khóa đã bị commit: đổi khóa là đủ để chặn. Xóa khỏi lịch sử git chỉ là việc phụ, vì bản sao có thể đã bị lấy.
- [ ] Xem log (bước 3) để biết khóa đã bị dùng chưa. Đã bị dùng thì nâng lên mức 1.

**B. Tài khoản bị chiếm** (admin website, Gmail, GitHub, Cloudflare, Supabase)

- [ ] Lấy lại tài khoản: đổi mật khẩu, bật hoặc đặt lại 2FA, đăng xuất mọi phiên lạ.
- [ ] Admin website: đặt lại mật khẩu admin và xoay khóa ký JWT để mọi phiên cũ hết hiệu lực.
- [ ] Gmail: xóa quy tắc chuyển tiếp hoặc bộ lọc lạ. Gmail là đường khôi phục mật khẩu admin.
- [ ] GitHub: Settings → Applications, thu hồi ứng dụng lạ; xem Security log; xem commit và workflow mới trên `main`.
- [ ] Cloudflare/Supabase: xem thành viên, API token mới tạo, thay đổi DNS, thay đổi chính sách RLS. Thu hồi cái lạ.
- [ ] Đổi tất cả khóa bí mật mà tài khoản đó xem được (tình huống A).

**C. Lộ dữ liệu bản đóng góp** (lỗi RLS, admin bị chiếm, database bị truy cập trái phép)

- [ ] Tạm dừng nhận bản đóng góp mới (SQL ở mục 4).
- [ ] Xóa ngay các bản chờ hiện có nếu không cần giữ để điều tra (SQL ở mục 4). Chỉ chụp lại số lượng và thời điểm, không chép nội dung liên hệ.
- [ ] Làm tình huống B nếu nguyên nhân là tài khoản bị chiếm.
- [ ] Đi tiếp bước 3, bước 4: đây là sự cố có thể phải báo cơ quan chức năng.

**D. Trang bị thay đổi hoặc chèn mã lạ**

- [ ] Trước tiên thu hồi `CLOUDFLARE_API_TOKEN` và kiểm tra tài khoản GitHub, để kẻ tấn công không deploy lại được.
- [ ] Đưa Worker về bản sạch: Cloudflare → Workers & Pages → `hunghienhoa` → Deployments → chọn bản trước thời điểm bị chèn → Rollback.
- [ ] Revert commit lạ trên `main` bằng PR, vì lần deploy kế tiếp từ `main` sẽ ghi đè bản rollback.
- [ ] Kiểm tra mã lạ có gửi dữ liệu ra ngoài không: tìm `fetch`, `navigator.mediaDevices`, script từ tên miền lạ. Nếu mã có thể đã đọc camera hoặc ảnh người dùng, coi là lộ dữ liệu cá nhân (đi tiếp bước 4).

**E. Website sập, bị tấn công dồn dập, lạm dụng Snap**

- [ ] Cloudflare → tên miền `hunghienhoa.com` → Security: bật chế độ chống tấn công (Under Attack) hoặc thêm quy tắc chặn theo quốc gia/địa chỉ.
- [ ] Snap đã có giới hạn 30 lượt/phút mỗi địa chỉ. Nếu vẫn quá tải thì tạm chặn đường dẫn `snap.hunghienhoa.com` bằng quy tắc WAF.
- [ ] Spam bản đóng góp: tạm dừng nhận (SQL ở mục 4). Bản chờ tự xóa sau 1 giờ.

**F. Nội dung vi phạm** (khung, bài viết vi phạm bản quyền hoặc trái pháp luật)

- [ ] Gỡ hoặc ẩn trong admin.hunghienhoa.com.
- [ ] Trả lời người báo cáo theo trang [Báo cáo nội dung và bản quyền](https://hunghienhoa.com/bao-cao-ban-quyen).
- [ ] Yêu cầu từ cơ quan có thẩm quyền: giữ lại văn bản yêu cầu, xử lý trong thời hạn được nêu.

### Bước 3. Đánh giá (trong 24 giờ)

Trả lời bốn câu hỏi: **xảy ra từ khi nào, qua đường nào, dữ liệu nào, của bao nhiêu người.**

| Xem ở đâu | Tìm gì |
| --- | --- |
| Cloudflare → Workers & Pages → `hunghienhoa` → Observability / Logs | Yêu cầu bất thường tới `/api/admin/…`, lỗi 401/403 dồn dập, địa chỉ lạ |
| Supabase → Logs & Analytics (API, Auth, Postgres) | Đăng nhập lạ, truy vấn tới `frame_submissions`, thay đổi chính sách |
| Supabase → Authentication → Users | Lần đăng nhập cuối của admin, user lạ (đăng ký phải đang tắt) |
| GitHub → Actions và lịch sử commit `main` | Deploy hoặc commit không phải của Hùng |
| GitHub → Settings → Security log | Đăng nhập, token, ứng dụng mới |
| Supabase SQL: `select * from cron.job_run_details order by end_time desc limit 20;` | Tác vụ xóa bản chờ có chạy đều không (lịch sử giữ 7 ngày) |

Ghi kết luận vào nhật ký: loại dữ liệu, số người ảnh hưởng (ước lượng nếu chưa chắc), thời gian bị lộ, nguyên nhân.

### Bước 4. Thông báo (trước 72 giờ kể từ lúc phát hiện)

**Báo cơ quan chức năng** khi vi phạm có thể gây tổn hại tới quốc phòng, an ninh, trật tự xã hội, hoặc tới tính mạng, sức khỏe, danh dự, nhân phẩm, tài sản của người có dữ liệu bị lộ. Lộ email hoặc số điện thoại có thể dẫn tới lừa đảo, nên **khi lộ liên hệ của người đóng góp thì nên báo**. Không chắc thì báo.

- Nơi nhận: cơ quan chuyên trách bảo vệ dữ liệu cá nhân, tức Cục An ninh mạng và phòng, chống tội phạm sử dụng công nghệ cao (A05), Bộ Công an.
- Cách gửi: qua Cổng thông tin quốc gia về bảo vệ dữ liệu cá nhân hoặc đường bưu chính.
- Biểu mẫu: **Mẫu số 08** trong Phụ lục Nghị định 356/2025/NĐ-CP.
- Chưa đủ thông tin trong 72 giờ thì vẫn gửi phần đã biết, bổ sung sau. Không chờ điều tra xong.

Chuẩn bị sẵn để điền mẫu (lấy từ nhật ký):

- Thời điểm xảy ra (ước lượng) và thời điểm phát hiện.
- Mô tả vi phạm: chuyện gì xảy ra, qua đường nào.
- Loại dữ liệu và số người bị ảnh hưởng.
- Hậu quả có thể xảy ra với người bị ảnh hưởng.
- Biện pháp đã làm để chặn và giảm tác hại; biện pháp sẽ làm.
- Người liên hệ: Hùng Hiền Hòa, hunghienhoa2110@gmail.com, 0898.29.8886.

**Báo người bị ảnh hưởng** bằng chính liên hệ họ đã gửi (nếu còn và an toàn để dùng). Không liên hệ được từng người thì đăng thông báo trên website.

### Bước 5. Khắc phục

- [ ] Sửa nguyên nhân gốc bằng PR, chạy `npm run check`, merge để GitHub Actions deploy.
- [ ] Xác nhận website thật: `node tools/cloud-smoke.mjs`, đăng nhập admin, thử gửi một bản đóng góp.
- [ ] Bật lại tính năng đã tạm dừng (SQL ở mục 4).
- [ ] Theo dõi log thêm 7 ngày.

### Bước 6. Rút kinh nghiệm (trong 7 ngày sau khi xử lý xong)

- [ ] Viết vài dòng vào nhật ký: diễn biến, nguyên nhân, đã làm gì, lần sau làm khác gì.
- [ ] Cập nhật tài liệu này nếu có bước sai hoặc thiếu.
- [ ] Giữ hồ sơ sự cố ít nhất 5 năm (theo tóm tắt Nghị định 356/2025; xem lại văn bản gốc), ngoài GitHub.

## 4. Lệnh khẩn cấp

Chạy trong Supabase → SQL Editor của dự án `hunghienhoa`.

Tạm dừng nhận bản đóng góp mới:

```sql
alter policy submissions_public_insert on public.frame_submissions with check (false);
```

Xóa toàn bộ bản chờ hiện có:

```sql
delete from public.frame_submissions;
```

Mở lại nhận bản đóng góp (đúng điều kiện gốc trong migration):

```sql
alter policy submissions_public_insert on public.frame_submissions
  with check (consent and expires_at > now() and expires_at <= created_at + interval '1 hour');
```

Đây là sửa nóng trên production, không đi qua migration. Sau sự cố nhớ mở lại. Nếu muốn giữ trạng thái tạm dừng lâu dài thì thêm migration mới vào `supabase/migrations`, vì lần sau có thể chạy lại migration cũ.

Đưa Worker về bản trước: Cloudflare → Workers & Pages → `hunghienhoa` → Deployments → Rollback (xem tình huống D).

## 5. Mẫu thông báo

### Gửi người đóng góp bị ảnh hưởng

> Tiêu đề: Thông báo về sự cố dữ liệu tại Hộp Ảnh của Hùng
>
> Chào bạn,
>
> Ngày [ngày], mình phát hiện [mô tả ngắn: ví dụ "một lỗi cấu hình cho phép truy cập trái phép bản đóng góp khung chờ duyệt"]. Thông tin của bạn có thể đã bị ảnh hưởng gồm: [tên hiển thị / thông tin liên hệ / liên kết]. Ảnh chụp cá nhân không bị ảnh hưởng vì website không lưu ảnh chụp.
>
> Mình đã [biện pháp: khóa truy cập, đổi khóa bảo mật, xóa dữ liệu chờ duyệt] và đã báo cơ quan chức năng theo quy định.
>
> Bạn nên cảnh giác với tin nhắn, email hoặc cuộc gọi lạ nhắc tới Hộp Ảnh hoặc hunghienhoa.com. Mình không bao giờ hỏi mật khẩu hay mã xác thực.
>
> Bạn cần hỏi thêm hoặc muốn xóa dữ liệu liên quan, trả lời email này hoặc gửi tới hunghienhoa2110@gmail.com.
>
> Hùng Hiền Hòa

### Thông báo công khai trên website

> **Thông báo sự cố ngày [ngày]**
>
> Mình phát hiện [mô tả ngắn] vào [giờ, ngày]. Dữ liệu có thể bị ảnh hưởng: [loại dữ liệu], của khoảng [số] người gửi bản đóng góp trong [khoảng thời gian]. Ảnh chụp ở Hộp Ảnh không bị ảnh hưởng vì chỉ nằm trong trình duyệt của bạn.
>
> Mình đã [biện pháp] và đã báo cơ quan chức năng. Nếu bạn đã gửi khung trong khoảng thời gian trên và cần hỗ trợ, liên hệ hunghienhoa2110@gmail.com.

## 6. Chuẩn bị trước (làm từ bây giờ)

- [ ] Bật 2FA cho GitHub, Cloudflare, Supabase, Gmail `hunghienhoa2110@gmail.com` và tài khoản tên miền Nhân Hòa. Cất mã khôi phục ngoài máy tính.
- [ ] Supabase → Authentication: bật Leaked password protection, xác nhận đã tắt đăng ký tài khoản mới.
- [ ] GitHub → repo → Settings → Code security: bật Secret scanning và Push protection để chặn commit có khóa.
- [ ] Lưu một bản tài liệu này ngoài GitHub (PDF hoặc bản in), phòng khi mất quyền vào GitHub.
- [ ] Mỗi 6 tháng diễn tập một lần: đổi thử mật khẩu database theo tình huống A và xác nhận deploy vẫn xanh.

## Căn cứ pháp lý

- **Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15** (hiệu lực 01/01/2026), Điều 23 về thông báo vi phạm: thông báo cơ quan chuyên trách chậm nhất 72 giờ kể từ khi phát hiện, với các vi phạm có thể gây tổn hại như ở bước 4.
- **Nghị định 356/2025/NĐ-CP** (hiệu lực 01/01/2026): Mẫu số 08, Điều 28 về nội dung thông báo, cách gửi qua Cổng thông tin quốc gia về bảo vệ dữ liệu cá nhân hoặc bưu chính. Điều 29 về dữ liệu vị trí và sinh trắc học; website hiện không xử lý loại dữ liệu này trên máy chủ.
- **Luật An ninh mạng số 116/2025/QH15** (hiệu lực 01/07/2026) và Nghị định 333/2026/NĐ-CP hướng dẫn luật này. Nghĩa vụ báo cáo sự cố an ninh mạng theo hai văn bản này **chưa được đối chiếu** trong tài liệu này. Nếu bị tấn công nghiêm trọng (chiếm quyền, chèn mã, tấn công làm sập kéo dài), báo thêm Cục A05.
- Xử phạt vi phạm hành chính về an ninh mạng và bảo vệ dữ liệu cá nhân: Nghị định 330/2026/NĐ-CP.

Các điểm trên tổng hợp từ bản tóm tắt của công ty luật, kiểm toán và Công báo trích đoạn, chưa đọc trực tiếp toàn văn. Trước khi nộp thông báo, đối chiếu Điều 23 của Luật và Mẫu số 08 với văn bản trên Công báo hoặc Cơ sở dữ liệu quốc gia về văn bản pháp luật (vbpl.moj.gov.vn):

- [Công báo số 971-972/2025, trang có Điều 23 Luật Bảo vệ dữ liệu cá nhân](https://vi.wikisource.org/wiki/Trang:Cong_bao_Chinh_phu_971_972_nam_2025.pdf/25)
- [Công báo số 18/2026, Nghị định 356/2025/NĐ-CP](https://congbaocdn.chinhphu.vn/180507251028987904/2026/1/17/356signed-1768638052103952849513.pdf)
- [EY: Nghị định 356/2025/NĐ-CP](https://www.ey.com/vi_vn/technical/tax/tax-and-law-updates/nghi-dinh-so-356-2025-nd-cp-quy-dinh-chi-tiet-mot-so-dieu-va-bien-phap-thi-hanh-luat-bao-ve-du-lieu-ca-nhan)
- [Thư viện Pháp luật: Hướng dẫn thông báo vi phạm quy định về bảo vệ dữ liệu cá nhân](https://thuvienphapluat.vn/chinh-sach-phap-luat-moi/vn/ho-tro-phap-luat/tu-van-phap-luat/64996/huong-dan-thong-bao-vi-pham-quy-dinh-ve-bao-ve-du-lieu-ca-nhan)
- [Luật An ninh mạng 116/2025/QH15 trên vbpl.moj.gov.vn](https://vbpl.moj.gov.vn/TW/Lists/vbpq/Attachments/187039/116.2025.QH15.docx)
