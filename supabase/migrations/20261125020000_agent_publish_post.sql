-- Đăng bài tự động hằng ngày: một hàm chỉ làm được đúng một việc (thêm bài), cần mã bí mật trong header
-- X-Agent-Token. Database chỉ lưu bản băm SHA-256 của mã (bảng agent_settings, không ai đọc được qua API).
alter table public.posts add column if not exists source text;

create table if not exists public.agent_settings (key text primary key, value text not null);
alter table public.agent_settings enable row level security;
revoke all on public.agent_settings from anon, authenticated;

create or replace function public.agent_publish_post(p_post jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  tok text := coalesce((current_setting('request.headers', true))::jsonb ->> 'x-agent-token', '');
  want text;
  today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_slug text := p_post ->> 'slug';
  v_status text := coalesce(p_post ->> 'status', 'published');
  v_cover text := p_post ->> 'cover_base64';
  v_tags text[];
  new_id bigint;
begin
  select value into want from public.agent_settings where key = 'publish_token_hash';
  if want is null or tok = '' or encode(sha256(convert_to(tok, 'UTF8')), 'hex') <> want then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if (select count(*) from public.posts where source = 'agent' and (created_at at time zone 'Asia/Ho_Chi_Minh')::date = today) >= 2 then
    raise exception 'daily limit reached' using errcode = 'P0001';
  end if;
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(v_slug) > 120 or v_status not in ('draft', 'published')
     or length(coalesce(p_post ->> 'title', '')) not between 5 and 160
     or length(coalesce(p_post ->> 'excerpt', '')) not between 40 and 500
     or length(coalesce(p_post ->> 'content', '')) not between 3000 and 80000
     or length(coalesce(p_post ->> 'category', '')) not between 2 and 60
     or (v_cover is not null and (length(v_cover) > 1500000 or left(v_cover, 5) <> 'UklGR')) then
    raise exception 'invalid post' using errcode = '22023';
  end if;
  select coalesce(array_agg(left(t, 40)), '{}') into v_tags from (select jsonb_array_elements_text(coalesce(p_post -> 'tags', '[]'::jsonb)) as t limit 8) s;
  insert into public.posts (slug, title, excerpt, content, category, tags, status, is_sample, cover_base64, published_at, source)
  values (v_slug, p_post ->> 'title', p_post ->> 'excerpt', p_post ->> 'content', p_post ->> 'category', v_tags, v_status, false, v_cover,
          case when v_status = 'published' then now() end, 'agent')
  returning id into new_id;
  return jsonb_build_object('id', new_id, 'slug', v_slug, 'status', v_status);
end $$;

revoke all on function public.agent_publish_post(jsonb) from public;
grant execute on function public.agent_publish_post(jsonb) to anon;
