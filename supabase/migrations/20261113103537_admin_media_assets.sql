create table public.media_assets (
 id uuid primary key default gen_random_uuid(),
 scope text not null check (scope in ('site','post')),
 image_base64 text not null check (length(image_base64) between 28 and 1398104),
 created_at timestamptz not null default now()
);
alter table public.media_assets enable row level security;
revoke all on public.media_assets from anon, authenticated;
grant select on public.media_assets to anon, authenticated;
grant insert, delete on public.media_assets to authenticated;
create policy media_admin_read on public.media_assets for select to authenticated using ((select auth.uid()) is not null and lower((select auth.jwt())->>'email')='hunghienhoa2110@gmail.com');
create policy media_admin_insert on public.media_assets for insert to authenticated with check ((select auth.uid()) is not null and lower((select auth.jwt())->>'email')='hunghienhoa2110@gmail.com');
create policy media_admin_delete on public.media_assets for delete to authenticated using ((select auth.uid()) is not null and lower((select auth.jwt())->>'email')='hunghienhoa2110@gmail.com');
create policy media_public_read on public.media_assets for select to anon, authenticated using (
 (scope='site' and exists(select 1 from public.site_settings s where s.id=1 and exists(select 1 from jsonb_each_text(coalesce(s.data->'pageImages','{}'::jsonb)) v where v.value='/api/media/'||media_assets.id::text||'.webp')))
 or (scope='post' and exists(select 1 from public.posts p where p.status='published' and position('/api/media/'||media_assets.id::text||'.webp' in p.content)>0))
);
