-- Gộp hai policy SELECT cùng áp cho role authenticated trên media_assets thành một
-- (Supabase advisor multiple_permissive_policies). Quyền đọc giữ nguyên:
-- quản trị viên đọc mọi ảnh; mọi người đọc ảnh đang dùng trong trang hoặc bài đã xuất bản.
drop policy if exists media_admin_read on public.media_assets;
drop policy if exists media_public_read on public.media_assets;
create policy media_read on public.media_assets for select to anon, authenticated using (
 ((select auth.uid()) is not null and lower((select auth.jwt())->>'email')='hunghienhoa2110@gmail.com')
 or (scope='site' and exists(select 1 from public.site_settings s where s.id=1 and exists(select 1 from jsonb_each_text(coalesce(s.data->'pageImages','{}'::jsonb)) v where v.value='/api/media/'||media_assets.id::text||'.webp')))
 or (scope='post' and exists(select 1 from public.posts p where p.status='published' and position('/api/media/'||media_assets.id::text||'.webp' in p.content)>0))
);
