-- Loại ngách "guide": loạt hướng dẫn thực hành dựa trên mã nguồn GitHub và tài liệu chính thức.
-- Loạt "Dựng video AI" (Claude Code, Codex, Antigravity) tách thành 5 ngách riêng theo từng hạng mục;
-- mỗi bài chỉ đi sâu một việc của một hạng mục cho một công cụ, không gộp thành bài tổng quan.
alter table public.ai_niches drop constraint if exists ai_niches_category_type_check;
alter table public.ai_niches add constraint ai_niches_category_type_check
  check (category_type in ('github_trending', 'ai_news', 'tech_deep_dive', 'tips', 'guide'));

insert into public.ai_niches (name, slug, category_type, keywords, rss_sources, system_tone, post_category) values
 ('Dựng video AI · Cài đặt', 'video-ai-cai-dat', 'guide',
  array['Claude Code','Codex','Antigravity','cài đặt','Remotion','ffmpeg','MCP','Node.js','Windows','macOS'],
  array['https://github.com/anthropics/claude-code/releases.atom','https://github.com/openai/codex/releases.atom','https://github.com/remotion-dev/remotion/releases.atom'],
  'Hạng mục CÀI ĐẶT: hướng dẫn cài và cấu hình MỘT công cụ (Claude Code, Codex hoặc Antigravity) cùng bộ công cụ dựng video nó cần (Node.js, ffmpeg, Remotion, MCP server hoặc skill xử lý video) trên Windows, macOS hoặc Linux. Lệnh cài, yêu cầu hệ thống, đăng nhập, kiểm tra cài thành công, lỗi cài thường gặp. Mọi lệnh lấy đúng từ README hoặc tài liệu chính thức, ghi phiên bản.',
  'Dựng video AI'),
 ('Dựng video AI · Tạo dự án', 'video-ai-tao-du-an', 'guide',
  array['Claude Code','Codex','Antigravity','Remotion','dự án video','template','CLAUDE.md','AGENTS.md','prompt'],
  array['https://github.com/remotion-dev/remotion/releases.atom'],
  'Hạng mục TẠO DỰ ÁN: từ thư mục trống tới video đầu tiên với MỘT công cụ (Claude Code, Codex hoặc Antigravity): khởi tạo dự án (ví dụ Remotion hoặc script ffmpeg), cấu trúc thư mục, tệp hướng dẫn cho agent (CLAUDE.md, AGENTS.md, rules), prompt đầu tiên, xem trước và render lần đầu. Ví dụ bám mẫu (template, examples) trong repo GitHub.',
  'Dựng video AI'),
 ('Dựng video AI · Cách sử dụng', 'video-ai-cach-su-dung', 'guide',
  array['Claude Code','Codex','Antigravity','cắt ghép','phụ đề','caption','chèn chữ','nhạc nền','TikTok','YouTube Shorts','render'],
  array[]::text[],
  'Hạng mục CÁCH SỬ DỤNG: một tác vụ dựng video cụ thể làm bằng MỘT công cụ (Claude Code, Codex hoặc Antigravity): cắt ghép, phụ đề tự động, chèn chữ và hiệu ứng, nhạc nền, đổi tỉ lệ khung cho TikTok/Shorts/YouTube, xuất file, đọc và sửa lỗi render. Hướng dẫn từng bước, prompt mẫu, lệnh mẫu và kết quả mong đợi.',
  'Dựng video AI'),
 ('Dựng video AI · Xây hệ thống', 'video-ai-xay-he-thong', 'guide',
  array['Claude Code','Codex','Antigravity','skills','subagent','MCP','hooks','pipeline','GitHub Actions','render hàng loạt','tự động hóa'],
  array['https://github.com/anthropics/claude-code/releases.atom','https://github.com/openai/codex/releases.atom'],
  'Hạng mục XÂY HỆ THỐNG: dựng quy trình làm video tự động với MỘT công cụ (Claude Code, Codex hoặc Antigravity): skill hoặc lệnh tùy chỉnh, subagent, MCP server, hook, template tái sử dụng, render hàng loạt, chạy trên GitHub Actions hoặc máy chủ. Giải thích kiến trúc, tệp cấu hình mẫu bám repo, đánh đổi chi phí và giới hạn.',
  'Dựng video AI'),
 ('Dựng video AI · Mẹo & cập nhật', 'video-ai-meo-cap-nhat', 'guide',
  array['Claude Code','Codex','Antigravity','Remotion','ffmpeg','mẹo','cập nhật','release','tiết kiệm token','so sánh'],
  array['https://github.com/anthropics/claude-code/releases.atom','https://github.com/openai/codex/releases.atom','https://github.com/remotion-dev/remotion/releases.atom'],
  'Hạng mục MẸO & CẬP NHẬT: mẹo hay hoặc tính năng mới vừa phát hành (release, changelog, repo GitHub mới nổi) giúp dựng video bằng Claude Code, Codex hoặc Antigravity nhanh hơn, rẻ hơn, đẹp hơn. Nói rõ phiên bản nào có, cách bật, ví dụ dùng và so sánh giữa các công cụ khi có dữ kiện.',
  'Dựng video AI')
on conflict (slug) do nothing;
