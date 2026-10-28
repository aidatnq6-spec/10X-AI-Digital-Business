# Mission Control Auto-run Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Người dùng nhập một đề bài tại Sản phẩm Win; AI tạo nội dung qua năm hệ thống, dừng đúng hai điểm duyệt và lưu kết quả để tiếp tục sau khi mở lại ứng dụng.

**Architecture:** Giữ ứng dụng Next.js hiện tại và OpenRouter phía server. Tách dữ liệu dự án, bộ điều phối trạng thái, kho lưu cục bộ và worker Node độc lập; trình duyệt chỉ hiển thị và gửi lệnh. Mỗi kết quả và quyết định duyệt gắn với phiên bản đầu vào; không chạy bước tiếp theo từ nội dung đã lỗi thời.

**Tech Stack:** Next.js 15 đang cài trong dự án, React 19, TypeScript, Tailwind CSS 4, Radix/shadcn, Lucide, OpenRouter; dự kiến thêm Zod cho schema và tsx để chạy worker/test TypeScript. Chưa cần Firebase cho lần dùng đầu tiên.

---

## 1. Nguồn yêu cầu và giới hạn

Thiết kế đã được người dùng chấp thuận: [Auto-run design](../superpowers/specs/2026-10-28-auto-run-design.md).

Thư mục thực hiện: `D:\GitHub\mission-control-app`. Tất cả đường dẫn phía dưới tính từ thư mục này. Không sửa nhầm dự án `D:\GitHub\AI-Solo-Business`.

Luồng bắt buộc:

```text
Nhập đề bài → Hệ thống 1 → Duyệt 1
→ Hệ thống 2 → Hệ thống 3 → Duyệt 2
→ Hệ thống 4 → Hệ thống 5 → Hoàn tất
```

Lỗi kỹ thuật, thiếu dữ liệu hoặc giới hạn chi phí có thể tạm dừng; không biến chúng thành các cổng duyệt nghiệp vụ mới. Chỉ tạo nội dung chữ: 4 kịch bản/caption, 4 bài đăng, 1 trang giới thiệu dạng văn bản, 3 email, checklist cấp mới, 10 FAQ và mẫu quản trị CSV. Không xuất MP4, tạo ảnh, đăng bài, gửi email hoặc cấp chữ ký số thật.

Giữ nguyên bản đồ hành tinh đã giảm tốc, dừng khi tương tác và các nút truy cập cố định. Không dùng thời gian giả, điểm giả hay tiến trình mô phỏng để thể hiện kết quả AI thật.

Dự án hiện không có Git: không thể tạo worktree/commit. Không tự khởi tạo Git; lưu kế hoạch và thực hiện theo từng phần đã kiểm tra. Khi có Git mới tạo commit sau từng task.

## 2. Các quyết định triển khai

- Dùng một dự án đang hoạt động trong giao diện đầu tiên; schema có project ID để không khóa đường nâng cấp nhiều dự án.
- Kho `.local/projects/<projectId>/state.json` chứa snapshot dự án, phiên bản, jobs và approvals. Một file giao dịch giúp tránh cập nhật nửa chừng giữa các bảng JSON.
- Mọi tiến trình ghi qua cùng repository: khóa độc quyền bằng tạo file `wx`, revision check, ghi file tạm rồi rename. Không tự xóa khóa chỉ dựa vào tuổi; xác minh tiến trình sở hữu và phục hồi snapshot hợp lệ. Từ chối ghi nếu không thể xác định an toàn.
- Worker chạy cùng máy, được launcher khởi động ẩn. Server và worker cùng dùng repository; không chạy worker bên trong React effect hoặc mỗi request Next.js.
- Mỗi project chỉ có một job đang chạy. Trước gọi provider phải ghi `dispatching`; không gửi lại job ở trạng thái không rõ đã được provider nhận hay chưa.
- Một tác vụ sinh một nhóm kết quả có schema, số lượng hữu hạn. Chia tác vụ lớn theo nhóm kết quả để giảm chi phí chạy lại.
- Chỉ hỗ trợ truy cập loopback trong lần đầu. API thay đổi trạng thái kiểm tra Host/Origin và dữ liệu; không cấu hình CORS mở. Không đưa API key vào client hay file xuất.
- Giá/điều kiện thương mại lấy từ dữ liệu chuẩn và được render bằng code. AI không có quyền tự sửa giá hoặc gán khả năng tương thích chưa được xác nhận.
- Chưa có key: hiện rõ chế độ mẫu/không kết nối. Provider giả chỉ phục vụ test và bản xem thử có nhãn, không tự chuyển sang mẫu khi API thật lỗi.

