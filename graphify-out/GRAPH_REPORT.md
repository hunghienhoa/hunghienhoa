# Graph Report - hunghienhoa  (2026-11-19)

## Corpus Check
- 120 files · ~87,308 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 18 file(s) not represented in the graph (top: .woff2 12, (none) 3, .base64 2)

## Summary
- 1007 nodes · 1724 edges · 79 communities (66 shown, 13 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c52228d9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.mjs
- validate-findings.cjs
- validate-coverage-ledger.cjs
- usage.mjs
- agent-content.mjs
- build-ui-symbols.py
- Triển khai `hunghienhoa`
- snaptik.test.mjs
- steps
- photo-privacy.test.mjs
- steps
- Element
- package.json
- Security Audit
- ref_node_path
- ref_node_assert
- Cloud and Deployment Hunting
- preflightJsonText
- browser-usage-audit.mjs
- Sticker từ 17 ảnh tham chiếu
- AI, LLM, and Agent Hunting
- ATTACK-CLASSES.md
- Client-Side and Browser Hunting
- Data Isolation and Lifecycle Hunting
- Desktop, Mobile, and Local IPC Hunting
- Vulnerability Hunting
- Memory Safety, Binary, and Kernel Hunting
- Protocols, RPC, and Messaging Hunting
- Resource Exhaustion and Availability Hunting
- Validation, Structured Output, Verification, and Reporting
- HTTP-Protocol and Authentication Hunting
- Supply Chain and Release Hunting
- asset-versions.mjs
- server.test.mjs
- check.cjs
- ref_node_fs
- browser-audit.mjs
- Nội dung dành cho agent và công cụ tìm kiếm
- Kiểm tra toàn bộ website — 10/11/2026
- Rà soát sơ bộ website Hùng Hiền Hòa — 10/11/2026
- Search Console cho website của Hùng
- dashboard.test.mjs
- Nguồn tham khảo khung Hộp Ảnh
- Quy trình ứng phó sự cố
- Quản trị các trang của Hùng
- Reconnaissance
- Xưởng khung, blog, quản trị và WebP — 09/11/2026
- Việt hóa và Hộp Ảnh — 09/11/2026
- Kiểm tra bản sticker và mobile — 09/11/2026
- Máy chủ nội dung và quản trị
- material-cards.test.mjs
- AGENTS.md
- Phông chữ website
- Chất liệu và chuyển động tham khảo GIF
- Approved material reconstruction — 2026-11-11
- README.md
- Canvas
- 3. Sáu bước
- TestDate
- TestImage
- TestURL
- ADSENSE.md
- RESTORE.md
- SOCIAL-LOGO-SOURCES.md
- adsense.test.mjs
- Nội dung dùng chung — hợp đồng giao tiếp
- browser-adsense-readiness.mjs
- Kiểm tra triển khai hunghienhoa — 09/11/2026
- Hướng dẫn mã nguồn — Hùng Hiền Hòa
- Bắt đầu bằng một lời chào
- server.mjs
- createApp
- steps
- browser-stickers-audit.mjs
- viewport.test.mjs

## God Nodes (most connected - your core abstractions)
1. `createApp()` - 52 edges
2. `handle()` - 38 edges
3. `fail()` - 30 edges
4. `Element` - 22 edges
5. `handle()` - 21 edges
6. `adminApi()` - 20 edges
7. `publicApi()` - 18 edges
8. `collectUnitErrors()` - 16 edges
9. `publicHtml()` - 15 edges
10. `agentRoute()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Dữ liệu cá nhân website đang giữ` --references--> `VisitCounter`  [INFERRED]
  INCIDENT-RESPONSE.md → worker/visits.mjs
- `withSecurity()` --calls--> `adsenseHtml()`  [EXTRACTED]
  worker/index.mjs → server/adsense.mjs
- `handle()` --calls--> `agentRoute()`  [EXTRACTED]
  worker/index.mjs → server/agent-content.mjs
- `handle()` --calls--> `markdown404()`  [EXTRACTED]
  worker/index.mjs → server/agent-content.mjs
- `handle()` --calls--> `pageContext()`  [EXTRACTED]
  worker/index.mjs → server/agent-content.mjs

## Import Cycles
- None detected.

## Communities (79 total, 13 thin omitted)

### Community 0 - "index.mjs"
Cohesion: 0.17
Nodes (32): publicRedirect(), adminApi(), assetRequest(), bearer(), cachedImage(), cachedJson(), cacheKey(), dbPost() (+24 more)

### Community 1 - "validate-findings.cjs"
Cohesion: 0.06
Nodes (56): canonicalKey(), append(), encode(), codePointLength(), collect(), collectDataLimitErrors(), collectFindingSemanticErrors(), collectSchemaErrors() (+48 more)

### Community 2 - "validate-coverage-ledger.cjs"
Cohesion: 0.08
Nodes (54): ATTEMPT_FIELDS, ATTEMPT_STATUSES, canonicalCoverageId(), collectUnitErrors(), createErrorList(), encodeCanonicalRef(), escapeUnsafeDiagnosticCharacters(), fs (+46 more)

### Community 3 - "usage.mjs"
Cohesion: 0.31
Nodes (10): usageEntry(), usageMetrics, usageProviders, usageReport(), utcDay(), now, dailyQuery, nonnegative() (+2 more)

### Community 4 - "agent-content.mjs"
Cohesion: 0.07
Nodes (42): articleHtml(), canonical(), decorateHtml(), escapeHtml(), html404(), inlineHtml(), instructions(), llms() (+34 more)

### Community 5 - "build-ui-symbols.py"
Cohesion: 0.06
Nodes (8): Slots, patch(), stroke(), main(), windows(), main(), obsolete(), git()

### Community 6 - "Triển khai `hunghienhoa`"
Cohesion: 0.20
Nodes (10): Cập nhật hằng ngày, GitHub → Cloudflare tự triển khai, Giám sát, Giới hạn đã ghi nhận, Kiến trúc đang dùng, Lệnh kiểm tra và triển khai thủ công, Triển khai `hunghienhoa`, Tài nguyên (+2 more)

### Community 7 - "snaptik.test.mjs"
Cohesion: 0.09
Nodes (32): embeddedData(), walk(), entities(), error(), facebookId(), limitedJSON(), limitedText(), mediaURL() (+24 more)

### Community 8 - "steps"
Cohesion: 0.06
Nodes (31): concurrency, cancel-in-progress, group, env, runs-on, steps, timeout-minutes, CF_SEND_TELEMETRY (+23 more)

### Community 9 - "photo-privacy.test.mjs"
Cohesion: 0.06
Nodes (14): context, document, elements, events, exportSize, html, landingCss, pickerNodes (+6 more)

### Community 10 - "steps"
Cohesion: 0.07
Nodes (26): if, runs-on, steps, timeout-minutes, concurrency, cancel-in-progress, group, GH_TOKEN (+18 more)

### Community 11 - "Element"
Cohesion: 0.10
Nodes (7): Element, filterButtons, frameButtons, removeButtons, showcaseButtons, slotButtons, zoomButtons

### Community 12 - "package.json"
Cohesion: 0.12
Nodes (16): allowScripts, esbuild@0.28.2, workerd@1.20261104.1, workerd@1.20261109.1, devDependencies, cf@1.0.0-beta.28, wrangler@4.159.0, name (+8 more)

### Community 13 - "Security Audit"
Cohesion: 0.11
Nodes (18): Anti-patterns, Core principles, Cost budget, Coverage and prior runs, Full audit planning, Full audit setup, Full audit workflow, Operating modes (+10 more)

### Community 14 - "ref_node_path"
Cohesion: 0.14
Nodes (9): {chromium}, errors, {chromium}, errors, scopes, sources, titles, {chromium} (+1 more)

### Community 15 - "ref_node_assert"
Cohesion: 0.17
Nodes (7): checks, files, hosts, app, html, report, results

### Community 16 - "Cloud and Deployment Hunting"
Cohesion: 0.20
Nodes (10): Cloud and Deployment Hunting, Configuration and secret lifecycle attack classes (subagent_type: `general`), Container and orchestration attack classes (subagent_type: `general`), Core discipline (include in every agent prompt for this domain), Ingress, network, and control-plane attack classes (subagent_type: `general`), Managed storage, events, and edge attack classes (subagent_type: `general`), Universal moves (apply across the above), Validation rules (apply before reporting ANY finding here) (+2 more)

### Community 17 - "preflightJsonText"
Cohesion: 0.40
Nodes (11): JsonStructureError, preflightJsonText(), beginContainer(), beginString(), beginValue(), closeContainer(), countValue(), currentContainer() (+3 more)

### Community 18 - "browser-usage-audit.mjs"
Cohesion: 0.18
Nodes (8): {chromium}, errors, mock, mp4, app, {chromium}, cli, dataDir

### Community 19 - "Sticker từ 17 ảnh tham chiếu"
Cohesion: 0.18
Nodes (10): Atlas 1 — ô 01–16, Atlas 2 — ô 17–32, Atlas 3 — ô 33–48, Bộ prompt, Chuyển động, Kiểm kê đủ 17 nguồn, Nguồn và xử lý, Phân bố và giữ hiệu ứng gốc (+2 more)

### Community 20 - "AI, LLM, and Agent Hunting"
Cohesion: 0.22
Nodes (9): AI, LLM, and Agent Hunting, Context, retrieval, and memory attack classes (subagent_type: `general`), Core discipline (include in every agent prompt for this domain), MCP and sub-agent trust classes (subagent_type: `general`), Output and disclosure attack classes (subagent_type: `general`), Tool and action attack classes (subagent_type: `general`), Universal moves (apply across the above), Validation rules (apply before reporting ANY finding here) (+1 more)

### Community 22 - "Client-Side and Browser Hunting"
Cohesion: 0.18
Nodes (10): Client-Side and Browser Hunting, Core discipline (include in every agent prompt for this domain), Cross-origin messaging and network attack classes (subagent_type: `general`), Cross-site information leak classes (subagent_type: `general`), DOM and object-state attack classes (subagent_type: `general`), Service-worker and browser-storage attack classes (subagent_type: `general`), UI-redress and navigation attack classes (subagent_type: `general`), Universal moves (apply across the above) (+2 more)

### Community 23 - "Data Isolation and Lifecycle Hunting"
Cohesion: 0.20
Nodes (9): Core discipline (include in every agent prompt for this domain), Data Isolation and Lifecycle Hunting, Deletion, revocation, and lifecycle attack classes (subagent_type: `general`), Derived-data and disclosure attack classes (subagent_type: `general`), Export, backup, restore, and migration attack classes (subagent_type: `general`), Tenant and object-isolation attack classes (subagent_type: `general`), Universal moves (apply across the above), Validation rules (apply before reporting ANY finding here) (+1 more)

### Community 24 - "Desktop, Mobile, and Local IPC Hunting"
Cohesion: 0.20
Nodes (10): Application-state and device-lifecycle attack classes (subagent_type: `general`), Core discipline (include in every agent prompt for this domain), Deep-link, callback, and navigation attack classes (subagent_type: `general`), Desktop, Mobile, and Local IPC Hunting, Local IPC and exported-component attack classes (subagent_type: `general`), Privileged-helper and local-file attack classes (subagent_type: `general`), Universal moves (apply across the above), Validation rules (apply before reporting ANY finding here) (+2 more)

### Community 25 - "Vulnerability Hunting"
Cohesion: 0.20
Nodes (10): Core hunting method — include in every hunter prompt, Core validation rules — include in every hunter prompt, Coverage-critic waves, Local validation boundaries, Parent consolidation and ledger update, Phase 2: Run coverage-led hunting waves, Promotion procedure — copy this promotion procedure verbatim into every hunter prompt, Required hunter prompt (+2 more)

### Community 26 - "Memory Safety, Binary, and Kernel Hunting"
Cohesion: 0.20
Nodes (10): Binary loading and runtime attack classes (subagent_type: `general`), Bounds, integer, and representation attack classes (subagent_type: `general`), Core discipline (include in every agent prompt for this domain), FFI and ABI attack classes (subagent_type: `general`), Kernel and privileged-interface attack classes (subagent_type: `general`), Lifetime, type, and concurrency attack classes (subagent_type: `general`), Memory Safety, Binary, and Kernel Hunting, Universal moves (apply across the above) (+2 more)

### Community 27 - "Protocols, RPC, and Messaging Hunting"
Cohesion: 0.20
Nodes (9): Broker and queue isolation attack classes (subagent_type: `general`), Core discipline (include in every agent prompt for this domain), Framing, schema, and interpretation attack classes (subagent_type: `general`), Protocols, RPC, and Messaging Hunting, Replay, ordering, and transaction attack classes (subagent_type: `general`), RPC identity and authorization attack classes (subagent_type: `general`), Universal moves (apply across the above), Validation rules (apply before reporting ANY finding here) (+1 more)

### Community 28 - "Resource Exhaustion and Availability Hunting"
Cohesion: 0.20
Nodes (9): Computational amplification attack classes (subagent_type: `general`), Core discipline (include in every agent prompt for this domain), Failure and recovery attack classes (subagent_type: `general`), Quota and scheduling attack classes (subagent_type: `general`), Resource accumulation attack classes (subagent_type: `general`), Resource Exhaustion and Availability Hunting, Universal moves (apply across the above), Validation rules (apply before reporting ANY finding here) (+1 more)

### Community 29 - "Validation, Structured Output, Verification, and Reporting"
Cohesion: 0.20
Nodes (9): Candidate-verifier prompt, `FINDINGS-DETAIL.md`, `NEEDS-VALIDATION.md`, Phase 3: Independently validate every candidate, Phase 4: Write and validate `findings.json`, Phase 5: Verify the final records with fresh eyes, Phase 6: Produce target-neutral reports from final records, `REPORT.md` (+1 more)

### Community 30 - "HTTP-Protocol and Authentication Hunting"
Cohesion: 0.18
Nodes (10): API-key and mTLS attack classes (subagent_type: `general`), Browser-session attack classes (subagent_type: `general`), Core discipline (include in every agent prompt for this domain), Federated-identity attack classes (subagent_type: `general`), HTTP framing and cache attack classes (subagent_type: `general`), HTTP-Protocol and Authentication Hunting, MFA, passkey, and account-transition attack classes (subagent_type: `general`), Universal moves (apply across the above) (+2 more)

### Community 31 - "Supply Chain and Release Hunting"
Cohesion: 0.22
Nodes (8): CI and automation attack classes (subagent_type: `general`), Core discipline (include in every agent prompt for this domain), Dependency and build-input attack classes (subagent_type: `general`), Release and update attack classes (subagent_type: `general`), Supply Chain and Release Hunting, Universal moves (apply across the above), Validation rules (apply before reporting ANY finding here), When to use this file

### Community 32 - "asset-versions.mjs"
Cohesion: 0.22
Nodes (5): current, dist, manifestPath, html, manifest

### Community 33 - "server.test.mjs"
Cohesion: 0.15
Nodes (11): app, clock, dataDir, design, folder, frame, login(), pending (+3 more)

### Community 34 - "check.cjs"
Cohesion: 0.25
Nodes (7): assert, css, fs, html, path, sourceFiles, vm

### Community 36 - "browser-audit.mjs"
Cohesion: 0.25
Nodes (6): app, csp, dataDir, errors, report, require

### Community 37 - "Nội dung dành cho agent và công cụ tìm kiếm"
Cohesion: 0.29
Nodes (6): Kiểm tra, Nguồn, Nội dung dành cho agent và công cụ tìm kiếm, Nội dung và nhận diện, URL và giao thức, Việc cần chủ trang thực hiện

### Community 38 - "Kiểm tra toàn bộ website — 10/11/2026"
Cohesion: 0.29
Nodes (6): Chạy lại, Các lỗi đã sửa, Giới hạn còn lại, Kiểm tra, Kiểm tra toàn bộ website — 10/11/2026, Phạm vi

### Community 39 - "Rà soát sơ bộ website Hùng Hiền Hòa — 10/11/2026"
Cohesion: 0.29
Nodes (6): Căn cứ đã tra cứu, Cập nhật triển khai sau rà soát, Phạm vi và bằng chứng, Rà soát sơ bộ website Hùng Hiền Hòa — 10/11/2026, Điều cần chủ trang xác nhận, Ưu tiên khắc phục

### Community 40 - "Search Console cho website của Hùng"
Cohesion: 0.29
Nodes (6): Gửi sitemap, Kiểm tra URL và yêu cầu lập chỉ mục, Những phần đã có trên website, Search Console cho website của Hùng, Trạng thái đã kiểm tra ngày 14/11/2026, Xác minh quyền sở hữu

### Community 41 - "dashboard.test.mjs"
Cohesion: 0.10
Nodes (20): claimContribution(), contributionDay(), initContributionLimit(), initVisits(), recordVisit(), VISIT_PAGES, visitDay(), visitSummary() (+12 more)

### Community 42 - "Nguồn tham khảo khung Hộp Ảnh"
Cohesion: 0.33
Nodes (5): Bộ bổ sung thứ hai, Bộ thay thế ngày 10/11/2026, Hai gói khung do Hùng cung cấp, Nguồn tham khảo khung Hộp Ảnh, Xác nhận của chủ trang ngày 13/11/2026

### Community 43 - "Quy trình ứng phó sự cố"
Cohesion: 0.18
Nodes (11): 1. Bản đồ dữ liệu và tài khoản, 2. Mức độ, 4. Lệnh khẩn cấp, 5. Mẫu thông báo, 6. Chuẩn bị trước (làm từ bây giờ), Căn cứ pháp lý, Dữ liệu cá nhân website đang giữ, Gửi người đóng góp bị ảnh hưởng (+3 more)

### Community 44 - "Quản trị các trang của Hùng"
Cohesion: 0.40
Nodes (4): Chèn và thay ảnh, Dung lượng & hạn mức — chỉ dữ liệu tự động, Quản trị các trang của Hùng, Ý nghĩa số liệu

### Community 45 - "Reconnaissance"
Cohesion: 0.40
Nodes (5): Architecture summary and companion selection, Deterministic coverage ledger, Phase 1: Map the source and plan coverage, Prior-run input, Reconnaissance

### Community 46 - "Xưởng khung, blog, quản trị và WebP — 09/11/2026"
Cohesion: 0.40
Nodes (4): Giới hạn còn lại, Kiểm tra đạt, Xưởng khung, blog, quản trị và WebP — 09/11/2026, Đã triển khai trên máy

### Community 47 - "Việt hóa và Hộp Ảnh — 09/11/2026"
Cohesion: 0.40
Nodes (4): Giới hạn kiểm tra và xuất bản, Kết quả, Việt hóa và Hộp Ảnh — 09/11/2026, Đã kiểm tra

### Community 48 - "Kiểm tra bản sticker và mobile — 09/11/2026"
Cohesion: 0.40
Nodes (4): Dải chữ photobooth/blog và khoảng cách hướng dẫn mở hộp, Kiểm tra bản sticker và mobile — 09/11/2026, Rà icon, tên gọi và YouTube, Sửa chồng lớp trang chính sau khi thêm blog

### Community 49 - "Máy chủ nội dung và quản trị"
Cohesion: 0.40
Nodes (4): Dữ liệu và thời hạn, Kiểm tra, Máy chủ nội dung và quản trị, Thiết lập quản trị

### Community 50 - "material-cards.test.mjs"
Cohesion: 0.40
Nodes (3): css, html, preview

### Community 51 - "AGENTS.md"
Cohesion: 0.50
Nodes (3): graphify, graphify, Quy tắc dự án

### Community 52 - "Phông chữ website"
Cohesion: 0.50
Nodes (3): Be Vietnam Pro, Phông chữ website, Playfair Display

### Community 53 - "Chất liệu và chuyển động tham khảo GIF"
Cohesion: 0.50
Nodes (3): Chuyển động, Chất liệu và chuyển động tham khảo GIF, Prompt cuối

### Community 54 - "Approved material reconstruction — 2026-11-11"
Cohesion: 0.50
Nodes (3): Approved material reconstruction — 2026-11-11, Artwork balance, Six original reference animations

### Community 55 - "README.md"
Cohesion: 0.38
Nodes (3): Bên trong xưởng nhỏ, Có gì trong chiếc hộp?, Một chút về mình

### Community 57 - "3. Sáu bước"
Cohesion: 0.29
Nodes (7): 3. Sáu bước, Bước 1. Ghi nhận (0–15 phút), Bước 2. Ngăn chặn (trong 1 giờ đầu), Bước 3. Đánh giá (trong 24 giờ), Bước 4. Thông báo (trước 72 giờ kể từ lúc phát hiện), Bước 5. Khắc phục, Bước 6. Rút kinh nghiệm (trong 7 ngày sau khi xử lý xong)

### Community 68 - "adsense.test.mjs"
Cohesion: 0.33
Nodes (5): ADSENSE_CLIENT, admin, booth, main, policies

### Community 69 - "Nội dung dùng chung — hợp đồng giao tiếp"
Cohesion: 0.33
Nodes (5): API admin, API public, Bảo mật và vòng đời, Nội dung dùng chung — hợp đồng giao tiếp, Snap (công khai, không cần tài khoản)

### Community 70 - "browser-adsense-readiness.mjs"
Cohesion: 0.33
Nodes (5): ads, base, {chromium}, errors, local

### Community 71 - "Kiểm tra triển khai hunghienhoa — 09/11/2026"
Cohesion: 0.40
Nodes (4): Chưa hoàn tất và giới hạn kiểm tra, Kiểm tra triển khai hunghienhoa — 09/11/2026, Kết quả đã kiểm chứng, Sửa biểu mẫu đăng nhập — 10/11/2026

### Community 72 - "Hướng dẫn mã nguồn — Hùng Hiền Hòa"
Cohesion: 0.40
Nodes (5): Chạy tại máy, Chỉnh nội dung, Dự án đã làm và Hộp Ảnh, Hướng dẫn mã nguồn — Hùng Hiền Hòa, Xưởng khung, dữ liệu và WebP

### Community 73 - "Bắt đầu bằng một lời chào"
Cohesion: 0.40
Nodes (5): Bắt đầu bằng một lời chào, Kiểm tra giao diện và luồng bằng trình duyệt, Skill và plugin cho Claude Code, Snap của Hùng, Tên website và liên kết trên Google

### Community 74 - "server.mjs"
Cohesion: 0.16
Nodes (22): derive, loopback(), root, seedPosts, decodeFrameImage(), decodeWebP(), defaultSite, design() (+14 more)

### Community 75 - "createApp"
Cohesion: 0.17
Nodes (26): adsenseHtml(), agentRoute(), markdown404(), pageContext(), representation(), textResponse(), createApp(), activeSession() (+18 more)

### Community 76 - "steps"
Cohesion: 0.09
Nodes (22): runs-on, steps, timeout-minutes, concurrency, cancel-in-progress, group, jobs, check (+14 more)

### Community 77 - "browser-stickers-audit.mjs"
Cohesion: 0.33
Nodes (5): app, errors, failures, report, require

### Community 78 - "viewport.test.mjs"
Cohesion: 0.50
Nodes (3): compact, pages, readability

## Knowledge Gaps
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `VisitCounter` connect `dashboard.test.mjs` to `index.mjs`, `Quy trình ứng phó sự cố`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `handle()` (e.g. with `frameData()` and `pendingData()`) actually correct?**
  _`handle()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `validate-findings.cjs` be split into smaller, more focused modules?**
  _Cohesion score 0.05750658472344162 - nodes in this community are weakly interconnected._
- **Why does `Quy trình ứng phó sự cố` connect `Quy trình ứng phó sự cố` to `3. Sáu bước`, `README.md`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Should `validate-coverage-ledger.cjs` be split into smaller, more focused modules?**
  _Cohesion score 0.07740112994350283 - nodes in this community are weakly interconnected._
- **Why does `Dữ liệu cá nhân website đang giữ` connect `Quy trình ứng phó sự cố` to `dashboard.test.mjs`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Should `agent-content.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.06894049346879536 - nodes in this community are weakly interconnected._