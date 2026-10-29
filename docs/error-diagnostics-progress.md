# Nhật ký triển khai chẩn đoán lỗi

Ngày: 29/10/2026. Dự án: `D:\GitHub\10X-AI-Digital-Business`.
Baseline: `2227d99`; tiếp tục nhánh local `feat/operations-performance-20261029`, không push.

**Trạng thái: hoàn tất.** Sau sửa review:85/85 unit,18/18 Chrome (52,7s), TypeScript và production build đạt.

## Đã thực hiện

- Bổ sung nhật ký lỗi API500 và worker: UUID đối chiếu, thời điểm UTC, mã lỗi, thao tác, bước, project/job/system nếu biết, PID và errno/syscall nằm trong danh sách cho phép.
- JSON lỗi HTTP có `diagnostic` và header `X-Diagnostic-Id`; thông báo chứa mã, thời điểm và bước. Worker giữ reference trong workflow.error khi tác vụ thất bại. Lỗi heartbeat và worker poll được ghi riêng.
- Bước theo dõi: repository.read/lock/write/commit/release, backup.capture, provider.prepare/generate, worker.complete/recover/claim.
- Nguyên nhân hệ thống nằm trong lỗi CORRUPT đã được làm sạch vẫn có thể được phân loại bằng cause. Không ghi raw message, stack, path, request body, prompt, key, env hoặc nội dung dự án.
- Lưu từng bản ghi JSON trong `<dataDir>/.diagnostics`, giữ tối đa 200 bản; API local readonly trả 20 bản gần nhất. Giao diện tải khi mở hoặc bấm tải lại, không polling.
- Logger hỏng không thay thế lỗi gốc; response báo chưa ghi được nhật ký. Các lỗi400/403/409 dự kiến không bị ghi như sự cố500.

## Kiểm chứng hiện tại

- Test mới thiếu module (RED) → logger/HTTP 3/3 GREEN.
- Test worker chưa có bản ghi (RED 2/3) → instrumentation 3/3 GREEN.
- Fault injection ở fs.rename thật: EPERM trước commit trả FS_EPERM/repository.commit, snapshot cũ giữ nguyên; chủ động gửi lại cùng requestId chỉ có một job.
- Fault injection ở fs.unlink(write.lock): snapshot đã commit nhưng release trả500/repository.release; cùng requestId được đối chiếu lại mà không tạo job thứ hai.
- Test concurrent approvals + history reads + catalog scans: chỉ200/409, không500; trạng thái và nhật ký đúng.
- Test checksum-context: lỗi wrapper CORRUPT với cause ENOSPC được phân loại FS_ENOSPC, không lộ message bí mật.
- Toàn bộ nghiệp vụ trước test cause: 78/78; test cause riêng4/4; TypeScript đạt. Production build đạt.
- Chrome đang lặp10 lần luồng từng xuất hiện500, kho/cổng riêng3201/3211.

## Điều tra lỗi cũ

Lần lỗi trước bị catch thành thông báo500 chung và không ghi errno/stack/step. Không thể suy ngược nguyên nhân chắc chắn từ thông báo đó.

Hai đường lỗi filesystem đã được tái hiện có kiểm soát, cho thấy500 có thể xảy ra cả trước lẫn sau commit. Đây là bằng chứng về khả năng phân biệt của hệ thống mới, chưa phải bằng chứng rằng một trong hai là nguyên nhân lịch sử. Không tự động retry lệnh hoặc gọi AI để che lỗi.

## Quyết định

- Ruling: giữ đường dẫn/nhánh hiện có thay vì thêm worktree — shortcut và dữ liệu local gắn với đường dẫn; cần kiểm tra root/PID/cổng trước cập nhật dịch vụ.
- Ruling: chỉ lưu trường kỹ thuật được cho phép, không giữ message/stack thô — giảm nguy cơ ghi nội dung/key; lỗi INTERNAL_ERROR chưa phân loại có thể cần tái hiện thêm.
- Ruling: ghi nhật ký và review trực tiếp vì script helper thiếu dependency subagent-driven-development — không có báo cáo helper tự sinh; bằng chứng lệnh/test được lưu ở đây.

## Bàn giao

Đã hoàn tất luồng Chrome nhật ký, toàn bộ suite sau thay đổi, review độc lập và xác nhận local/data hash.


## Bằng chứng điều tra thực tế và sửa

