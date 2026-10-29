# Error Diagnostics Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ghi mã lỗi, thời điểm và bước thất bại; truy vết lỗi HTTP 500 gián đoạn mà không gửi AI tính phí.

**Architecture:** Giữ Next.js/local JSON/worker hiện có. AsyncLocalStorage truyền context kỹ thuật qua API/repository/worker; nhật ký mỗi sự cố là JSON bất biến trong `.local/projects/.diagnostics`, giữ tối đa 200 bản. HTTP 500 và thông báo worker có mã đối chiếu; giao diện xem nhật ký theo yêu cầu, không polling. Chỉ ghi các trường được cho phép; không message/stack thô, request body, prompt, env, key hoặc nội dung dự án.

**Tech Stack:** TypeScript, Next.js, Node fs/AsyncLocalStorage, Zod, React, node:test/tsx, Playwright Chrome.

## Task 1: Logger và HTTP

Files: `src/lib/diagnostics/{types,server}.ts`, `src/lib/projects/{http,repository,local-repository}.ts`, `src/lib/workflow/http.ts`, `tests/diagnostics.test.ts`.

1. Test RED: context step/code/UUID/time, HTTP 500 reference, redaction, bounded retention, logging failure preserves original response.
2. Implement allowlisted event schema and bounded atomic incident files; local-access on read endpoint.
3. Handle500 stores event, returns reference/technical code/time/step; expected400/403/409 stay existing behavior. Instrument project read/lock/write/commit/release and workflow commands; no automatic command retry.
4. Run focused tests/typecheck → PASS.

## Task 2: Worker và tái hiện

Files: `src/lib/workflow/worker.ts`, `scripts/worker.ts`, `tests/diagnostics-stress.test.ts`.

1. Test RED: provider/commit/heartbeat errors produce correlated step/job/system events; preserve original error/usage and dispatch-once semantics.
2. Instrument worker catch paths and outer loop; persist reference in existing error text (no schema migration). No raw error text in diagnostics.
3. Stress temp repository with concurrent workflow writes/history reads/backup scans; deterministic filesystem fault injection identifies stage and verifies no hidden side effects.
4. Fix reproducible causes only with regression tests. Distinguish confirmed causes from hypotheses about the historical500.

## Task 3: Giao diện và kiểm chứng

Files: `src/app/api/diagnostics/route.ts`, `src/components/diagnostics-panel.tsx`, `src/components/project-workspace.tsx`, `tests/e2e/diagnostics.spec.ts`, README, `docs/error-diagnostics-progress.md`.

1. Show bounded recent incident records lazily; action to refresh only GET. Include code/time/step/reference, no arbitrary log path or delete action.
2. Test Chrome mocked500 displays reference and preserves draft; local endpoint rejects foreign origins, no paid calls.
3. Run full unit/typecheck/build/E2E isolated ports/data; one independent final review via executing-plans.
4. Restart only verified owned web/worker3220/3230 if no active jobs; compare real data hashes, commit local without push.

## Decisions / ledger

- Scope already authorized by user's explicit request following proposed next step. No further feature selection needed.
- Keep current feature branch/path so Desktop shortcut and data remain valid; verify PID/root before service update.
- Missing subagent-driven-development helper scripts: track tests/decisions here and progress doc directly.
- If historical500 cannot be reproduced, state that clearly; instrumentation enables capture on recurrence. Never claim a proven original cause from an injected fault alone.
