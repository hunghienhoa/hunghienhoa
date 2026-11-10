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

  -- Claim the pending row atomically using the existing SELECT/DELETE privileges.
  -- An insertion error rolls this deletion back with the rest of the transaction.
  delete from public.frame_submissions
  where id = p_id and expires_at > now()
  returning * into queued;

  if not found then
    raise exception 'Bản đóng góp đã hết hạn hoặc không còn tồn tại.' using errcode = 'P0002';
  end if;

  insert into public.frames (id, name, author_name, author_link, design, image_base64, created_at)
  values (queued.id, queued.name, queued.author_name, queued.author_link, queued.design, queued.image_base64, now());

  return queued.id;
end;
$$;
