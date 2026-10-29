# Nhóm 1 và 3 — nhật ký triển khai

Ngày: 29/10/2026. Dự án: `D:\GitHub\10X-AI-Digital-Business`.
Nhánh: `feat/operations-performance-20261029`. Baseline: `e56e6e9`; phần đọc dữ liệu ban đầu đã được lưu tại `350d21a` trong lúc thực hiện.

## Phạm vi

- Trạng thái đồng bộ, mất kết nối, lý do chờ/dừng và hướng xử lý.
- ETag từ metadata; projection workspace/summary; lịch sử tải riêng khi mở.
- Poll thích ứng 1,5/15/30 giây; tạm ngừng tab ẩn; GET backoff; worker health thích ứng và catalog backup không tải khi tab ẩn.
- Download/import backup JSON, checksum trước schema defaults, tối đa 32 MiB, từ chối trùng ID khác nội dung, idempotent cùng requestId. Khôi phục bản riêng paused qua cơ chế hiện có; không tự chạy AI.

## Tiến độ và bằng chứng

- Task 1: baseline/nhánh/ignore xác nhận; hash state.json được giữ ngoài repo đích để đối chiếu. Không sửa dữ liệu thật.
- Task 2: test ETag/projection/history/access/race đã RED → GREEN (5 kiểm thử bao gồm cadence và attention).
- Task 3: giao diện đã nối; TypeScript đạt. Sửa lỗi script đọc UTF-8/anchor trước khi hoàn tất; không coi typecheck của lần script thất bại là triển khai thành công.
- Task 4: test mới thiếu module (RED), sau triển khai 2/2 GREEN; toàn bộ nghiệp vụ 69/69. Kiểm tra import sang kho trống, idempotency, chống ghi đè, schema/checksum, origin và streaming quá giới hạn.
- Task 5: production build đạt. Lần Chrome đầu 9/16: 7 lỗi từ assertion role status chung, mock không bắt query mới, kỳ vọng polling cũ. Đã sửa test có phạm vi cụ thể và manual GET khi kiểm tra conflict. Hai test mới offline/visibility/backup file đều đạt. Lần tiếp theo 16/16 đạt; xem kết quả cuối bên dưới.

## Quyết định

- Ruling: giữ thư mục hiện có trên nhánh riêng thay vì thêm worktree — shortcut và dữ liệu cá nhân gắn với đường dẫn này; đổi lại cần kiểm tra tiến trình đúng root trước cập nhật local.
- Ruling: sao lưu ngoài thư mục bằng tệp tải xuống do người dùng chọn nơi lưu — không mặc định gửi nội dung dự án lên cloud; đổi lại cần tự giữ thêm tệp trên ổ khác.
- Ruling: giữ worker job scheduling và định dạng lưu hiện tại — giảm tải bằng conditional reads/projection phía web, không đổi cơ chế thực thi AI trong đợt này; worker idle vẫn dùng chu kỳ hiện có.
- Ruling: script review-package và thư mục subagent-driven-development mà task-start/task-done phụ thuộc không có trong skills cài đặt — lưu nhật ký/tổng diff và review trực tiếp thay thế; đổi lại không có báo cáo tự sinh từ các script đó.

## Giới hạn

Checksum không xác thực nguồn tệp. Không nhập tệp từ nguồn không tin cậy. LocalAccess vẫn yêu cầu host/origin local cho mutation. Backup không gồm env/key cấu hình, nhưng có toàn bộ nội dung dự án đã lưu.

Chưa bổ sung cloud sync, backup khi máy tắt, database index hoặc đổi hệ lưu JSON. Chưa sửa prompt/model hay chủ động gửi OpenRouter. Các test provider dùng mock HTTP; E2E dùng kho riêng và cổng 3201/3211.

## Rà soát cuối

Đã review độc lập toàn bộ thay đổi; hai P2 đã sửa bằng regression tests. Không còn finding chưa xử lý.


### Kết quả review và sửa một lượt

- Reviewer độc lập: 2 phát hiện P2, không có mục từ chối đánh giá hoặc minor trì hoãn.
- Final: fixed hướng dẫn attention khi paid call đang chạy và job mẫu gián đoạn — test `attention waits for active paid calls and gives sample-specific recovery instructions` RED (5/6) → GREEN.
- Final: fixed kích thước envelope sau normalize defaults — test `normalized legacy backup exceeding storage limit is rejected before writing` RED (500 thay vì 400) → GREEN; kiểm tra cả raw và normalized trước ghi.
- Chrome trước sửa review: 16/16 đạt (50,1s). Có một lượt trước đó 15/16 do generic500 khi duyệt; chạy riêng rồi toàn bộ lại đều đạt, chưa xác định nguyên nhân và không có bằng chứng do history readonly. Không che lỗi bằng retry command hoặc retry test tự động.
- Bộ cuối sau sửa: nghiệp vụ 71/71, TypeScript đạt, production build đạt, Chrome 16/16 (48,8s). Visual QA ảnh backup mobile 390px không tràn ngang.


## Hoàn tất

- Task 1–5 complete; giữ nhánh riêng, không merge/push remote. Source nền ở `350d21a`; commit tiếp theo chứa phần hoàn thiện UI, portable backup, test và nhật ký này.
- Rà soát độc lập chỉ đọc, không xem env/data thật, không gọi provider tính phí. Không có deferred minors hoặc declined judgments.
- Web 3220 trước cập nhật còn PID cũ từ 06:19; launcher đúng thiết kế dùng lại tiến trình. Đã xác minh root/dataDir/PID/commandline/loopback listener, kiểm tra dự án paused và không có active jobs, dừng duy nhất web đó và khởi động lại build cuối. Không dừng bản khác ở 3200/3210; worker 3230 được giữ hoặc khởi động qua launcher.
- HTTP thực tế 3220: workspace 200, có ETag; request cùng ETag trả 304; workflow-health online, worker version 4, đúng root. Hash của state.json thật không đổi trước/sau toàn bộ công việc và startup. Không chủ động chạy AI.
- Người dùng lưu bản nháp rồi refresh Chrome để nhận giao diện mới. Shortcut Desktop hiện có tiếp tục dùng 3220/3230.
- Known observation: một generic500 từng xuất hiện khi duyệt trong test, chưa tái hiện ở focused run và hai lượt suite đầy đủ sau đó. Giữ bằng chứng trong nhật ký; chưa khẳng định nguyên nhân hoặc thêm retry command tự động.
