-- Bản chờ duyệt (có thông tin liên hệ riêng) không được sống quá một giờ kể từ lúc gửi.
-- Trước đây điều kiện chỉ so expires_at với created_at do phía gửi tự điền, nên gọi thẳng REST bằng publishable key
-- với created_at ở tương lai sẽ giữ được bản chờ lâu hơn một giờ. Giờ hạn được tính theo đồng hồ database;
-- dư một phút cho lệch giờ giữa Cloudflare Worker và Supabase.
alter policy submissions_public_insert on public.frame_submissions
  with check (
    consent
    and expires_at > now()
    and expires_at <= now() + interval '1 hour 1 minute'
    and created_at <= now() + interval '1 minute'
    and expires_at <= created_at + interval '1 hour'
  );
