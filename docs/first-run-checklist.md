# Checklist chạy lần đầu

Checklist này dùng để nghiệm thu bản local đầu tiên. Không chép API key, nội dung `.env.local` hoặc dữ liệu khách hàng vào ảnh, log hay tài liệu bàn giao.

## 1. Chuẩn bị

- [ ] Cài dependencies bằng `npm install`.
- [ ] Chạy `npm run build` và xác nhận build thành công.
- [ ] Khởi động bằng `start-local.ps1`, sau đó mở `http://127.0.0.1:3200`.
- [ ] Xác nhận web server và worker đều báo hoạt động; không mở worker thứ hai trên cùng cổng.
- [ ] Nếu chỉ kiểm tra quy trình mẫu, không cần OpenRouter key.

## 2. Luồng mẫu không phát sinh chi phí

- [ ] Tạo dự án, bấm **Điền mẫu ICA**, kiểm tra ba gói cấp mới: 1.792.800 / 2.690.000 / 3.080.000 VND; gói 3 năm tặng 6 tháng.
- [ ] Lưu đề bài, tải lại trang và xác nhận dữ liệu vẫn còn.
- [ ] Chạy chuỗi mẫu qua đủ 5 hệ thống và đúng 2 điểm duyệt.
- [ ] Sửa một nội dung, xác nhận lịch sử phiên bản được giữ và kết quả phụ thuộc bị đánh dấu cần tạo lại đúng phạm vi.
- [ ] Đóng tab trình duyệt trong khi worker chạy, mở lại và xác nhận checkpoint tiếp tục được đọc từ ổ đĩa.
- [ ] Tải TXT và CSV; kiểm tra tiếng Việt, giá, nhãn bản mẫu/bản AI và CSV mở đúng UTF-8 trong Excel.
- [ ] Xác nhận CSV mới chỉ có header, không chứa khách hàng, đơn hàng hoặc doanh thu giả.

## 3. Sao lưu và phục hồi

- [ ] Khi không có job đang chạy, tạo backup từ giao diện.
- [ ] Khôi phục thành một bản dự án riêng và xác nhận dự án gốc không bị ghi đè.
- [ ] Nếu sao lưu thủ công, dừng ứng dụng trước khi sao chép `.local/projects`.
- [ ] Không xóa `.local/projects` khi cập nhật mã nguồn hoặc build lại.

## 4. AI thật qua OpenRouter — chỉ khi chủ ứng dụng chủ động đồng ý chi phí

- [ ] Điền `OPENROUTER_API_KEY` trong `.env.local`; không ghi key vào Git, ảnh hoặc log.
- [ ] Tải danh sách model, chọn model hỗ trợ structured output và có giá xác định.
- [ ] Đặt giới hạn số lần gọi, token đầu vào/đầu ra và ngân sách dự toán; kiểm tra thêm hạn mức tài khoản tại OpenRouter.
- [ ] Xác nhận đồng ý chi phí rồi mới lưu cấu hình; thao tác lưu không được tự gọi AI.
- [ ] Chủ động bắt đầu một luồng ICA thật và kiểm tra provider request ID, usage, chi phí và kết quả đã lưu.
- [ ] Nếu request bị timeout/mất mạng hoặc thiếu usage, đối chiếu trước khi cho phép thử lại; không tự retry một request có thể đã tính phí.
- [ ] Tải TXT/CSV sau luồng thật và xác nhận không có giá, liên hệ hoặc cam kết do model tự bịa.

## 5. Bằng chứng kỹ thuật

Chạy lần lượt:

```powershell
npm run test:workflow
node --experimental-strip-types --test tests/universe-motion.test.mjs
npm run typecheck
npm run build
npm run test:e2e
```

Kết quả mong đợi: tất cả test qua; production build thành công; E2E dùng kho dữ liệu riêng dưới `.local/e2e-data` và không sửa dữ liệu đang sử dụng.

## 6. Phạm vi chưa thuộc bản local đầu tiên

- Firebase không phải đường chạy bắt buộc.
- Ứng dụng chưa đăng bài, gửi email, thanh toán hay cấp dịch vụ ra ngoài.
- Kịch bản video là nội dung chữ, chưa phải ảnh hoặc MP4.
- Chất lượng AI thật chỉ được nghiệm thu sau lượt chạy có model và hạn mức do chủ ứng dụng lựa chọn.