## Task 1: Thiết lập kiểm thử và mô hình đề bài

**Files:** Modify `package.json`, `package-lock.json`; Create `src/lib/projects/schema.ts`, `src/lib/projects/ica-preset.ts`, `tests/project-schema.test.ts`.

1. Đọc hướng dẫn Next.js trong package cài đặt nếu có; nếu không có, tra tài liệu chính thức đúng phiên bản trước khi sửa route. Áp dụng @vercel-react-best-practices khi sửa React.
2. Cài `zod`, thêm dev dependency `tsx`; thêm scripts `test:workflow` và `worker`. Giữ nguyên script và test hành tinh hiện có.
3. Viết test đỏ cho brief tự do, giá nguyên VND, thời hạn cơ bản và tháng tặng riêng; từ chối giá âm, số thập phân và dữ liệu bắt buộc rỗng.
4. Chạy `npx tsx --test tests/project-schema.test.ts`; kỳ vọng lỗi thiếu schema/preset.
5. Định nghĩa Project, Brief, Offer, ArtifactVersion, Approval, Job, Usage bằng schema; ưu tiên discriminated unions cho trạng thái. Project có `schemaVersion`, `revision`, `briefVersion`, `workflowEpoch` và timestamps.
6. Preset ICA: ngách chữ ký số dịch vụ công Kho bạc Nhà nước; kế toán ở Đà Nẵng; sản phẩm chữ ký số; cấp mới; cả ba gói gồm VAT và USB Token. Các gói lần lượt `(12,1792800,0)`, `(24,2690000,0)`, `(36,3080000,6)` theo thứ tự tháng cơ bản, giá VND, tháng tặng.
7. Chạy lại test; kỳ vọng PASS. Thêm test sản phẩm khác để bảo đảm schema không chỉ phục vụ ICA.

Ví dụ assertion nghiệp vụ phải giữ:

```ts
assert.deepEqual(icaPreset.offers.map(o => [o.durationMonths, o.priceVnd, o.bonusMonths]), [
  [12, 1792800, 0], [24, 2690000, 0], [36, 3080000, 6],
]);
```

## Task 2: Kho lưu bền và API dự án

**Files:** Create `src/lib/projects/repository.ts`, `src/lib/projects/local-repository.ts`, `src/lib/server/local-access.ts`, `src/app/api/projects/route.ts`, `src/app/api/projects/[id]/route.ts`, `tests/project-repository.test.ts`, `tests/project-api.test.ts`; Modify `.gitignore` nếu cần.

1. Viết test đỏ: lưu/đọc qua instance mới; hai writer cùng revision chỉ một thành công; project ID không thoát thư mục; snapshot hỏng trả lỗi rõ; log không chứa key.
2. Chạy `npx tsx --test tests/project-repository.test.ts tests/project-api.test.ts`; kỳ vọng FAIL trước triển khai.
3. Tạo repository interface `create`, `get`, `update(id, expectedRevision, mutation)`; triển khai atomic update và khóa dùng chung giữa server/worker. Validate snapshot khi đọc và kiểm tra migration version.
4. Thêm GET/POST `/api/projects`, GET/PATCH `/api/projects/[id]`. PATCH bắt buộc expectedRevision, trả 409 khi xung đột; validation 400, thiếu dự án 404. Không chấp nhận tùy ý artifact/approval do client gửi.
5. Bảo vệ mutation bằng Host/Origin loopback. Kiểm thử foreign Origin, sai JSON, stale revision và traversal.
6. Chạy lại hai test; kỳ vọng PASS. Xác minh `.local/` và `.env.local` được ignore, không đọc/in giá trị bí mật.

