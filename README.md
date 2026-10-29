# 10X Mission Control

Ứng dụng cá nhân dùng Next.js 15, React 19, Tailwind CSS 4, Radix/shadcn và Lucide. OpenRouter được gọi phía máy chủ; Firebase chưa bắt buộc cho bản chạy local.

## Mốc C đã triển khai — OpenRouter trong quy trình chung

- Điền `OPENROUTER_API_KEY` trong **`D:\GitHub\10X-AI-Digital-Business\.env.local`**. Giữ file hiện có, chỉ sửa giá trị biến; không sao chép `.env.example` đè lên file chứa key. Key không được đưa vào trình duyệt, snapshot hay log.
- Lưu đề bài, mở **Kết nối OpenRouter · model & hạn mức**, bấm tải model/giá và kiểm tra lại key. Chỉ danh sách model hỗ trợ structured JSON, có giá token xác định và phù hợp chế độ text được đưa ra lựa chọn.
- Chọn model, số lần gọi tối đa, ngân sách dự toán USD, token đầu vào/đầu ra; đánh dấu đồng ý chi phí rồi bấm **Lưu cấu hình AI thật**. Chỉ lưu cấu hình chưa gọi sinh nội dung.
- Bấm **Bắt đầu AI thật (có thể tính phí)**, hoặc **Tiếp tục từ checkpoint** nếu chuyển từ chuỗi mẫu đã chạy. Chuyển chế độ làm cũ đầu ra mẫu và duyệt cũ, không gắn lại nhãn mẫu thành AI. Luồng vẫn giữ đúng hai điểm duyệt.

Worker dùng OpenRouter cho từng job có snapshot cấu hình; mẫu vẫn dùng provider mẫu. Mỗi request có giới hạn output, cấu hình provider yêu cầu đúng tham số/JSON và giá trần mỗi triệu token. Dự phòng đầu vào dùng byte UTF-8 cộng phần dư bảo thủ, không phải phép đếm tokenizer chính xác. Ngân sách ứng dụng là **giới hạn dự toán**, không thay thế trần thanh toán của nhà cung cấp; đặt thêm hạn mức key trên OpenRouter nếu cần trần tài khoản.

Không tự retry khi lỗi mạng, timeout hoặc không rõ request đã được nhận. Provider ID và usage được lưu cả khi nội dung không dùng được. Nếu không rõ chi phí, chặn lượt tiếp theo: thử **Đối chiếu chi phí từ OpenRouter**, hoặc tra Activity rồi nhập số đã kiểm tra. Số do người dùng nhập được gắn nhãn riêng (estimated), không mạo nhận là phí provider báo. Khi kết quả request chưa rõ, còn cần bấm cho phép thử lại sau đối chiếu; thao tác đối chiếu tiền không tự sinh lại nội dung.

Model chỉ soạn phần nội dung; tên thành phẩm, bảng giá/điều kiện và CTA liên hệ được ứng dụng chèn từ đề bài. Không chấp nhận giá hay liên hệ tự bịa trong phần model trả về. Nội dung AI vẫn là bản nháp, cần chủ ứng dụng xác minh các khẳng định quan trọng tại hai điểm duyệt.

API `/api/generate` cũ trả 410 và nút gọi rời đã được bỏ, để mọi lượt sinh dùng chung hạn mức/jobs/duyệt. API options chỉ trả trạng thái có key và model/giá; không trả key. Khi sửa key trong `.env.local`, bấm kiểm tra lại; worker đọc cấu hình key phía server cho từng job.

Kiểm thử OpenRouter dùng HTTP giả để kiểm tra request thật, đủ 5 bước, usage, timeout, lỗi schema và ngân sách mà không chi tiền. Danh sách model công khai đã kiểm tra trực tiếp. Chỉ nghiệm thu chất lượng AI thật sau lượt chạy do chủ ứng dụng chọn model/hạn mức và chủ động bắt đầu.

## Mốc B đã triển khai — quy trình mẫu

1. Lưu đề bài tại Sản phẩm Win, rồi bấm **Bắt đầu chuỗi mẫu**.
2. Worker tạo bộ chào bán và dừng ở **Điểm duyệt 1**. Xem/sửa nội dung, rồi bấm **Duyệt 1 và tiếp tục**.
3. Tự tạo 4 kịch bản và bộ chuyển đổi (4 bài, 1 trang chữ, 3 email), dừng ở **Điểm duyệt 2** để duyệt chung. Nếu thiếu liên hệ, bổ sung vào đề bài hoặc chủ động chọn **Dùng CTA chung, bỏ chỗ thiếu liên hệ**.
4. Sau duyệt 2, tự tạo checklist, mẫu xác nhận, 10 FAQ, quy tắc chuyển người xử lý và khung quản trị. Không có điểm duyệt nghiệp vụ thứ ba.

