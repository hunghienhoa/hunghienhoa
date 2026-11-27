-- Hệ thống đăng bài tự động (GitHub Actions + Claude API). Dùng lại bảng posts và hàm agent_publish_post
-- (mã bí mật X-Agent-Token, giới hạn 2 bài/ngày), thêm:
--   ai_niches        ngách nội dung do quản trị bật/tắt; pipeline chọn ngách đang bật có last_used_at cũ nhất
--   crawled_sources  URL nguồn đã dùng để không viết trùng
--   posts            niche_id, word_count, sources_cited (jsonb [{title,url}])
--   agent_pipeline_context  cho pipeline biết ngách tiếp theo và lọc URL chưa dùng (cần mã đăng bài)

create table if not exists public.ai_niches (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) <= 60),
  category_type text not null check (category_type in ('github_trending', 'ai_news', 'tech_deep_dive')),
  keywords text[] not null default '{}' check (cardinality(keywords) <= 30),
  rss_sources text[] not null default '{}' check (cardinality(rss_sources) <= 15),
  system_tone text not null default '' check (char_length(system_tone) <= 2000),
  post_category text not null default 'Góc nhìn' check (char_length(post_category) between 2 and 60),
  is_active boolean not null default true,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.crawled_sources (
  id bigint generated always as identity primary key,
  source_url text not null unique check (char_length(source_url) between 8 and 2000),
  niche_id bigint references public.ai_niches(id) on delete set null,
  post_slug text,
  created_at timestamptz not null default now()
);
create index if not exists crawled_sources_niche_idx on public.crawled_sources (niche_id);

alter table public.posts add column if not exists niche_id bigint references public.ai_niches(id) on delete set null;
alter table public.posts add column if not exists word_count integer check (word_count is null or word_count between 0 and 100000);
alter table public.posts add column if not exists sources_cited jsonb not null default '[]'::jsonb check (jsonb_typeof(sources_cited) = 'array');
create index if not exists posts_niche_idx on public.posts (niche_id);

-- RLS: khách không đọc được ngách và nguồn; chỉ tài khoản quản trị có toàn quyền (giống các bảng khác).
alter table public.ai_niches enable row level security;
alter table public.crawled_sources enable row level security;
revoke all on public.ai_niches, public.crawled_sources from anon, authenticated;
grant select, insert, update, delete on public.ai_niches to authenticated;
grant select, delete on public.crawled_sources to authenticated;
grant usage, select on sequence public.ai_niches_id_seq to authenticated;
drop policy if exists niches_admin_all on public.ai_niches;
create policy niches_admin_all on public.ai_niches for all to authenticated
  using (lower((select auth.jwt()) ->> 'email') = 'hunghienhoa2110@gmail.com')
  with check (lower((select auth.jwt()) ->> 'email') = 'hunghienhoa2110@gmail.com');
drop policy if exists crawled_admin_read on public.crawled_sources;
create policy crawled_admin_read on public.crawled_sources for select to authenticated
  using (lower((select auth.jwt()) ->> 'email') = 'hunghienhoa2110@gmail.com');
drop policy if exists crawled_admin_delete on public.crawled_sources;
create policy crawled_admin_delete on public.crawled_sources for delete to authenticated
  using (lower((select auth.jwt()) ->> 'email') = 'hunghienhoa2110@gmail.com');

create or replace function public.agent_token_ok()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.agent_settings
    where key = 'publish_token_hash'
      and value = encode(sha256(convert_to(coalesce((current_setting('request.headers', true))::jsonb ->> 'x-agent-token', ''), 'UTF8')), 'hex')
      and coalesce((current_setting('request.headers', true))::jsonb ->> 'x-agent-token', '') <> ''
  );
$$;
revoke all on function public.agent_token_ok() from public, anon, authenticated;

-- Pipeline hỏi: ngách nào tới lượt, hôm nay đã đăng mấy bài, URL nào trong danh sách chưa từng dùng.
create or replace function public.agent_pipeline_context(p_urls text[] default '{}')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_niche jsonb;
begin
  if not public.agent_token_ok() then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  select to_jsonb(n) - 'created_at' into v_niche
  from public.ai_niches n where n.is_active order by n.last_used_at asc nulls first, n.id limit 1;
  return jsonb_build_object(
    'niche', v_niche,
    'published_today', (select count(*) from public.posts where source = 'agent' and (created_at at time zone 'Asia/Ho_Chi_Minh')::date = today),
    'new_urls', coalesce((select jsonb_agg(u) from (select distinct u from unnest((coalesce(p_urls, '{}'::text[]))[1:200]) u
      where u ~ '^https?://' and not exists (select 1 from public.crawled_sources c where c.source_url = u)) s), '[]'::jsonb),
    'recent_titles', coalesce((select jsonb_agg(title) from (select title from public.posts where status = 'published' order by published_at desc nulls last limit 40) t), '[]'::jsonb)
  );
