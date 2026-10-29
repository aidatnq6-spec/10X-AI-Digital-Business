# Operations and Performance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Triển khai nhóm1 và3 đã được người dùng chọn: vận hành rõ trạng thái, backup di động và giảm tải dữ liệu khi dùng hằng ngày.

**Architecture:** Giữ Next.js/local JSON/worker hiện tại. Bổ sung conditional GET với ETag từ metadata file, workspace projection và history API riêng. Client cập nhật thích ứng, ngừng khi tab ẩn và có nút đồng bộ an toàn. Backup tải thành JSON có checksum và nhập lại để khôi phục bản riêng qua cơ chế hiện có.

**Tech Stack:** Next.js15, React19, TypeScript, Zod, node:test/tsx, Playwright Chrome, Windows PowerShell.

---

## Phạm vi được phép và quyết định

- User đã yêu cầu triển khai nhóm1/3 trong đề xuất trước. Không chỉnh prompt/model, không gọi AI tính phí, không thêm Firebase hoặc đăng/gửi nội dung.
- Repo hiện có baseline `e56e6e9` do người dùng tạo; không tạo lại. Làm tại nhánh `feat/operations-performance-20261029`, giữ nguyên đường dẫn và kho dữ liệu thật.
- Không worktree thứ hai: shortcut và kho local hiện gắn với thư mục này; nhánh riêng + baseline bảo vệ mã mà không tạo thêm bản chạy/dữ liệu lẫn lộn.
- Backup ngoài thư mục bằng download JSON; người dùng chọn nơi lưu/ổ ngoài. Không tự sao chép dữ liệu lên đám mây hoặc chọn một đường dẫn ghi bất kỳ từ HTTP.
- Tải lịch sử bằng endpoint readonly khi mở details; snapshot frontend chỉ chứa phần hiện hành, backend vẫn giữ toàn bộ lịch sử.
- Poll project: chạy1.5s, chờ/idle15s, hoàn tất30s; lỗi backoff tối đa30s; tab ẩn không định kỳ tải, trở lại kiểm tra ngay. Chỉ retry GET, không retry lệnh/AI.
- Cập nhật background giữ bản nhập và xử lý conflict hiện có. Thành công304 là kiểm tra server thành công, không phải ghi dữ liệu.

## Task1: Mốc phục hồi và kiểm tra nền
Files: `.git`, `docs/operations-performance-progress.md`.
1. Xác nhận baseline, ignore `.env.local`/`.local`, branch riêng.
2. Ghi hash dữ liệu thật để đối chiếu, không đưa hash/nội dung riêng vào Git.
3. Giữ kết quả baseline60tests/14e2e/build từ lượt rà soát; sau thay đổi chạy lại bộ phù hợp.

## Task2: Conditional reads và projection
Files: `src/lib/projects/{repository,local-repository,http,read-models,client}.ts`; `tests/operations-performance.test.ts`.
1. Test ETag304 không đọc/parse full snapshot, ETag đổi sau mutation và read race không phát ETag sai.
2. Implement optional repo versionTag dùng stat metadata hash, GET view workspace/summary/history, kiểm tra local access trước tag lookup.
3. Workspace giữ current artifacts, usage/status, một brief hiện tại; bỏ job inputs và command receipts khỏi payload. Endpoint mặc định vẫn full cho tương thích.
4. Test workspace không chở lịch sử, history readonly và filter đúng; run focused suite.

## Task3: Adaptive sync và UX vận hành
Files: `src/lib/projects/polling.ts`, `src/hooks/use-project-sync.ts`, `src/components/{project-workspace,project-progress,sync-status,artifact-history}.tsx`, `src/lib/workflow/attention.ts`.
1. Test cadence, hidden tab, backoff và phân loại hướng xử lý từ trạng thái thật.
2. Thay interval700ms bằng một timeout tại một thời điểm; abort khi bỏ tab/project, refresh foreground/manual; chỉ nhận version mới.
3. Hiển thị đồng bộ lần cuối, mất kết nối, nút thử lại GET; bổ sung lý do dừng và bước xử lý không tự chạy tác vụ.
4. Chuyển lịch sử sang lazy details, worker health adaptive và backup catalog ngừng tải khi tab ẩn.

## Task4: Backup JSON di động
Files: `src/lib/projects/{backup-store,backup-files}.ts`, `src/app/api/backups/file/route.ts`, `src/components/backup-panel.tsx`, tests.
1. Test export roundtrip tại kho mới, checksum/schema sai không ghi, origin lạ bị từ chối, import idempotent.
2. JSON envelope đúng checksum/schema/version, không .env/key; GET attachment và POST import giới hạn32MiB, xác nhận restore explicit.
3. Dùng restoreBackup để tạo paused copy, vô hiệu config, giữ original và phí đã biết; không chạy AI.
4. UI tải backup, chọn file xem trước rồi xác nhận khôi phục. Browser chọn vị trí lưu, không API ghi đường dẫn tùy ý.

## Task5: Xác minh, tài liệu và cập nhật local
Files: `tests/e2e/operations-performance.spec.ts`, README, docs vận hành.
1. Test Chrome: idle304, history lazy, offline/recovery giữ draft, tải và nhập backup vào bản riêng, tab visibility.
2. Run unit, typecheck, production build, e2e với kho/cổng riêng3201/3211.
3. Sửa README root/3220/3230/healthversion4, giải thích đóng browser không dừng worker, backup và cadence mới.
4. Rà soát toàn diff với reviewer độc lập, sửa findings bằng regression tests. Không push remote.
5. Chỉ restart tiến trình có health/root/PID đúng3220/3230 sau khi xác nhận không job chạy; giữ dữ liệu thật không thay đổi, không mở lại bản cũ3200/3210. User lưu draft rồi refresh Chrome để nhận giao diện mới.

## Kiểm tra quan trọng

Không mất draft khi background sync; không lấy workspace projection làm dữ liệu ghi thay full project; không nhập backup hỏng/không xác nhận; giữ checksum trước normalize schema; fallback full read khi metadata race; không nhận304 với cache chưa có; không khởi chạy AI sau restore hoặc retry GET. Imported paid jobs vẫn giữ trạng thái cần đối chiếu nếu còn khoản chưa rõ, không xóa chi phí.