**Đây là nội dung mẫu xác định sẵn để kiểm tra quy trình, chưa phải AI thật.** Worker không đọc OpenRouter key và không gọi provider có phí. Không có bài đăng, email, thanh toán hay nghiệp vụ cấp chữ ký số nào được thực hiện. Mốc C đã nối OpenRouter; chọn cấu hình và bắt đầu AI thật để dùng provider thật.

Launcher Desktop khởi động cả web server (3220) và worker (3230) ở chế độ ẩn, xác minh đúng thư mục/PID trước khi sử dụng lại. Đóng trình duyệt không dừng worker. Dữ liệu công việc, đầu vào, phiên bản và quyết định duyệt được lưu trong snapshot dự án. Khi tắt máy thì không xử lý; mở lại lối tắt để tiếp tục.

**Tạm dừng sau bước hiện tại** chặn bước kế tiếp, vẫn cho tác vụ đang chạy lưu checkpoint. **Tiếp tục từ checkpoint** giữ các phần hiện hành và chỉ tạo phần còn thiếu/lỗi thời. Công việc bị gián đoạn sau dispatch chuyển sang trạng thái cần đối chiếu, không tự gửi lại; bản mẫu có nút cho phép chạy lại bước mẫu.

Sửa đề bài làm cũ các kết quả phụ thuộc và yêu cầu tiếp tục chủ động. Sửa một bài chuyển đổi giữ các bài còn lại, bỏ duyệt 2 và làm cũ phần CSKH/quản trị. Sửa video cũng làm cũ phần chuyển đổi vì phần đó đã dùng video làm đầu vào. Mọi bản cũ được giữ trong lịch sử. Hai cửa sổ cùng sửa phải đối chiếu; editor vẫn giữ và hiển thị bản đang nhập khi phiên bản gốc đã đổi. Không cho đổi dự án khi có bản sửa nội dung chưa lưu.

Giao diện tự theo bước đang chạy khi phù hợp; thao tác xem tab khác hoặc bản sửa chưa lưu sẽ ngăn tự điều hướng. Dùng **Quay về bước đang chạy** để theo dõi tiếp. Các kết quả chữ có thể xem, sửa và tải TXT theo từng thành phẩm hoặc cả bộ; mẫu quản trị được tải dưới dạng CSV UTF-8 kèm TXT hướng dẫn.

Chạy worker riêng khi phát triển: `npm run worker`. Không mở worker thứ hai cùng cổng. Kiểm thử trình duyệt dùng worker/kho riêng (3201/3211); kiểm thử restart khởi động worker thật với dữ liệu tạm.

## Mốc A đã triển khai

- Nhập một đề bài tại **Sản phẩm Win**: ngách, khách hàng, sản phẩm và nhiều gói giá.
- **Điền mẫu ICA** giữ đúng giá cấp mới: 1.792.800 / 2.690.000 / 3.080.000 VND; cả ba gồm VAT và USB Token; riêng gói 3 năm tặng thêm 6 tháng.
- Có nhà cung cấp, hình thức cấp mới/gia hạn, VAT, Token, thương hiệu, liên hệ, ưu đãi và nguồn tham khảo; thông tin chưa biết được để trống.
- Bấm **Lưu đề bài** để lưu trên máy. Đổi tab và mở lại ứng dụng vẫn đọc cùng đề bài đã lưu. Thay đổi chưa lưu chỉ giữ khi chuyển tab trong cùng trang; tải lại/đóng trang sẽ có cảnh báo của trình duyệt.
- Các lần sửa đề bài được lưu thành phiên bản. Hai cửa sổ cùng sửa sẽ yêu cầu đối chiếu, không âm thầm ghi đè. Đối chiếu bao gồm cả thông tin bổ sung.
- Luồng Mốc B dùng dữ liệu mẫu được mô tả ở trên. Giao diện cũ nằm trong phần **Xem bản mô phỏng giao diện cũ**, không dùng đề bài mới và không phải kết quả tạo từ dự án đã lưu. Nút AI thủ công cũ đã bỏ ở Mốc C; mọi lượt AI đi qua quy trình dự án.

## Mở phần mềm

Mở lối tắt **10X AI Digital Business** trên Desktop hoặc truy cập `http://127.0.0.1:3220` khi máy chủ đang chạy.

```powershell
npm install
npm run build
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\start-local.ps1
```