end $$;
revoke all on function public.agent_pipeline_context(text[]) from public, authenticated;
grant execute on function public.agent_pipeline_context(text[]) to anon;

-- agent_publish_post: giữ nguyên kiểm tra cũ, thêm niche_id, word_count, sources_cited; ghi nguồn đã dùng
-- (URL đã dùng thì từ chối để không trùng), cập nhật last_used_at của ngách.
create or replace function public.agent_publish_post(p_post jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_slug text := p_post ->> 'slug';
  v_status text := coalesce(p_post ->> 'status', 'published');
  v_cover text := p_post ->> 'cover_base64';
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
     or length(coalesce(p_post ->> 'content', '')) not between 3000 and 80000
     or length(coalesce(p_post ->> 'category', '')) not between 2 and 60
     or (v_cover is not null and (length(v_cover) > 1398104 or left(v_cover, 5) <> 'UklGR'))
     or jsonb_typeof(v_sources) <> 'array' or jsonb_array_length(v_sources) > 10
     or coalesce(p_post ->> 'niche_id', '') !~ '^(\d{1,12})?$'
     or coalesce(p_post ->> 'word_count', '') !~ '^(\d{1,6})?$' then
    raise exception 'invalid post' using errcode = '22023';
  end if;
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
  select coalesce(array_agg(left(t, 40)), '{}') into v_tags from (select jsonb_array_elements_text(coalesce(p_post -> 'tags', '[]'::jsonb)) as t limit 8) s;
  insert into public.posts (slug, title, excerpt, content, category, tags, status, is_sample, cover_base64, published_at, source, niche_id, word_count, sources_cited)
  values (v_slug, p_post ->> 'title', p_post ->> 'excerpt', p_post ->> 'content', p_post ->> 'category', v_tags, v_status, false, v_cover,
          case when v_status = 'published' then now() end, 'agent', v_niche, v_words, v_sources)
  returning id into new_id;
  insert into public.crawled_sources (source_url, niche_id, post_slug)
  select distinct s ->> 'url', v_niche, v_slug from jsonb_array_elements(v_sources) s
  on conflict (source_url) do nothing;
  if v_niche is not null then
    update public.ai_niches set last_used_at = now() where id = v_niche;
  end if;
  return jsonb_build_object('id', new_id, 'slug', v_slug, 'status', v_status);
end $$;
revoke all on function public.agent_publish_post(jsonb) from public, authenticated;
grant execute on function public.agent_publish_post(jsonb) to anon;

-- Ba ngách mẫu ban đầu (chạy lại không nhân bản).
insert into public.ai_niches (name, slug, category_type, keywords, rss_sources, system_tone, post_category) values
 ('Dự án GitHub đang lên', 'github-dang-len', 'github_trending',
  array['ai','agent','developer-tools','cli','open-source'], array[]::text[],
  'Viết như một kỹ sư phần mềm Việt Nam đã tự thử dự án: giải thích nó giải quyết vấn đề gì, cách hoạt động, cài đặt và giới hạn thật sự. Thực tế, không tâng bốc.',
  'Thử một chút'),
 ('Tin AI đáng chú ý', 'tin-ai', 'ai_news',
  array['AI','LLM','Claude','OpenAI','Gemini','model','agent'],
  array['https://techcrunch.com/category/artificial-intelligence/feed/','https://www.theverge.com/rss/ai-artificial-intelligence/index.xml','https://venturebeat.com/category/ai/feed/'],
  'Phân tích tin như một chuyên gia công nghệ Việt Nam: bối cảnh, điều gì thật sự mới, tác động tới người dùng và doanh nghiệp Việt Nam. Phân biệt rõ dữ kiện và nhận định.',
  'Góc nhìn'),
 ('Công nghệ chuyên sâu', 'cong-nghe-chuyen-sau', 'tech_deep_dive',
  array['web performance','database','security','browser','rust','typescript','cloud'],
  array['https://hnrss.org/frontpage?points=150','https://blog.cloudflare.com/rss/','https://github.blog/feed/'],
  'Giải thích kỹ thuật sâu nhưng dễ hiểu cho lập trình viên Việt Nam: nguyên lý, đánh đổi, ví dụ cụ thể và khi nào nên hoặc không nên áp dụng.',
  'Góc nhìn')
on conflict (slug) do nothing;
