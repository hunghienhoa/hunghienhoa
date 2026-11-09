create extension if not exists pg_cron;

create table public.site_settings (
  id smallint primary key default 1 check (id = 1),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now()
);

create table public.posts (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 160),
  excerpt text not null check (char_length(excerpt) between 1 and 500),
  content text not null check (char_length(content) between 1 and 80000),
  category text not null check (char_length(category) between 1 and 60),
  tags text[] not null default '{}',
  status text not null check (status in ('draft', 'published')),
  is_sample boolean not null default false,
  cover_base64 text check (cover_base64 is null or char_length(cover_base64) <= 1398104),
  has_cover boolean generated always as (cover_base64 is not null) stored,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create table public.frames (
  id uuid primary key,
  name text not null check (char_length(name) between 1 and 100),
  author_name text not null check (char_length(author_name) between 1 and 80),
  author_link text not null default '' check (char_length(author_link) <= 400),
  design jsonb not null check (jsonb_typeof(design) = 'object'),
  image_base64 text not null check (char_length(image_base64) <= 1398104),
  created_at timestamptz not null default now()
);

create table public.frame_submissions (
  id uuid primary key,
  name text not null check (char_length(name) between 1 and 100),
  author_name text not null check (char_length(author_name) between 1 and 80),
  author_contact text not null default '' check (char_length(author_contact) <= 200),
  author_link text not null default '' check (char_length(author_link) <= 400),
  consent boolean not null check (consent),
  design jsonb not null check (jsonb_typeof(design) = 'object'),
  image_base64 text not null check (char_length(image_base64) <= 1398104),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null check (expires_at > created_at and expires_at <= created_at + interval '1 hour')
);

create index posts_published_idx on public.posts (published_at desc, id) where status = 'published';
create index frame_submissions_expiry_idx on public.frame_submissions (expires_at);

alter table public.site_settings enable row level security;
alter table public.posts enable row level security;
alter table public.frames enable row level security;
alter table public.frame_submissions enable row level security;

revoke all on public.site_settings, public.posts, public.frames, public.frame_submissions from anon, authenticated;
grant select on public.site_settings, public.posts, public.frames to anon, authenticated;
grant insert on public.frame_submissions to anon;
grant insert, update, delete on public.posts to authenticated;
grant update on public.site_settings to authenticated;
grant insert, delete on public.frames to authenticated;
grant select, delete on public.frame_submissions to authenticated;
grant usage, select on sequence public.posts_id_seq to authenticated;

create policy site_public_read on public.site_settings for select to anon, authenticated using (true);
create policy site_admin_update on public.site_settings for update to authenticated
  using (lower((select auth.jwt()) ->> 'email') = 'hunghienhoa2110@gmail.com')
  with check (lower((select auth.jwt()) ->> 'email') = 'hunghienhoa2110@gmail.com');

create policy posts_public_read on public.posts for select to anon using (status = 'published');
create policy posts_admin_read on public.posts for select to authenticated using (lower((select auth.jwt()) ->> 'email') = 'hunghienhoa2110@gmail.com');
create policy posts_admin_insert on public.posts for insert to authenticated with check (lower((select auth.jwt()) ->> 'email') = 'hunghienhoa2110@gmail.com');
create policy posts_admin_update on public.posts for update to authenticated
  using (lower((select auth.jwt()) ->> 'email') = 'hunghienhoa2110@gmail.com')
  with check (lower((select auth.jwt()) ->> 'email') = 'hunghienhoa2110@gmail.com');
create policy posts_admin_delete on public.posts for delete to authenticated using (lower((select auth.jwt()) ->> 'email') = 'hunghienhoa2110@gmail.com');

create policy frames_public_read on public.frames for select to anon, authenticated using (true);
create policy frames_admin_insert on public.frames for insert to authenticated with check (lower((select auth.jwt()) ->> 'email') = 'hunghienhoa2110@gmail.com');
create policy frames_admin_delete on public.frames for delete to authenticated using (lower((select auth.jwt()) ->> 'email') = 'hunghienhoa2110@gmail.com');

create policy submissions_public_insert on public.frame_submissions for insert to anon
  with check (consent and expires_at > now() and expires_at <= created_at + interval '1 hour');
create policy submissions_admin_read on public.frame_submissions for select to authenticated
  using (lower((select auth.jwt()) ->> 'email') = 'hunghienhoa2110@gmail.com' and expires_at > now());
create policy submissions_admin_delete on public.frame_submissions for delete to authenticated
  using (lower((select auth.jwt()) ->> 'email') = 'hunghienhoa2110@gmail.com');

