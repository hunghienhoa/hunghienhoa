-- Đăng ký hoặc thay mã đăng bài tự động mà không ai phải xem mã: chủ trang mở cửa sổ ngắn bằng
--   insert into public.agent_settings(key,value) values('enroll_until',(now()+interval '10 minutes')::text)
--   on conflict(key) do update set value=excluded.value;
-- rồi môi trường của lịch đăng bài gọi POST /api/agent/enroll (proxy tự gắn mã). Hàm lưu bản băm SHA-256
-- của mã vào publish_token_hash và đóng cửa sổ ngay. Hết hạn hoặc chưa mở thì từ chối.
create or replace function public.agent_enroll_token()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  tok text := coalesce((current_setting('request.headers', true))::jsonb ->> 'x-agent-token', '');
  until_at timestamptz;
begin
  select value::timestamptz into until_at from public.agent_settings where key = 'enroll_until';
  if until_at is null or until_at < now() then
    raise exception 'enroll closed' using errcode = '42501';
  end if;
  if length(tok) < 16 or length(tok) > 512 then
    raise exception 'token length invalid' using errcode = '22023';
  end if;
  insert into public.agent_settings (key, value) values ('publish_token_hash', encode(sha256(convert_to(tok, 'UTF8')), 'hex'))
  on conflict (key) do update set value = excluded.value;
  delete from public.agent_settings where key = 'enroll_until';
  return jsonb_build_object('enrolled', true);
end $$;
revoke all on function public.agent_enroll_token() from public, authenticated;
grant execute on function public.agent_enroll_token() to anon;
