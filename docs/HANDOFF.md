# Bàn giao — 10X AI Digital Business

Cập nhật: **29/10/2026**, múi giờ **Asia/Ho_Chi_Minh**.

Đọc [CLAUDE.md](../CLAUDE.md) để biết hướng dẫn làm việc lâu dài. File này lưu trạng thái công việc; luôn đối chiếu với repository và dịch vụ thực tế khi bắt đầu phiên mới.

## 1. Đúng dự án và mốc Git

| Mục | Mốc bàn giao |
|---|---|
| Repository | `D:\GitHub\10X-AI-Digital-Business` |
| Ứng dụng | 10X Mission Control |
| Shortcut Desktop | 10X AI Digital Business |
| Nhánh | `feat/operations-performance-20261029` |
| Commit phần mềm gần nhất | `b4ad784` — `fix: diagnose errors and handle transient Windows file failures` |
| Commit chẩn đoán ban đầu | `78779a2` — người dùng đã lưu trong lúc triển khai |
| Commit vận hành/hiệu năng | `2227d99` — `feat: complete operational sync and portable backups` |

Các thay đổi tài liệu của lượt bàn giao này (`CLAUDE.md`, `docs/HANDOFF.md`) chưa được agent commit. Kiểm tra lại `git status`; không xóa chúng hoặc các thay đổi khác để khớp một mốc cũ. Không có push/merge remote do agent thực hiện trong đợt vừa qua.

Không nhầm với repository đầu tư cổ phiếu `D:\GitHub\dautucophieu` hoặc bản ứng dụng khác tại `D:\GitHub\mission-control-app`.

## 2. Công việc đã hoàn tất

### Workspace B — cập nhật mới nhất ngày 29/10/2026

- Người dùng chọn B và yêu cầu “làm luôn”. Đã áp dụng nền sáng, sidebar desktop, điều hướng mobile, trang tổng quan và cột thao tác bên phải nội dung. Bản thảo mở sẵn; nút duyệt đặt ở đầu cột thao tác. Giữ nguyên nghiệp vụ và dữ liệu.
- Baseline `f9fa76f`; thay đổi lượt này chưa commit. Xem [kế hoạch/kết quả Workspace B](plans/2026-10-29-workspace-b.md).
- Kiểm chứng trong phiên này: TypeScript và production build đạt; workflow 85/85; Chrome 20/20. Đã xem ảnh desktop, mobile390px và bảng ngân sách. Reviewer độc lập phát hiện hai lỗi hiển thị; cả hai đã có regression RED → GREEN.
- Web3220 và worker3230 báo đúng root/dataDir, workflow-health online. Hash state.json thật không đổi sau startup; dự án vẫn paused, không chủ động gọi AI tính phí. Launcher có bước xác minh CIM chậm trong môi trường này; web đã lên, worker được mở trực tiếp bằng entry point hiện có. Không sửa launcher.
- Chi tiết nhỏ còn lại: nút chuyển vùng Đề bài/Kết quả/Quản lý cuộn đến heading nhưng giữ focus bàn phím tại nút; skip link đầu trang chuyển focus vào main. Không còn finding Important chưa sửa.

### Vận hành và hiệu năng — nhóm 1 và 3

- Trạng thái đồng bộ, mất kết nối, lý do chờ/dừng và hướng xử lý.
- ETag/304, workspace projection, danh sách dự án dạng summary và lịch sử tải khi mở.
- Cập nhật thích ứng: chạy/chờ xử lý 1,5 giây; trạng thái nghỉ/chờ duyệt/tạm dừng 15 giây; hoàn tất 30 giây. Tab ẩn dừng đọc định kỳ; GET lỗi có backoff.
- Tải/nhập backup JSON, kiểm tra checksum/schema, giới hạn 32 MiB, bảo vệ ghi đè. Khôi phục thành dự án riêng tạm dừng, giữ bản gốc và không tự chạy AI.

### Chẩn đoán và sửa lỗi

- API500 và lỗi worker có mã đối chiếu UUID, thời điểm, thao tác, bước và project/job/system khi xác định được.
- Giao diện **Nhật ký lỗi & chẩn đoán** đọc theo yêu cầu; hiển thị 20 sự cố gần nhất. Kho `<dataDir>/.diagnostics` giữ tối đa 200 bản ghi kỹ thuật, không ghi key, nội dung dự án hay raw message/stack/path.
- Đã bắt được lỗi thực tế `EPERM` khi Windows đổi tên snapshot (`repository.commit`) và mở khóa (`repository.lock`).
- Bổ sung retry cho từng thao tác tệp an toàn trên Windows: tối đa 6 lần, tổng thời gian nghỉ 620 ms. Không lặp mutation, lệnh nghiệp vụ hoặc provider call; lỗi kéo dài vẫn trả lỗi có mã.
- Sửa context của lỗi tải model/đối chiếu usage và lỗi worker claim/recovery; ghi đúng job/system đã biết trước transaction.
- Sửa race khiến catalog backup kẹt “Đang tải” khi request đầu bị hủy lúc nạp dự án; kết quả request cũ không thay trạng thái request mới.

## 3. Bằng chứng kiểm chứng gần nhất

Kết quả của đợt triển khai phần mềm tại `b4ad784`, **không phải các test vừa chạy khi viết tài liệu này**:

| Kiểm tra | Kết quả |
|---|---|
| `npm.cmd run test:workflow` | 85/85 đạt |
| `npm.cmd run typecheck` | Đạt |
| `npm.cmd run build` | Đạt |
| `npm.cmd run test:e2e` | 18/18 Chrome đạt, 52,7 giây |
| Luồng Chrome từng gặp500 sau sửa rename | 10/10 lượt đạt |
| Stress duyệt cạnh tranh sau sửa lock-open | 8 lượt đạt |
| Giao diện nhật ký mobile | Đã xem ảnh 390px, đọc được và không tràn ngang |
| Dữ liệu thật | Hash state.json không đổi trước/sau triển khai |

