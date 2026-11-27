-- Thêm loại ngách "tips" (thủ thuật thực dụng) và ngách mẫu "Thủ thuật hay" cho lịch đăng bài tự động.
alter table public.ai_niches drop constraint if exists ai_niches_category_type_check;
alter table public.ai_niches add constraint ai_niches_category_type_check
  check (category_type in ('github_trending', 'ai_news', 'tech_deep_dive', 'tips'));

insert into public.ai_niches (name, slug, category_type, keywords, rss_sources, system_tone, post_category) values
 ('Thủ thuật hay', 'thu-thuat-hay', 'tips',
  array['phím tắt','Windows','macOS','iPhone','Android','Chrome','VS Code','Excel','Google','AI','năng suất','terminal'],
  array['https://github.blog/feed/','https://dev.to/feed'],
  'Viết như một người Việt rành công nghệ chia sẻ thủ thuật đã tự làm: mỗi thủ thuật nói rõ dùng khi nào, các bước cụ thể (phím tắt, lệnh, đường dẫn menu), kết quả mong đợi, áp dụng cho phiên bản nào và lưu ý. Chính xác, dễ làm theo, không mẹo vặt nhảm; không hướng dẫn bẻ khóa, vượt bản quyền hay vượt tường trả phí.',
  'Thủ thuật')
on conflict (slug) do nothing;
