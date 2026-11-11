-- Fixed aggregate needs access to all Storage objects, independent of bucket RLS.
create schema if not exists usage_private;
revoke all on schema usage_private from public, anon;
grant usage on schema usage_private to authenticated;
create or replace function usage_private.storage_bytes()
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or lower((select auth.jwt())->>'email') is distinct from 'hunghienhoa2110@gmail.com' then
    raise exception 'Tài khoản này chưa có quyền quản trị.' using errcode = '42501';
  end if;
  return (select coalesce(sum((metadata->>'size')::bigint),0)::bigint from storage.objects);
end;
$$;
revoke all on function usage_private.storage_bytes() from public, anon;
grant execute on function usage_private.storage_bytes() to authenticated;
create or replace function public.admin_storage_usage()
returns bigint language sql stable security invoker set search_path = ''
as $$ select usage_private.storage_bytes(); $$;
revoke all on function public.admin_storage_usage() from public, anon;
grant execute on function public.admin_storage_usage() to authenticated;
