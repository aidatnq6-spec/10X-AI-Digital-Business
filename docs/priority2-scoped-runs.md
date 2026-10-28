# Chạy theo phạm vi và tạo lại riêng

Cập nhật: 28/10/2026.

## Cách dùng

- Trong **Phạm vi chạy**, chọn **Một bước**, chọn hệ thống và bấm **Chạy bước đã chọn**. Chỉ phần còn thiếu/lỗi thời của hệ thống đó được tạo; xong thì dừng. Bước đã đủ nội dung không bị tạo lại hàng loạt.
- Chọn **Cả chuỗi** để chạy các phần còn thiếu theo thứ tự. Nếu đang chạy riêng một bước, bấm **Chuyển sang chạy cả chuỗi** để áp dụng lựa chọn. Chỉ đổi radio/select không gửi tác vụ.
- Hai điểm duyệt vẫn giữ nguyên. Trong chế độ một bước, nút **Duyệt … và dừng** chỉ ghi nhận duyệt, không khởi chạy bước sau.
- Mở một bài đăng hoặc kịch bản, bấm **Tạo lại riêng**, đọc phạm vi ảnh hưởng rồi xác nhận. Trong chế độ AI thật, nút xác nhận nêu rõ có thể tính phí.
- Sau khi có bản mới, mở **Xem lịch sử phiên bản** trong mục tương ứng để đọc bản cũ.

## Bảo toàn dữ liệu

Bản cũ còn hiện hành trong lúc tạo lại. Chỉ khi có kết quả hợp lệ, ứng dụng mới tạo phiên bản mới và đánh dấu bản cũ là lỗi thời. Nếu thất bại, bản cũ và các phê duyệt được giữ lại. Một kết quả đến sau bản sửa tay mới hơn chỉ được lưu như lịch sử lỗi thời, không ghi đè.

Tạo lại một bài đăng giữ nguyên các bài/kịch bản khác cùng điểm duyệt 1; điểm duyệt 2 cần kiểm tra lại, các bước 4–5 phụ thuộc cần tạo lại. Tạo lại một kịch bản giữ các kịch bản khác và điểm duyệt 1; nội dung chuyển đổi dùng các kịch bản làm đầu vào nên cần tạo/duyệt lại cùng các bước sau.

Các tác vụ mới giữ snapshot phạm vi đầu ra, phiên bản đầu vào, model và hạn mức. Retry chỉ chạy lại phạm vi đã chọn, không tự gửi lại kết quả chưa rõ. OpenRouter được yêu cầu đúng số mục cần tạo, không sinh cả bộ rồi bỏ các mục khác.

Chạy bước 2 cần duyệt bước 1; bước 3 cần đủ kịch bản bước 2; bước 4 cần điểm duyệt 2 hợp lệ; bước 5 cần hoàn tất bước 4. Đổi phạm vi có thể thay tác vụ chưa gửi đang tạm dừng; tác vụ đang gửi/chạy hoặc cần đối chiếu không bị bỏ qua.

Ngân sách, phí chưa rõ và sự đồng ý chi phí vẫn được kiểm tra. Các tính năng này không tự tăng hạn mức, đăng bài, gửi email, tạo MP4 hoặc ảnh.

## Kiểm tra triển khai

49 kiểm thử nghiệp vụ/provider đã đạt, gồm phạm vi đơn, retry, bảo toàn bản duyệt, phản hồi đến muộn, CTA không đổi chế độ chạy, chuyển tác vụ chưa gửi và hợp đồng OpenRouter một mục. Giao diện được kiểm tra Chrome với dữ liệu riêng và màn hình 390px. TypeScript và production build đạt. Worker hỗ trợ phạm vi có health version 3; launcher kiểm tra phiên bản này.

Dữ liệu dự án thật được so SHA256 sau khi khởi động lại, không thay đổi. Không gọi AI tính phí trong kiểm tra.