## Task 3: Bộ điều phối năm hệ thống và hai điểm duyệt

**Files:** Create `src/lib/workflow/state-machine.ts`, `src/lib/workflow/dependencies.ts`, `src/lib/workflow/commands.ts`, `src/app/api/projects/[id]/commands/route.ts`, `tests/workflow.test.ts`.

1. Viết test đỏ cho toàn bộ thứ tự 1 → gate1 → 2 → 3 → gate2 → 4 → 5; không tồn tại cổng duyệt riêng tại 4/5.
2. Thêm test duyệt version cũ bị từ chối, double-click không tạo job đôi, edit giá vô hiệu hóa toàn bộ downstream, edit một bài chỉ vô hiệu artifact liên quan và gate2.
3. Chạy `npx tsx --test tests/workflow.test.ts`; kỳ vọng FAIL.
4. Triển khai state machine thuần và command handlers: start, pause, resume, approve, reviseBrief, reviseArtifact, reconcileJob. Approve mang chính xác artifact/version IDs đang được xem.
5. Tách epoch khỏi revision lưu trữ: worker heartbeat không làm kết quả tự hết hạn. Hoàn thành job chỉ được áp dụng nếu dependency versions/epoch vẫn khớp; nếu không lưu thành phiên bản lỗi thời, không ghi đè bản đang dùng.
6. Pause chặn claim bước tiếp theo; cho phép job đã gửi xong ghi kết quả hợp lệ. Không tự chạy lại cả dây chuyền sau chỉnh sửa; hiển thị phạm vi cần tạo lại trước lệnh resume.
7. Chạy lại test; kỳ vọng PASS, gồm trường hợp sửa nội dung khi đang chờ provider.

## Task 4: Hợp đồng kết quả và prompt nghiệp vụ

**Files:** Create `src/lib/ai/artifact-schemas.ts`, `src/lib/ai/prompts.ts`, `src/lib/ai/grounding.ts`, `tests/artifact-contracts.test.ts`; Modify `src/data/systems.ts`.

1. Viết test đỏ cho đủ số lượng đầu ra đã chốt, thiếu liên hệ được ghi rõ, không biến giá cấp mới thành gia hạn và không biến ngách Kho bạc thành cam kết tương thích.
2. Chạy `npx tsx --test tests/artifact-contracts.test.ts`; kỳ vọng FAIL.
3. Định nghĩa schema riêng cho đầu ra từng hệ thống. Facts được phân loại user-confirmed, missing, proposed; giá và điều kiện được chèn từ brief đã duyệt. Không cho output chứa một bảng giá tự do cạnh tranh với dữ liệu chuẩn.
4. Prompt dùng brief snapshot và kết quả upstream đã duyệt; đưa nội dung người dùng vào vùng dữ liệu, không coi là lệnh thay đổi workflow. Chỉ trả JSON theo contract.
5. Hệ thống 1 tạo chân dung/định vị/offer; 2 tạo 4 kịch bản cho Facebook, TikTok, Zalo, YouTube Shorts; 3 tạo 4 bài, 1 trang chữ, 3 email; 4 tạo checklist, xác nhận, 10 FAQ và chuyển người xử lý; 5 tạo mẫu theo dõi trống và hướng dẫn công thức.
6. Gate2 kiểm tra placeholder quan trọng còn trong nội dung sử dụng: liên hệ, giá/điều kiện, cam kết chưa có căn cứ. Cho sửa hoặc loại bỏ; không ép bịa thông tin. FAQ về thủ tục/khả năng kỹ thuật chỉ là đề xuất cần xác nhận nếu chưa có nguồn.
7. Chạy lại test; kỳ vọng PASS. Chỉnh danh mục UI về gói dịch vụ, loại mô tả ebook/MP4 không đúng kết quả thực tế.

