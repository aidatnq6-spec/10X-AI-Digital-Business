# CLAUDE.md — 10X AI Digital Business

Hướng dẫn làm việc và bàn giao cho các phiên sau. Chỉ dẫn hiện tại của người dùng và các chỉ dẫn có mức ưu tiên cao hơn luôn được ưu tiên. Kiểm tra repository thực tế trước khi dựa vào trạng thái bàn giao ở cuối file.

## 1. Nhận diện đúng dự án

- Repository: `D:\GitHub\10X-AI-Digital-Business`.
- Tên ứng dụng: **10X Mission Control**; shortcut Desktop: **10X AI Digital Business**.
- Đây là ứng dụng hỗ trợ quy trình kinh doanh bằng AI, gồm 5 hệ thống: Sản phẩm Win, Kênh Video AI, Chuyển đổi, Giao hàng & CSKH, Quản trị; có hai điểm duyệt nội dung.
- Không nhầm với `D:\GitHub\dautucophieu` hoặc bản ứng dụng khác tại `D:\GitHub\mission-control-app`.
- Trước khi sửa, kiểm tra đường dẫn, nhánh, `git status` và các hướng dẫn repository đang áp dụng. Không ghi đè thay đổi của người dùng; người dùng có thể commit bằng công cụ khác ngay trong phiên.

## 2. Kiến trúc đang dùng

- Next.js 15, React 19, TypeScript, Tailwind CSS 4, Radix/shadcn UI, Lucide.
- Dữ liệu dự án lưu local JSON: `.local/projects/<projectId>/state.json`.
- Worker Node.js/TypeScript thực thi công việc theo checkpoint; hỗ trợ chạy từng bước, cả chuỗi và tạo lại một nội dung.
- OpenRouter được gọi phía server. Có chế độ mẫu để kiểm tra quy trình mà không phát sinh phí AI.
- Repository dùng revision, khóa ghi và ghi snapshot qua tệp tạm rồi đổi tên; giữ lịch sử và receipt để đối chiếu requestId.
- Frontend dùng workspace projection/summary, ETag và tải lịch sử khi mở. Projection chỉ phục vụ đọc, không thay thế snapshot đầy đủ phía server.

Các vị trí chính:

| Phần | Đường dẫn |
|---|---|
| Giao diện | `src/components/` |
| API | `src/app/api/` |
| Repository, schema, backup | `src/lib/projects/` |
| State machine, lệnh, worker | `src/lib/workflow/` |
| Provider, hợp đồng đầu ra, hạn mức | `src/lib/ai/` |
| Chẩn đoán lỗi | `src/lib/diagnostics/` |
| Worker entry point | `scripts/worker.ts` |
| Launcher Windows | `start-local.ps1` |
| Kiểm thử | `tests/*.test.ts`, `tests/e2e/` |

## 3. Cách phối hợp và giao việc

- Giao tiếp bằng tiếng Việt, nêu kết quả chính và giải thích ngắn gọn bằng ngôn ngữ dễ hiểu.
- Với việc đã được giao rõ, chủ động làm đến khi hoàn thành; không dừng chỉ để hỏi lại những lựa chọn đã được chốt.
- Trước sửa mã, đọc phần liên quan và xác định kết quả cần đạt. Với việc nhiều bước, lưu kế hoạch trong `docs/plans/`.
- Chia thay đổi thành nhiệm vụ có phạm vi và điều kiện hoàn tất rõ ràng. Nếu dùng agent theo yêu cầu hoặc quy trình áp dụng, giao phạm vi cụ thể, tránh nhiều agent cùng sửa một file.
- Cập nhật ngắn gọn trong quá trình làm; báo rõ bằng chứng, điều chưa chắc chắn và bước đang kiểm tra.
- Khi sửa lỗi, cố gắng tái hiện và viết regression test trước; không coi một lần chạy lại đạt là đã tìm được nguyên nhân.
- Không tự mở rộng sang tính năng khác hoặc đổi kiến trúc. Quyết định phát sinh và giới hạn quan trọng cần ghi trong nhật ký triển khai.
- Bàn giao gồm: đã đổi gì, vì sao, cách dùng, đã kiểm tra gì, giới hạn còn lại và commit liên quan nếu có.

## 4. Bảo vệ dữ liệu, chi phí và tác vụ

- Không đọc/in API key, không đưa `.env.local`, `.local/`, dữ liệu cá nhân hoặc nội dung log riêng vào Git.
- Không tự gọi AI tính phí để kiểm thử khi chưa được người dùng giao phạm vi đó. Dùng sample provider hoặc mock HTTP; nếu đã được phép gọi thật, tuân thủ hạn mức đã thống nhất.
- Không tự gửi, xuất bản nội dung, push hoặc merge lên remote ngoài phạm vi đã được giao.
- Giữ nguyên bản nháp chưa lưu khi đồng bộ hoặc khi lỗi. Không dùng retry mutation để che lỗi mạng hoặc lỗi 500.
- Giữ requestId/receipt, lịch sử phiên bản và chi phí đã biết. Lượt AI chưa rõ kết quả/chi phí phải được đối chiếu; không tự gửi lại hoặc coi phí bằng 0.
- Không xóa khóa theo tuổi khóa hay tự xóa snapshot hỏng. Giữ bằng chứng và dùng cơ chế phục hồi hiện có.
- Backup nhập từ JSON phải qua checksum/schema và giới hạn dung lượng; khôi phục thành dự án riêng ở trạng thái tạm dừng, giữ bản gốc và không tự chạy AI.