- Lặp Chrome10 lần trước sửa:9 đạt,1 request duyệt còn pending khi test hết hạn (trace status -1), không phải phản hồi500. Trace giữ tại `.local/diagnostics-evidence/pending-approval-repeat4.zip`.
- Lượt focused kế tiếp bắt được500 thực: `FS_EPERM`, syscall rename, `repository.commit`, workflow.command/runStep hệ thống2; mã đối chiếu `b4994091-829a-47e8-8184-ab87ee528d33`. Trace và JSON sự cố giữ tại `.local/diagnostics-evidence/confirmed-eperm-*`, không commit.
- Sau sửa rename:10/10 lượt Chrome đạt (2,3 phút).
- Stress cạnh tranh bổ sung bắt EPERM/open tại `repository.lock`, approve hệ thống1; mã `0cefb4dd-5d17-411a-a251-98531f7ff97c`. Fixture đã được dọn tự động; dữ liệu chẩn đoán được giữ trong kết quả lệnh và mô tả này.
- Regression lock-open đã RED500 thay200 → GREEN sau sửa. Helper retry Windows chỉ áp dụng từng open(wx)/rename an toàn; tối đa6 lần, tổng thời gian nghỉ620ms. Giữ lock và cùng file tạm khi chốt; không copy/unlink đích, không lặp mutation hoặc provider call. Lỗi vĩnh viễn vẫn trả lỗi có mã.
- Regression approval context RED thiếu systemId → GREEN; lệnh không có systemId lấy từ snapshot workflow/artifact. Hai thao tác recordUsage/setSampleMode nằm trong allowlist.
- Ruling: bổ sung retry filesystem có giới hạn vì đã bắt được EPERM thực ở rename/open — giải quyết lỗi tạm thời mà không gửi lại nghiệp vụ; lỗi quyền kéo dài vẫn thất bại sau620ms và cần người dùng xử lý quyền/ổ đĩa.
- Giới hạn kết luận: đã xác nhận hai điểm EPERM gây500 trong môi trường này. Chưa xác định tiến trình đọc/scanner/quyền Windows nào gây từ chối; lỗi lịch sử không có log để chứng minh tuyệt đối là cùng nguyên nhân.


## Lỗi loading phụ phát hiện khi kiểm tra toàn bộ

- Full Chrome16/17: catalog backup đôi lúc còn Đang tải. Đã tái hiện riêng bằng request đầu bị hủy khi project được nạp (RED).
- Nguyên nhân xác nhận: boolean readPending còn true trong effect mới, nên lần đọc mới bị bỏ qua; finally của request cũ không tắt loading khi aborted. Chuyển sang token cho từng request, giải phóng token khi cleanup; kết quả/finally cũ không thay trạng thái request mới. Không thêm retry mutation.
- Ruling: sửa race đọc catalog trong đợt này — đã có regression tái hiện lỗi loading thật khi xác minh; thay đổi giới hạn ở quản lý request readonly, đổi lại thêm một regression Chrome ngoài phần logger.


## Review cuối và một lượt sửa

- Reviewer độc lập rà soát toàn thay đổi từ2227d99, gồm phần user đã lưu tại78779a2 và phần chưa commit; không sửa file, không đọc env/data thật, không gọi provider.
- Hai finding mức medium: context lệnh bị mất khi service reject ngoài diagnosticStep; worker claim/recovery thiếu project/job/system trước transaction.
- Final: fixed context service — `command service rejection preserves command system and provider step` RED thiếu command → GREEN; context giờ giữ cả lỗi sync/async, catalog/usage có step riêng.
- Final: fixed claim/recovery — `claim and recovery commit failures retain known project job and system without calling provider` RED thiếu project → GREEN; context cập nhật theo job thực tế trước commit, provider chưa bị gọi.
- Sau sửa85/85 unit, TypeScript đạt. Chrome trước sửa review18/18; build cuối đạt và Chrome sau sửa18/18.
- Không có minor mới trì hoãn. Những mục retry/paid call/redaction/retention/API/token đã được reviewer kiểm tra và không phát hiện lỗi mới.
- Final Ruling: không mở rộng sửa cơ chế cleanup/recovery cũ chỉ vì reviewer lưu ý tồn tại trước đợt này — giữ phạm vi và không thay đổi quyền sở hữu khóa; một lỗi cleanup tiếp theo vẫn có thể che lỗi filesystem trước đó, cần điều tra riêng nếu xảy ra.


## Xác nhận bản chạy cuối

- Web3220 và worker3230 đã được restart đúng root/dataDir/PID/listener sau kiểm tra không có running/queued/uncertain jobs. Dịch vụ bản khác3200/3210 không bị dừng.
- HTTP `/api/diagnostics` thực tế trả200; workflow-health online; root web/worker khớp dự án. Hash state.json thật giữ nguyên từ đầu đến sau startup.
- Không có API AI tính phí được chủ động gọi. Provider tests dùng mock, Chrome dùng dữ liệu riêng3201/3211. Không push/merge remote, không ghi env/key vào Git.
- Ảnh `diagnostics-mobile.png` đã được xem: đọc được code/time/step/reference, không tràn ngang390px.
- Sau final review chỉ một lượt sửa hai context gaps, mỗi finding có test RED→GREEN, toàn suite85/85 và Chrome18/18. Không cần rereview; không còn finding mới chưa sửa. Các giới hạn baseline và quyết định giữ phạm vi được ghi ở trên.
- Người dùng lưu bản đang nhập rồi refresh Chrome và mở **Nhật ký lỗi & chẩn đoán**. Log chỉ có sự cố từ bản cập nhật này, không hồi tố lỗi cũ.