Sau khi sửa mã nguồn, build lại rồi khởi động lại đúng máy chủ của ứng dụng. Launcher mở bản production, không phải dev server. Không cần OpenRouter/Firebase key để nhập và lưu đề bài.

Nếu cần phát triển, dùng `npm run dev -- --hostname 127.0.0.1 --port 3202`. Chỉ sử dụng cục bộ; chưa đưa API dữ liệu cá nhân lên Internet.

## Dữ liệu và sao lưu

Dữ liệu nằm tại `.local/projects/<projectId>/state.json`, gồm đề bài hiện tại và các phiên bản trước. ID dự án đang mở được nhớ trong trình duyệt; dữ liệu thật nằm trên ổ đĩa, không phụ thuộc localStorage. Không xóa `.local/projects` khi cập nhật phần mềm. Sao lưu cả thư mục khi ứng dụng đã dừng.

Khi tạo mới, ứng dụng ghi hoàn chỉnh vào thư mục tạm rồi mới công bố dự án. Thử lại sau khi mất phản hồi dùng cùng ID, tránh tạo hai bản khác nhau. Khi sửa, file khóa, revision check và atomic rename ngăn ghi chồng. Khóa của tiến trình local được xác nhận đã chết có thể tự phục hồi, không xóa chỉ dựa vào tuổi file. Khóa chưa xác định được chủ sở hữu sẽ chặn ghi để bảo toàn dữ liệu; không tự xóa file dữ liệu để xử lý lỗi.

Biến server `MISSION_CONTROL_DATA_DIR` có thể chỉ định kho dữ liệu khác; kiểm thử trình duyệt dùng kho riêng dưới `.local/e2e-data` và không sửa dữ liệu sử dụng thật. `.env.local`, `.local/` và log không được đưa vào Git.

## Kiểm tra

```powershell
npm run test:workflow
node --experimental-strip-types --test tests/universe-motion.test.mjs
npm run typecheck
npm run build
npm run test:e2e
```

Kiểm thử E2E dùng Chrome headless, tự mở bản production ở cổng 3201 với kho riêng. Cần Chrome đã cài và cổng 3201 trống. Ảnh/traces được lưu dưới `.local/e2e-results`.

## Mã nguồn chính

| Đường dẫn | Vai trò |
|---|---|
| `src/lib/projects/schema.ts` | Schema đề bài, giá và phiên bản dự án |
| `src/lib/projects/ica-preset.ts` | Mẫu ICA theo thông tin người dùng xác nhận |
| `src/lib/projects/local-repository.ts` | Kho local, giao dịch phiên bản, khóa và snapshot |
| `src/lib/projects/lock-recovery.ts` | Đối chiếu chủ khóa trước khi phục hồi |
| `src/app/api/projects/` | API tạo/đọc/cập nhật dự án, chỉ cho loopback |
| `src/components/project-workspace.tsx` | Mở/lưu đề bài và đồng bộ các tab |
| `src/components/project-brief-form.tsx` | Form bốn mục chính, gói giá và thông tin bổ sung |
| `src/lib/export/` | Tạo TXT nội dung và mẫu quản trị CSV an toàn cho Excel |
| `src/app/api/projects/[id]/export/route.ts` | API tải TXT/CSV có kiểm tra dự án, phiên bản và Origin |
| `src/lib/engine.ts` | Máy trạng thái mô phỏng cũ, chưa phải workflow AI |
| `src/app/api/generate/route.ts` | Endpoint cũ đã vô hiệu hóa; mọi lượt AI đi qua workflow dự án |

## Trạng thái bàn giao bản local đầu tiên

Các Task 1–10 trong `docs/plans/2026-10-28-auto-run-implementation.md` đã có triển khai và kiểm thử tự động: kho dữ liệu local, workflow 5 hệ thống với 2 điểm duyệt, worker/checkpoint, OpenRouter có hạn mức, chỉnh sửa có phiên bản, chạy theo phạm vi, backup/restore và xuất TXT/CSV. Xem [checklist chạy lần đầu](docs/first-run-checklist.md) để nghiệm thu quy trình mẫu và, khi chủ ứng dụng chủ động đồng ý chi phí, một lượt AI thật.

Firebase và tạo ảnh/video là giai đoạn tiếp theo khi có yêu cầu tương ứng; chúng không phải điều kiện đóng bản local đầu tiên.
## Tài liệu OpenRouter đã đối chiếu khi triển khai