## 5. Chạy phần mềm trên Windows

- Web chính: `http://127.0.0.1:3220`.
- Worker chính: `http://127.0.0.1:3230/health`.
- Dùng shortcut Desktop hiện có hoặc chạy trong đúng repository:

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\start-local.ps1 -WebPort 3220 -WorkerPort 3230
```

Thêm `-NoBrowser` để không mở thêm Chrome. Đóng Chrome không dừng worker. Trước restart, kiểm tra trạng thái tác vụ và xác minh root, dataDir, PID, command line và listener đúng dịch vụ. Không dừng tiến trình chỉ vì trùng tên hoặc có giao diện tương tự.

Không tác động bản khác ở cổng 3200/3210. Cổng kiểm thử là 3201/3211 và dùng kho dữ liệu riêng do Playwright cấu hình. Không thay dữ liệu thật bằng fixture thử nghiệm.

## 6. Kiểm chứng thay đổi

Dùng `npm.cmd` trên PowerShell để tránh nhầm với `npm.ps1`. Chạy các kiểm tra phù hợp phạm vi:

```powershell
npm.cmd run typecheck
npm.cmd run test:workflow
npm.cmd run build
npm.cmd run test:e2e
```

- E2E dùng Chrome và bản production; build trước khi chạy. Không dựng lại `.next` dưới một server production đang dùng nó; cập nhật dịch vụ có kiểm soát sau xác minh danh tính và tác vụ đang chạy.
- Chỉ sửa tài liệu: kiểm tra nội dung, đường dẫn và diff; không cần chạy toàn bộ bộ kiểm thử.
- Sau khi các kiểm tra phù hợp đạt, không lặp rộng hơn nếu không có thay đổi, lỗi hoặc nghi vấn mới.
- Không tuyên bố test đạt nếu chưa đọc kết quả. Phân biệt rõ test dùng mock, test mẫu và kiểm chứng dữ liệu/dịch vụ thật.

## 7. Chẩn đoán lỗi hiện có

- Lỗi 500 có mã lỗi, thời điểm UTC, bước thất bại và UUID đối chiếu; HTTP có header `X-Diagnostic-Id`.
- Mở **Nhật ký lỗi & chẩn đoán** trên giao diện để xem 20 sự cố gần nhất. Log nằm tại `<dataDir>/.diagnostics`, giữ tối đa 200 bản ghi; không hồi tố lỗi trước khi tính năng được thêm.
- Log chỉ ghi trường kỹ thuật cho phép; không bổ sung message/stack/path thô, request body, prompt hoặc key mà chưa cân nhắc lại thiết kế bảo vệ dữ liệu.
- Đã bắt được EPERM thực tế khi Windows mở tệp khóa và đổi tên snapshot. Helper filesystem thử tối đa 6 lần, nghỉ 20/40/80/160/320 ms; chỉ lặp thao tác tệp an toàn, không lặp mutation hay provider call.
- Nếu lỗi vẫn xảy ra, giữ mã đối chiếu và kiểm tra bước: `repository.lock`, `repository.commit`, `repository.release`, `provider.*`, `worker.*`.
- Lỗi release có thể xảy ra sau khi dữ liệu đã lưu; đối chiếu snapshot/receipt trước thao tác tiếp. Cơ chế cleanup/recovery cũ chưa được mở rộng; lỗi cleanup có thể che lỗi trước đó.

## 8. Đọc trạng thái bàn giao

Đọc [docs/HANDOFF.md](docs/HANDOFF.md) để biết công việc đã hoàn tất, commit gần nhất, kết quả kiểm chứng, giới hạn còn lại và nhiệm vụ tiếp theo đã được giao.

Trạng thái dịch vụ và Git có thể thay đổi sau mỗi phiên. Luôn xác minh lại trước khi tiếp tục; không coi kết quả test cũ là bằng chứng cho thay đổi mới. Không tự triển khai đề xuất chưa được người dùng giao.

## 9. Cập nhật tài liệu

Giữ hướng dẫn lâu dài trong file này; cuối mỗi đợt công việc cập nhật trạng thái ở `docs/HANDOFF.md`. Bằng chứng điều tra chi tiết để trong tài liệu tương ứng dưới `docs/`. Không lưu hai bản bàn giao trùng nhau, chép toàn bộ hội thoại hoặc ghi bí mật vào tài liệu.

Câu giao việc cho phiên sau: **“Đọc CLAUDE.md và docs/HANDOFF.md, kiểm tra repository rồi tiếp tục nhiệm vụ tôi giao.”**