create or replace function public.approve_frame_submission(p_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  queued public.frame_submissions%rowtype;
begin
  if lower((select auth.jwt()) ->> 'email') is distinct from 'hunghienhoa2110@gmail.com' then
    raise exception 'Tài khoản này chưa có quyền quản trị.' using errcode = '42501';
  end if;

  select * into queued
  from public.frame_submissions
  where id = p_id and expires_at > now()
  for update;

  if not found then
    raise exception 'Bản đóng góp đã hết hạn hoặc không còn tồn tại.' using errcode = 'P0002';
  end if;

  insert into public.frames (id, name, author_name, author_link, design, image_base64, created_at)
  values (queued.id, queued.name, queued.author_name, queued.author_link, queued.design, queued.image_base64, now());

  delete from public.frame_submissions where id = queued.id;
  return queued.id;
end;
$$;

revoke all on function public.approve_frame_submission(uuid) from public, anon;
grant execute on function public.approve_frame_submission(uuid) to authenticated;

insert into public.site_settings (id, data) values (
  1,
  jsonb_build_object(
    'displayName', 'Hùng Hiền Hòa',
    'shortName', 'Hùng',
    'intro', E'Một chút tò mò. Một chút khác biệt.\nVà rất nhiều điều muốn kể bằng thiết kế.',
    'about', 'Đây là góc nhỏ dành cho những điều mình sáng tạo: từ một nét vẽ, một câu chuyện đến một thế giới hình ảnh hoàn chỉnh. Mình tin sự tò mò luôn là điểm bắt đầu thú vị.',
    'email', 'hunghienhoa2110@gmail.com',
    'phone', '0898.29.8886',
    'blogTitle', 'Góc tò mò của Hùng',
    'blogIntro', 'Những điều nhỏ mà thú vị, những ý tưởng muốn giữ lại và những câu chuyện muốn chia sẻ.'
  )
);

insert into public.posts (slug, title, excerpt, content, category, tags, status, is_sample, published_at) values
(
  'khi-chup-anh-tro-thanh-mot-cuoc-choi',
  'Khi chụp ảnh trở thành một cuộc chơi',
  'Bốn tấm ảnh, bốn biểu cảm và một lời nhắn: đôi khi chừng ấy đã đủ làm một ngày vui hơn.',
  E'Đặt một luật chơi thật đơn giản trước khi chụp: mỗi tấm phải có một biểu cảm khác nhau, hoặc chỉ thay đổi vị trí của đôi tay. Luật càng nhỏ, bạn càng dễ bắt đầu.\n\nSau khi chụp, thử một khung giấy kem và một khung màu đậm. Hãy để màu của khung làm nền cho gương mặt, thay vì lấn át ảnh. Một lời nhắn ngắn ở cuối dải ảnh có thể biến nó thành một tấm thiệp.\n\nẢnh đẹp không nhất thiết là ảnh nghiêm túc. Bạn có thể bắt đầu bằng việc thấy thoải mái trước máy ảnh. Nội dung này là bài viết mẫu để Hùng tiếp tục biên tập.',
  'Thử một chút', array['Hộp Ảnh', 'Kỷ niệm'], 'published', true, '2026-11-09 14:24:30+00'
),
(
  'nhat-y-tuong-tu-bang-mau-quanh-minh',
  'Nhặt ý tưởng từ bảng màu quanh mình',
  'Một bảng màu thú vị có thể bắt đầu từ cốc trà, chiếc vé xe hoặc ánh chiều ngoài cửa sổ.',
  E'Khi bí ý tưởng, thử nhìn quanh và chọn ba màu đang ở gần nhau. Không cần biết tên màu thật chuẩn: một màu nền, một màu nổi bật và một màu nối hai màu còn lại.\n\nBạn có thể vẽ ba ô màu nhỏ rồi thử đặt một câu ngắn lên đó. Đổi vai trò của từng màu để xem cảm giác thay đổi ra sao. Cùng một bộ màu có thể trở nên yên tĩnh hoặc vui nhộn chỉ bằng cách đổi tỷ lệ.\n\nĐiều thú vị của bài tập này là không có đáp án duy nhất. Bảng màu tốt là bảng màu giúp câu chuyện của bạn rõ hơn. Đây là bài minh họa, chưa phải nhật ký hay dự án thực tế của Hùng.',
  'Sáng tạo', array['Màu sắc', 'Ý tưởng'], 'published', true, '2026-11-09 14:24:29+00'
),
(
  'mot-tam-anh-giu-lai-chuyen-nho',
  'Một tấm ảnh giữ lại chuyện nhỏ',
  'Có những điều rất bình thường, nhưng khi được đặt trong một khung ảnh lại khiến ta muốn nhìn lâu hơn.',
  E'Một góc bàn có nắng, một chiếc bóng trên tường, một gương mặt vừa bật cười. Chụp ảnh không nhất thiết bắt đầu từ một khung cảnh đặc biệt. Đôi khi điều đáng giữ lại nằm ngay trong ngày bình thường.\n\nThử chụp bốn tấm ở cùng một chỗ, mỗi tấm thay đổi một chi tiết: góc nhìn, ánh sáng, khoảng cách hoặc biểu cảm. Đặt chúng cạnh nhau, bạn sẽ có một câu chuyện nhỏ thay vì bốn hình giống hệt.\n\nKhông cần tìm bức ảnh hoàn hảo. Hãy tìm một chi tiết khiến mình muốn nhớ. Đây là bài viết mẫu để khởi động góc chia sẻ; Hùng có thể sửa hoặc thay bằng câu chuyện của mình.',
  'Góc nhìn', array['Chụp ảnh', 'Quan sát'], 'published', true, '2026-11-09 14:24:27+00'
);

select cron.schedule(
  'hunghienhoa-purge-expired-submissions',
  '* * * * *',
  $$delete from public.frame_submissions where expires_at <= now()$$
);

select cron.schedule(
  'hunghienhoa-clean-cron-history',
  '0 3 * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$
);
