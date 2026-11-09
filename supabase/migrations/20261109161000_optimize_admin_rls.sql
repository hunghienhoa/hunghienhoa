alter policy site_admin_update on public.site_settings to authenticated
  using (lower((select auth.jwt()) ->> 'email') = 'hunghienhoa2110@gmail.com')
  with check (lower((select auth.jwt()) ->> 'email') = 'hunghienhoa2110@gmail.com');

alter policy posts_public_read on public.posts to anon using (status = 'published');
alter policy posts_admin_read on public.posts to authenticated using (lower((select auth.jwt()) ->> 'email') = 'hunghienhoa2110@gmail.com');
alter policy posts_admin_insert on public.posts to authenticated with check (lower((select auth.jwt()) ->> 'email') = 'hunghienhoa2110@gmail.com');
alter policy posts_admin_update on public.posts to authenticated
  using (lower((select auth.jwt()) ->> 'email') = 'hunghienhoa2110@gmail.com')
  with check (lower((select auth.jwt()) ->> 'email') = 'hunghienhoa2110@gmail.com');
alter policy posts_admin_delete on public.posts to authenticated using (lower((select auth.jwt()) ->> 'email') = 'hunghienhoa2110@gmail.com');

alter policy frames_admin_insert on public.frames to authenticated with check (lower((select auth.jwt()) ->> 'email') = 'hunghienhoa2110@gmail.com');
alter policy frames_admin_delete on public.frames to authenticated using (lower((select auth.jwt()) ->> 'email') = 'hunghienhoa2110@gmail.com');

alter policy submissions_admin_read on public.frame_submissions to authenticated
  using (lower((select auth.jwt()) ->> 'email') = 'hunghienhoa2110@gmail.com' and expires_at > now());
alter policy submissions_admin_delete on public.frame_submissions to authenticated
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