Provider tests dùng mock, Chrome dùng sample/kho dữ liệu riêng. Không chủ động gọi AI tính phí. Hai phát hiện context của reviewer độc lập đã được sửa bằng regression test RED → GREEN; không còn finding mới chưa sửa của đợt này.

Lần kiểm chứng runtime cuối của đợt triển khai: web/worker đúng root và online, `/api/diagnostics` trả200. Trạng thái tiến trình có thể thay đổi sau khi tắt máy; không suy ra rằng dịch vụ vẫn đang chạy vào phiên sau.

## 4. Điểm còn biết và giới hạn

- Chưa xác định tiến trình/scanner hoặc điều kiện quyền Windows nào gây EPERM. Đã xác nhận hai điểm lỗi thực tế, nhưng log lịch sử không đủ để chứng minh tuyệt đối lần lỗi cũ có cùng nguyên nhân.
- Một lượt Chrome trước sửa có request duyệt còn pending khi hết hạn, chưa có phản hồi500; không đánh đồng bằng chứng này với lỗi EPERM đã bắt sau đó.
- Cơ chế cleanup/recovery khóa cũ không được mở rộng trong đợt này; lỗi cleanup tiếp theo có thể che lỗi filesystem trước đó. Nếu tái diễn, giữ mã/bằng chứng và điều tra riêng, không tự xóa khóa.
- Log không hồi tố sự cố trước khi tính năng được thêm. Nếu không ghi được log, phản hồi vẫn giữ lỗi gốc và báo chưa lưu được nhật ký.
- Backup tự động cùng ổ không bảo vệ khi ổ máy hỏng. Tệp tải xuống cần được người dùng giữ thêm ở nơi khác; chưa có cloud backup tự động.

Bằng chứng thử nghiệm được giữ trong `.local/diagnostics-evidence/`, bị Git ignore. Chỉ đọc theo nhu cầu điều tra, không đưa toàn bộ trace/log vào Git hoặc công cụ bên ngoài.

## 5. Tiếp tục phiên sau

1. Đọc `CLAUDE.md`, file bàn giao này và yêu cầu mới nhất của người dùng.
2. Xác minh đúng repository, nhánh, commit và các thay đổi chưa commit. Giữ nguyên công việc của người dùng.
3. Đọc tài liệu/source liên quan đúng nhiệm vụ; không cần đọc mọi log hoặc chạy lại toàn bộ suite chỉ để lấy bối cảnh.
4. Khi cần chạy ứng dụng, dùng shortcut hoặc launcher đúng cổng. Chỉ restart sau kiểm tra danh tính dịch vụ và tác vụ đang chạy.
5. Trước sửa mã, chốt phạm vi từ yêu cầu đã được giao; sau sửa chạy kiểm tra phù hợp. Ghi lại kết quả thực tế và giới hạn còn lại.

```powershell
Set-Location -LiteralPath 'D:\GitHub\10X-AI-Digital-Business'
git status --short
git branch --show-current
git log -3 --oneline
```

Web: `http://127.0.0.1:3220`; worker: `http://127.0.0.1:3230/health`. Launcher:

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\start-local.ps1 -WebPort 3220 -WorkerPort 3230
```

Không tác động dịch vụ bản khác ở3200/3210. E2E dùng3201/3211 với dữ liệu riêng. Không gọi AI có phí ngoài phạm vi người dùng đã giao, không đưa env/key/dữ liệu thật vào Git.

## 6. Nhiệm vụ tiếp theo

**Cập nhật ngày 29/10/2026:** đã triển khai **B — Workspace sáng** theo yêu cầu “làm luôn”, kiểm chứng và mở ứng dụng local. Chưa có nhiệm vụ tính năng mới tiếp theo. Bản phác thảo và quyết định nằm tại [hướng giao diện](design/2026-10-29-interface-directions/README.md).

Đề xuất đã trao đổi, **chưa duyệt triển khai**: đánh giá chất lượng đầu ra AI từ một dự án thực tế và nội dung đã có, ưu tiên **Sản phẩm Win** và **Chuyển đổi**. Tiêu chí gợi ý: đúng đầu vào, không bịa thông số/giá, đủ nội dung, nhất quán và có thể sử dụng.

Không tự thay prompt, chọn dự án thực tế thay người dùng hoặc gọi model tính phí chỉ vì đọc thấy đề xuất này. Khi người dùng giao việc tiếp, tiếp tục theo phạm vi được giao.

## 7. Tài liệu tham chiếu và cập nhật

- [README](../README.md): vận hành và cách dùng.
- [Nhật ký vận hành/hiệu năng](operations-performance-progress.md).
- [Nhật ký điều tra lỗi](error-diagnostics-progress.md): bằng chứng, review, bản sửa và giới hạn.
- [Kế hoạch chẩn đoán lỗi](plans/2026-10-29-error-diagnostics.md).

Cuối phiên, cập nhật ngày, commit, trạng thái Git, việc hoàn tất, kết quả test, vấn đề còn lại và việc đã được giao. Giữ quy tắc lâu dài ở `CLAUDE.md`; giữ trạng thái hiện tại ở file này để tránh hai bản bàn giao mâu thuẫn. Không chép toàn bộ hội thoại hoặc bí mật vào tài liệu.

Câu giao việc gợi ý: **“Đọc CLAUDE.md và docs/HANDOFF.md, kiểm tra repository rồi tiếp tục nhiệm vụ tôi giao.”**