- [Structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs)
- [Provider routing và max_price](https://openrouter.ai/docs/guides/routing/provider-selection)
- [Usage accounting](https://openrouter.ai/docs/cookbook/administration/usage-accounting)
- [API errors](https://openrouter.ai/docs/api_reference/errors-and-debugging)
- [Model catalog](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties)


## Chạy một bước hoặc tạo lại riêng

Đã bổ sung bộ chọn **Một bước / Cả chuỗi**, tạo lại riêng bài đăng/kịch bản và lịch sử phiên bản. Hai điểm duyệt và hạn mức AI vẫn được giữ. Xem [hướng dẫn sử dụng và phạm vi ảnh hưởng](docs/priority2-scoped-runs.md).


## Vận hành và hiệu năng

- Mở bằng shortcut **10X AI Digital Business** hoặc `powershell -NoProfile -ExecutionPolicy RemoteSigned -File .\start-local.ps1`. Web 3220, worker 3230; launcher kiểm tra đúng thư mục dữ liệu trước khi dùng lại tiến trình. Đóng Chrome không dừng worker.
- Dữ liệu đang chạy kiểm tra mỗi 1,5 giây; trạng thái chờ/tạm dừng mỗi 15 giây; hoàn tất mỗi 30 giây. Tab ẩn dừng kiểm tra project/worker và không tải catalog backup định kỳ. Quay lại tab hoặc bấm **Kiểm tra đồng bộ** chỉ đọc dữ liệu, không chạy AI. Mất kết nối giữ bản nháp, tự thử GET lại với khoảng nghỉ tối đa 30 giây.
- Conditional GET trả 304 khi snapshot không đổi. Workspace chỉ tải nội dung hiện hành; **Xem lịch sử phiên bản** tải riêng khi mở. Lịch sử đầy đủ vẫn được giữ trên máy.
- **Sao lưu bằng tệp JSON → Tải tệp sao lưu** tạo tệp của dữ liệu đã lưu. Chrome có thể lưu ở Downloads; chuyển thêm sang ổ khác để bảo vệ khi hỏng ổ máy. Tệp có nội dung dự án, không bao gồm biến môi trường/API key được cấu hình trên máy.
- Chọn JSON tối đa 32 MiB, kiểm tra tên, đánh dấu xác nhận rồi nhập. Máy chủ xác minh checksum và schema, tạo dự án riêng ở trạng thái tạm dừng; không tự chạy AI. Giữ nguyên bản gốc, lịch sử phí đã biết và các khoản chưa rõ; phải cấu hình lại model/hạn mức để chạy AI thật. Giữ nguyên tệp đã xuất, không sửa tay; checksum giúp phát hiện thay đổi, không xác thực nguồn tệp.
- Backup tự động trên cùng ổ không thay thế bản sao bên ngoài. Chưa có tự đồng bộ cloud hoặc tác vụ backup khi cả ứng dụng/worker đã đóng.


## Chẩn đoán lỗi

- Khi gặp lỗi500, thông báo có **mã lỗi**, thời điểm UTC, bước thất bại và **mã đối chiếu**. Mở **Nhật ký lỗi & chẩn đoán** ở màn hình dự án, rồi bấm tải lại để tìm cùng mã. Giờ trong nhật ký được hiển thị theo máy của bạn.
- Nhật ký API/worker nằm tại `.local/projects/.diagnostics` (hoặc `<MISSION_CONTROL_DATA_DIR>/.diagnostics`), tối đa200 sự cố; giao diện đọc20 bản gần nhất. Chỉ đọc khi mở/tải lại, không gửi log ra ngoài. Không ghi nội dung dự án, prompt, key, env, message/stack thô hoặc đường dẫn riêng. Không có dữ liệu hồi tố của lỗi trước khi cài bản này.
- `FS_EPERM` tại `repository.commit` là Windows từ chối đổi tên tệp snapshot; tại `repository.lock` là từ chối mở tệp khóa. Các thao tác filesystem an toàn được thử tối đa6 lần, nghỉ20/40/80/160/320ms. Không tự gửi lại lệnh, không gọi lại AI. Nếu vẫn lỗi, mã đối chiếu được giữ để điều tra; không mặc định xóa khóa hay ghi đè snapshot.
- Lỗi ở bước `repository.release` có thể xảy ra sau khi dữ liệu đã lưu. Kiểm tra bản đã lưu/nhật ký trước khi thao tác tiếp; cùng requestId được đối chiếu qua receipt để tránh nhân đôi công việc. Lượt AI chưa rõ kết quả/chi phí vẫn phải đối chiếu như trước.
- Nếu thông báo **Chưa ghi được nhật ký trên ổ đĩa**, giữ lại mã và thời điểm hiển thị; kiểm tra dung lượng/quyền ghi. Log hỏng không biến lỗi gốc thành một kết quả thành công.
