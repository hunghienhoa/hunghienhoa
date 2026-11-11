-- Aggregate only, runs with caller privileges and checks the same admin identity as RLS.
create or replace function public.admin_database_usage()
returns bigint
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or lower((select auth.jwt())->>'email') is distinct from 'hunghienhoa2110@gmail.com' then
    raise exception 'Tài khoản này chưa có quyền quản trị.' using errcode = '42501';
  end if;
  return pg_catalog.pg_database_size(pg_catalog.current_database());
end;
$$;
revoke all on function public.admin_database_usage() from public, anon;
grant execute on function public.admin_database_usage() to authenticated;