## Task 5: Provider OpenRouter có giới hạn và trạng thái chi phí rõ

**Files:** Create `src/lib/ai/provider.ts`, `src/lib/ai/openrouter.ts`, `src/lib/ai/limits.ts`, `tests/openrouter.test.ts`; Modify `.env.example`, `src/app/api/generate/route.ts`.

1. Trước code, kiểm tra tài liệu OpenRouter chính thức về model, JSON output, usage, lỗi và timeout. Không giả định mọi model hỗ trợ cùng chế độ structured output.
2. Viết test bằng fetch giả: thành công; output sai schema; 429; timeout sau dispatch; usage thiếu; giới hạn output/call; khóa thiếu không gọi mạng.
3. Chạy `npx tsx --test tests/openrouter.test.ts`; kỳ vọng FAIL.
4. Adapter nhận snapshot bất biến và cấu hình từ server. Đặt timeout, max output tokens và số lần gọi; không tự retry lỗi không rõ đã nhận. Lưu provider request ID nếu có và trạng thái usage `actual | estimated | unknown`.
5. Trước live run yêu cầu chủ ứng dụng chọn model cùng hạn mức gọi/output/ngân sách. Với giá model chưa biết, không tuyên bố có trần tiền bảo đảm: chặn live run đến khi có căn cứ tính giới hạn; hard limits số call/token vẫn áp dụng.
6. Ghi job trước request, validate JSON sau request. Output sai schema hiển thị lỗi có thể khắc phục; không âm thầm gọi lại có phí.
7. Chuyển endpoint generate cũ về cùng pipeline có project/job/version hoặc ngừng nút gọi cũ; không để một đường bỏ qua hai cổng duyệt.
8. Chạy lại test; kỳ vọng PASS. `.env.example` chỉ có tên biến và placeholder; không thay thế `.env.local` đang tồn tại.

## Task 6: Worker nền, checkpoint và phục hồi

**Files:** Create `scripts/worker.ts`, `src/lib/workflow/worker.ts`, `tests/worker-recovery.test.ts`; Modify `start-local.ps1`, `package.json`.

1. Viết test đỏ với provider giả: claim nguyên tử, hai worker không gửi hai lần; tắt/mở worker giữ checkpoint; job pending tiếp tục; job dispatching/running mất tiến trình chuyển needs_reconciliation, không tự gửi lại.
2. Chạy `npx tsx --test tests/worker-recovery.test.ts`; kỳ vọng FAIL.
3. Worker claim job có lease/owner, ghi dispatch trước gọi. Checkpoint kết quả và transition trong cùng transaction; không dựa vào tab đang mở. Heartbeat chỉ phản ánh worker còn sống, không chứng minh provider chưa nhận request.
4. Định danh job bằng project/stage/input snapshot và generation counter. Cùng lệnh/idempotency key trả cùng job; chủ động tạo lại phải là command mới có phạm vi rõ.
5. Launcher kiểm tra đúng command line/PID của worker và web server; mở một instance nếu thiếu, khởi động ẩn, ghi log trong `.local/`. Không kill tiến trình không xác minh.
6. Kiểm thử đóng trình duyệt vẫn chạy; khởi động lại app tiếp tục checkpoint. Máy tắt thì không xử lý; mở lại mới phục hồi.
7. Chạy lại test; kỳ vọng PASS. Cập nhật hướng dẫn bảo đảm worker script tồn tại trong bản chạy production.

## Task 7: Giao diện một đề bài và đồng bộ năm tab

**Files:** Create `src/lib/projects/client.ts`, `src/components/project-progress.tsx`; Modify `src/components/mission-control.tsx`, `src/components/brief-view.tsx`, `src/components/run-view.tsx`, `src/components/nav.tsx`, `src/lib/types.ts`.

