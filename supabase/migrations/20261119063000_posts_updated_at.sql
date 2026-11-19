-- Thời điểm sửa bài gần nhất, dùng cho <lastmod> trong sitemap blog. Google bỏ qua lastmod không chính xác,
-- nên không thể dùng published_at (không đổi khi sửa bài). Bài cũ lấy mốc ngày đăng (hoặc ngày tạo).
alter table public.posts add column if not exists updated_at timestamptz;
update public.posts set updated_at = coalesce(published_at, created_at) where updated_at is null;
alter table public.posts alter column updated_at set default now(), alter column updated_at set not null;

create or replace function public.posts_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists posts_touch_updated_at on public.posts;
create trigger posts_touch_updated_at before update on public.posts
  for each row execute function public.posts_touch_updated_at();
