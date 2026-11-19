# Graph Report - hunghienhoa  (2026-11-19)

## Corpus Check
- 116 files · ~83,247 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 18 file(s) not represented in the graph (top: .woff2 12, (none) 3, .base64 2)

## Summary
- 964 nodes · 1679 edges · 68 communities (54 shown, 14 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 26 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6c719fe8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- server.mjs
- validate-findings.cjs
- validate-coverage-ledger.cjs
- index.mjs
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
- sticker-assets.test.mjs
- check.cjs
- ref_node_fs
- browser-audit.mjs
- Nội dung dành cho agent và công cụ tìm kiếm
- Kiểm tra toàn bộ website — 10/11/2026
- Rà soát sơ bộ website Hùng Hiền Hòa — 10/11/2026
- Search Console cho website của Hùng
- browser-material-cards.mjs
- Nguồn tham khảo khung Hộp Ảnh
- browser-stickers-audit.mjs
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
- http-smoke.mjs
- Canvas
- viewport.test.mjs
- TestDate
- TestImage
- TestURL
- ADSENSE.md
- RESTORE.md
- SOCIAL-LOGO-SOURCES.md

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
- `assetRequest()` --calls--> `publicRedirect()`  [EXTRACTED]
  worker/index.mjs → server/agent-content.mjs
- `handle()` --calls--> `publicRedirect()`  [EXTRACTED]
  worker/index.mjs → server/agent-content.mjs
- `handle()` --calls--> `pageContext()`  [EXTRACTED]
  worker/index.mjs → server/agent-content.mjs
- `handle()` --calls--> `representation()`  [EXTRACTED]
  worker/index.mjs → server/agent-content.mjs
- `withSecurity()` --calls--> `publicHtml()`  [EXTRACTED]
  worker/index.mjs → server/agent-content.mjs

## Import Cycles
- None detected.

## Communities (68 total, 14 thin omitted)

### Community 0 - "server.mjs"
Cohesion: 0.05
Nodes (79): agentRoute(), markdown404(), pageContext(), publicRedirect(), representation(), textResponse(), claimContribution(), contributionDay() (+71 more)

### Community 1 - "validate-findings.cjs"
Cohesion: 0.06
Nodes (54): canonicalKey(), append(), encode(), codePointLength(), collect(), collectDataLimitErrors(), collectFindingSemanticErrors(), collectSchemaErrors() (+46 more)

### Community 2 - "validate-coverage-ledger.cjs"
Cohesion: 0.08
Nodes (54): ATTEMPT_FIELDS, ATTEMPT_STATUSES, canonicalCoverageId(), collectUnitErrors(), createErrorList(), encodeCanonicalRef(), escapeUnsafeDiagnosticCharacters(), fs (+46 more)

### Community 3 - "index.mjs"
Cohesion: 0.09
Nodes (47): ADSENSE_CLIENT, adsenseHtml(), usageEntry(), usageMetrics, usageProviders, usageReport(), utcDay(), admin (+39 more)

### Community 4 - "agent-content.mjs"
Cohesion: 0.07
Nodes (42): articleHtml(), canonical(), decorateHtml(), escapeHtml(), html404(), inlineHtml(), instructions(), llms() (+34 more)

### Community 5 - "build-ui-symbols.py"
Cohesion: 0.06
Nodes (8): Slots, patch(), stroke(), main(), windows(), main(), obsolete(), git()

### Community 6 - "Triển khai `hunghienhoa`"
Cohesion: 0.06
Nodes (31): API admin, API public, Bảo mật và vòng đời, Nội dung dùng chung — hợp đồng giao tiếp, Snap (công khai, không cần tài khoản), Cập nhật hằng ngày, GitHub → Cloudflare tự triển khai, Giới hạn đã ghi nhận (+23 more)

### Community 7 - "snaptik.test.mjs"
Cohesion: 0.12
Nodes (24): embeddedData(), walk(), entities(), error(), facebookId(), limitedJSON(), limitedText(), mediaURL() (+16 more)

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
Cohesion: 0.15
Nodes (9): ads, base, {chromium}, errors, local, {chromium}, errors, {chromium} (+1 more)

### Community 15 - "ref_node_assert"
Cohesion: 0.17
Nodes (7): hosts, links, checks, files, hosts, app, html

### Community 16 - "Cloud and Deployment Hunting"
Cohesion: 0.18
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
Cohesion: 0.20
Nodes (9): AI, LLM, and Agent Hunting, Context, retrieval, and memory attack classes (subagent_type: `general`), Core discipline (include in every agent prompt for this domain), MCP and sub-agent trust classes (subagent_type: `general`), Output and disclosure attack classes (subagent_type: `general`), Tool and action attack classes (subagent_type: `general`), Universal moves (apply across the above), Validation rules (apply before reporting ANY finding here) (+1 more)

### Community 22 - "Client-Side and Browser Hunting"
Cohesion: 0.20
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
Cohesion: 0.20
Nodes (10): API-key and mTLS attack classes (subagent_type: `general`), Browser-session attack classes (subagent_type: `general`), Core discipline (include in every agent prompt for this domain), Federated-identity attack classes (subagent_type: `general`), HTTP framing and cache attack classes (subagent_type: `general`), HTTP-Protocol and Authentication Hunting, MFA, passkey, and account-transition attack classes (subagent_type: `general`), Universal moves (apply across the above) (+2 more)

### Community 31 - "Supply Chain and Release Hunting"
Cohesion: 0.22
Nodes (8): CI and automation attack classes (subagent_type: `general`), Core discipline (include in every agent prompt for this domain), Dependency and build-input attack classes (subagent_type: `general`), Release and update attack classes (subagent_type: `general`), Supply Chain and Release Hunting, Universal moves (apply across the above), Validation rules (apply before reporting ANY finding here), When to use this file

### Community 32 - "asset-versions.mjs"
Cohesion: 0.22
Nodes (5): current, dist, manifestPath, html, manifest

### Community 33 - "sticker-assets.test.mjs"
Cohesion: 0.22
Nodes (8): file(), css, folders, main, originalWork, owners, pages, used

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

### Community 41 - "browser-material-cards.mjs"
Cohesion: 0.29
Nodes (5): {chromium}, errors, scopes, sources, titles

### Community 42 - "Nguồn tham khảo khung Hộp Ảnh"
Cohesion: 0.33
Nodes (5): Bộ bổ sung thứ hai, Bộ thay thế ngày 10/11/2026, Hai gói khung do Hùng cung cấp, Nguồn tham khảo khung Hộp Ảnh, Xác nhận của chủ trang ngày 13/11/2026

### Community 43 - "browser-stickers-audit.mjs"
Cohesion: 0.33
Nodes (5): app, errors, failures, report, require

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

### Community 57 - "viewport.test.mjs"
Cohesion: 0.50
Nodes (3): compact, pages, readability

## Knowledge Gaps
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createApp()` connect `server.mjs` to `index.mjs`, `agent-content.mjs`, `browser-audit.mjs`, `snaptik.test.mjs`, `browser-stickers-audit.mjs`, `ref_node_path`, `browser-usage-audit.mjs`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `handle()` (e.g. with `frameData()` and `pendingData()`) actually correct?**
  _`handle()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `server.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.05070707070707071 - nodes in this community are weakly interconnected._
- **Why does `Element` connect `Element` to `Canvas`, `photo-privacy.test.mjs`, `TestImage`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Should `validate-findings.cjs` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._
- **Why does `preflightJsonText()` connect `preflightJsonText` to `validate-coverage-ledger.cjs`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Should `validate-coverage-ledger.cjs` be split into smaller, more focused modules?**
  _Cohesion score 0.07740112994350283 - nodes in this community are weakly interconnected._