1. Thay lựa chọn cố định bằng form tự do và editor gói giá; có nút điền mẫu ICA. Các trường chưa có căn cứ giữ trống/cần bổ sung.
2. Lưu brief về API, hiển thị trạng thái lưu/xung đột/lỗi; poll snapshot có version khi app mở. Không cập nhật artifact bằng nội dung phản hồi cũ hơn revision đang có.
3. Hiển thị trạng thái thực queued/running/waiting_approval/paused/failed/completed. Bỏ tick mô phỏng khỏi live workflow, bỏ số giờ/điểm giả. Không cần viết test cho từng thay đổi trình bày.
4. Tự chuyển tab theo bước chạy nếu không có bản sửa chưa lưu và người dùng không đang xem thủ công tab khác; cung cấp nút quay về bước đang chạy. Chuyển tab không pause worker.
5. Kiểm tra thủ công: điền ICA, lưu, reload, sửa chưa lưu rồi nhận kết quả mới, chuyển tab, mất mạng rồi nối lại. Nội dung sửa không bị mất và thông báo lỗi không che nút hành động.
6. Chạy `npm run typecheck`; kỳ vọng không lỗi. Giữ nguyên `universe.tsx` và `universe-motion.ts` nếu không cần tích hợp.

## Task 8: Màn hình duyệt và kho kết quả

**Files:** Create `src/components/artifact-editor.tsx`; Modify `src/components/approve-dialog.tsx`, `src/components/kit-dialog.tsx`, `src/components/done-view.tsx`; Add `tests/approval-commands.test.ts`.

1. Viết test đỏ: lệnh duyệt snapshot hiện hành thành công; version lỗi thời/thiếu dữ liệu quan trọng bị từ chối; chỉnh bài giữ lịch sử và reset gate2.
2. Chạy `npx tsx --test tests/approval-commands.test.ts`; kỳ vọng FAIL nếu chưa có ràng buộc server đầy đủ.
3. Gate1 hiển thị định vị, khách hàng, bảng giá và điều kiện; gate2 hiển thị gộp kết quả 2+3. Thay ba lựa chọn điểm số bằng xem/sửa/duyệt nội dung thực. Server là nơi thực thi điều kiện duyệt.
4. Editor dùng version IDs khi lưu. Kết quả được mở lại từ repository sau khi đóng dialog; có nhãn bản nháp/đã duyệt/lỗi thời và lịch sử phiên bản.
5. Hệ thống 4/5 xuất kết quả sau gate2, không thêm modal bắt buộc duyệt. Màn hình hoàn tất ghi rõ tệp chữ/kịch bản, các mục cần xác minh và usage hiện có.
6. Chạy test và `npm run typecheck`; kỳ vọng PASS. Kiểm tra bàn phím, focus dialog, màn hình hẹp và nội dung dài.

## Task 9: Xuất TXT/CSV và mẫu quản trị

**Files:** Create `src/lib/export/text.ts`, `src/lib/export/csv.ts`, `src/app/api/projects/[id]/export/route.ts`, `tests/export.test.ts`; Modify `src/components/done-view.tsx`, `src/components/kit-dialog.tsx`.

1. Viết test đỏ: TXT giữ tiếng Việt và giá; CSV escape dấu phẩy/quote/newline, vô hiệu formula injection trong dữ liệu tự do, có BOM cho Excel; mẫu quản trị không chứa doanh thu giả.
2. Chạy `npx tsx --test tests/export.test.ts`; kỳ vọng FAIL.
3. TXT gắn tên dự án, phiên bản, trạng thái duyệt và nhãn kịch bản. CSV có cột khách hàng/liên hệ/trạng thái/gói/số lượng/đơn giá/thành tiền/ghi chú, dữ liệu thật chỉ khi người dùng nhập.
4. Tính tổng bằng số nguyên VND với gói đã chọn và số lượng hợp lệ. Nếu CSV trống, xuất header và hướng dẫn công thức thành văn bản riêng; không gọi đây là workbook có công thức đang hoạt động.
5. Endpoint kiểm tra project/version và định dạng cho phép; không lộ key, đường dẫn máy hoặc artifact lỗi thời như bản đã duyệt.
6. Chạy lại test; kỳ vọng PASS. Mở tệp trong trình soạn thảo/Excel để kiểm tra tiếng Việt khi thực thi.

