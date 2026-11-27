-- Bài đăng tự động có ảnh minh họa trong bài (1–4 ảnh WebP).
-- p_post.images = [{"key":"1","base64":"<WebP base64>"}, …]; trong content, mỗi ảnh là một dòng riêng
-- "![Chú thích](image:1)". Hàm lưu từng ảnh vào media_assets (scope 'post') rồi thay "image:1" bằng
-- "/api/media/<uuid>.webp"; ảnh chỉ đọc công khai được khi bài đã xuất bản (policy media_read có sẵn).
-- Giữ nguyên mọi kiểm tra cũ (mã đăng bài, 2 bài/ngày, định dạng bài, nguồn chưa dùng).
create or replace function public.agent_publish_post(p_post jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_slug text := p_post ->> 'slug';
  v_status text := coalesce(p_post ->> 'status', 'published');
  v_cover text := p_post ->> 'cover_base64';
  v_content text := p_post ->> 'content';
  v_images jsonb := coalesce(p_post -> 'images', '[]'::jsonb);
  v_image jsonb;
  v_key text;
  v_media uuid;
  v_niche bigint;
  v_words integer;
  v_sources jsonb := coalesce(p_post -> 'sources_cited', '[]'::jsonb);
  v_tags text[];
  new_id bigint;
begin
  if not public.agent_token_ok() then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if (select count(*) from public.posts where source = 'agent' and (created_at at time zone 'Asia/Ho_Chi_Minh')::date = today) >= 2 then
    raise exception 'daily limit reached' using errcode = 'P0001';
  end if;
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(v_slug) > 120 or v_status not in ('draft', 'published')
     or length(coalesce(p_post ->> 'title', '')) not between 5 and 160
     or length(coalesce(p_post ->> 'excerpt', '')) not between 40 and 500
     or length(coalesce(v_content, '')) not between 3000 and 80000
     or length(coalesce(p_post ->> 'category', '')) not between 2 and 60
     or (v_cover is not null and (length(v_cover) > 1398104 or left(v_cover, 5) <> 'UklGR'))
     or jsonb_typeof(v_sources) <> 'array' or jsonb_array_length(v_sources) > 10
     or jsonb_typeof(v_images) <> 'array' or jsonb_array_length(v_images) > 4
     or coalesce(p_post ->> 'niche_id', '') !~ '^(\d{1,12})?$'
     or coalesce(p_post ->> 'word_count', '') !~ '^(\d{1,6})?$' then
    raise exception 'invalid post' using errcode = '22023';
  end if;
  -- Ảnh: khóa 1–4 không trùng, đúng WebP (RIFF....WEBP) dưới 1 MB, mỗi khóa có đúng một dòng ảnh trong bài.
  if exists (select 1 from jsonb_array_elements(v_images) i
             where jsonb_typeof(i) <> 'object' or coalesce(i ->> 'key', '') !~ '^[1-4]$'
                or length(coalesce(i ->> 'base64', '')) not between 28 and 1398104 or left(i ->> 'base64', 5) <> 'UklGR')
     or (select count(distinct i ->> 'key') from jsonb_array_elements(v_images) i) <> jsonb_array_length(v_images) then
    raise exception 'invalid images' using errcode = '22023';
  end if;
  for v_image in select * from jsonb_array_elements(v_images) loop
    v_key := v_image ->> 'key';
    if substring(decode(v_image ->> 'base64', 'base64') from 9 for 4) <> '\x57454250'::bytea
       or (select count(*) from regexp_matches(v_content, '^!\[[^\]\n]{1,200}\]\(image:' || v_key || '\)$', 'gn')) <> 1 then
      raise exception 'invalid images' using errcode = '22023';
    end if;
  end loop;
  v_niche := nullif(p_post ->> 'niche_id', '')::bigint;
  v_words := nullif(p_post ->> 'word_count', '')::integer;
  if v_niche is not null and not exists (select 1 from public.ai_niches where id = v_niche) then
    raise exception 'unknown niche' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(v_sources) s
             where jsonb_typeof(s) <> 'object' or coalesce(s ->> 'url', '') !~ '^https?://' or length(s ->> 'url') > 2000
                or length(coalesce(s ->> 'title', '')) > 300) then
    raise exception 'invalid sources' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(v_sources) s join public.crawled_sources c on c.source_url = s ->> 'url') then
    raise exception 'source already used' using errcode = '22023';
  end if;
  for v_image in select * from jsonb_array_elements(v_images) loop
    insert into public.media_assets (scope, image_base64) values ('post', v_image ->> 'base64') returning id into v_media;
    v_content := replace(v_content, '](image:' || (v_image ->> 'key') || ')', '](/api/media/' || v_media::text || '.webp)');
  end loop;
  -- Còn chỗ đặt ảnh không có ảnh tương ứng thì từ chối (không để lại liên kết hỏng trong bài).
  if v_content ~ '\]\(image:' or length(v_content) > 80000 then
    raise exception 'invalid post' using errcode = '22023';
  end if;
  select coalesce(array_agg(left(t, 40)), '{}') into v_tags from (select jsonb_array_elements_text(coalesce(p_post -> 'tags', '[]'::jsonb)) as t limit 8) s;
  insert into public.posts (slug, title, excerpt, content, category, tags, status, is_sample, cover_base64, published_at, source, niche_id, word_count, sources_cited)
  values (v_slug, p_post ->> 'title', p_post ->> 'excerpt', v_content, p_post ->> 'category', v_tags, v_status, false, v_cover,
          case when v_status = 'published' then now() end, 'agent', v_niche, v_words, v_sources)
  returning id into new_id;
  insert into public.crawled_sources (source_url, niche_id, post_slug)
  select distinct s ->> 'url', v_niche, v_slug from jsonb_array_elements(v_sources) s
  on conflict (source_url) do nothing;
  if v_niche is not null then
    update public.ai_niches set last_used_at = now() where id = v_niche;
  end if;
  return jsonb_build_object('id', new_id, 'slug', v_slug, 'status', v_status, 'images', jsonb_array_length(v_images));
end $$;
revoke all on function public.agent_publish_post(jsonb) from public, authenticated;
grant execute on function public.agent_publish_post(jsonb) to anon;
