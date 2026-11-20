# Quy tắc dự án

- Tên gọi của chủ trang là **Hùng**. Hiền Hòa là phần tên theo sau; giữ tên đầy đủ Hùng Hiền Hòa khi phù hợp.
- Toàn bộ giao diện viết tiếng Việt, giữ tông giấy kem/xanh tím/vàng. Dùng Be Vietnam Pro cho nội dung, điều hướng, nút và canvas; Playfair Display cho phần nhấn. Không đưa SVN-Gilroy trở lại giao diện.
- Ảnh raster tĩnh phục vụ trên web mặc định **WebP**; khung gửi duyệt ưu tiên WebP nhưng chấp nhận PNG/JPEG thật khi trình duyệt không mã hóa WebP, kiểm tra chữ ký/kích thước và trả đúng Content-Type, không đổi đuôi giả; ảnh/khung người dùng tải về dùng **JPEG (.jpg)**. SVG gốc giữ SVG. Không thêm PNG vào `dist`; ảnh người dùng nhập PNG/JPEG được chuyển ngay trong bộ nhớ trước khi dùng/lưu. Dùng `python tools/convert-webp.py`, rồi `python tools/convert-webp.py --check` và `node check.cjs`. Bản nguồn PNG chỉ giữ ngoài webroot ở `source-assets/original-png`.
- Ảnh chụp hoặc ảnh chọn để ghép chỉ ở bộ nhớ trình duyệt, không lưu browser storage, log, database hoặc gửi API. Xóa khi rời trang và khi hết phiên một giờ. Poster đóng góp phải được vẽ từ thiết kế khung trống, không lấy từ canvas dải ảnh cá nhân.
- Làm Nét mặc định chạy AI trên máy. Ảnh chỉ được gửi tới Gemini (Google) qua `/api/lamnet/ai` khi người dùng chọn chế độ đó và tích đồng ý; server không lưu, không ghi log ảnh, câu lệnh hay kết quả. Khóa `GEMINI_API_KEY` chỉ đặt làm secret trên Cloudflare (hoặc biến môi trường khi chạy cục bộ), không khai báo bắt buộc trong `cloudflare.config.ts` và không commit.
- Bản đóng góp chờ duyệt và thông tin riêng hết hạn sau một giờ; khung đã duyệt giữ thiết kế và ghi công công khai, xóa thông tin liên hệ riêng. Không sao lưu bản chờ trong gói mã nguồn.
- Database, `private-data`, `.env`, session và mật khẩu không được commit, đưa vào `dist` hoặc ZIP. Trên Windows cục bộ dùng `%LOCALAPPDATA%/HungHienHoa/portfolio-data`, tránh đồng bộ bản chờ qua OneDrive. Chủ trang tự thiết lập mật khẩu quản trị; không thêm mật khẩu mặc định.
- Dùng máy chủ `node server/server.mjs` để chạy cả API, hồ sơ, photobooth, blog và admin. Server mặc định chỉ loopback; tên miền và database cloud chỉ cấu hình khi có yêu cầu triển khai cụ thể.
- `/graphify`: đọc skill graphify được cài trước khi thực hiện.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. When the answer is under a Markdown heading, `graphify section "<heading>"` prints that section's text, so the .md need not be opened. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.

# graphify
- **graphify** (`.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.