## Task 10: Kiểm chứng đầy đủ và bàn giao bản đầu tiên

**Files:** Create `tests/full-flow.test.ts`, `docs/first-run-checklist.md`; Modify `README.md`.

1. Tạo test tích hợp với thư mục tạm và provider giả, chạy preset ICA qua toàn bộ 5 hệ thống. Assert hai điểm dừng, số kết quả, dữ liệu giá chính xác và không có lời gọi gửi/đăng/cấp dịch vụ.
2. Chạy từng nhóm test trên trong lúc phát triển. Khi các task hoàn thành, chạy toàn bộ `npm run test:workflow`, `node --experimental-strip-types --test tests/universe-motion.test.mjs`, `npm run typecheck`, `npm run build`; kỳ vọng tất cả PASS.
3. Kiểm tra bản production tại `http://127.0.0.1:3200`: shortcut mở được; worker hoạt động; reload và restart không mất bản duyệt; xem tab khác không dừng tác vụ; sửa giá chặn dùng kết quả cũ.
4. Cập nhật README: cách mở/tạm dừng, nơi lưu dữ liệu, sao lưu khi app đã dừng, nơi điền key, giới hạn dùng cục bộ, khôi phục job chưa rõ kết quả. Không đưa key vào ảnh/log/tài liệu.
5. Nếu chưa có key: bàn giao ghi rõ kiểm thử mẫu đã qua, live chưa kiểm chứng. Khi người dùng cung cấp key và hạn mức, chạy một luồng ICA thật đã được đồng ý; kiểm tra usage, lưu kết quả và xuất TXT/CSV. Không tự chi tiền để hoàn thành checklist.
6. Bàn giao danh sách đã đạt/chưa đạt kèm bằng chứng; Firebase và tạo ảnh/video là phần tiếp theo, không phải điều kiện đóng bản cục bộ đầu tiên.

## 3. Đối chiếu tiêu chí hoàn thành

| Tiêu chí thiết kế | Task kiểm chứng |
|---|---|
| Một đề bài dùng chung cả năm hệ thống | 1, 2, 7, 10 |
| Giá ICA, cấp mới, VAT, Token, tặng 6 tháng chính xác | 1, 4, 9, 10 |
| Tự chạy theo kết quả thật | 3, 5, 6, 10 |
| Đúng hai điểm duyệt | 3, 8, 10 |
| Reload/restart và tiếp tục checkpoint | 2, 6, 10 |
| Sửa dữ liệu vô hiệu kết quả cũ, không ghi đè nhầm | 3, 7, 8 |
| Không gọi trùng; lỗi và chi phí rõ ràng | 5, 6, 10 |
| Xuất nội dung chữ và CSV, không gọi kịch bản là MP4 | 9, 10 |
| Không đăng/gửi/cấp dịch vụ ra ngoài | 4, 5, 10 |
| Phân biệt test mẫu và kiểm chứng AI thật | 5, 10 |

## 4. Thứ tự bàn giao

- A — Đề bài chung, preset ICA và lưu dữ liệu: tasks 1–2.
- B — Luồng năm hệ thống, hai điểm duyệt và checkpoint: tasks 3–4, 6 với provider giả.
- C — OpenRouter, giao diện thao tác và kho kết quả: tasks 5, 7–8.
- D — Xuất tệp, kiểm chứng đầy đủ và hướng dẫn sử dụng: tasks 9–10.

Bắt đầu A trước; worker có thể chạy với provider giả khi C chưa có key. Không coi bản mẫu là AI thật. Sau mỗi nhóm, ghi kết quả kiểm tra trước khi tiếp tục. Không đổi kiến trúc sang eve hay đưa Firebase vào đường chạy bắt buộc của lần sử dụng đầu tiên.