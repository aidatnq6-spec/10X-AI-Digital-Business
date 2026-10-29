# 10X — So sánh ba hướng giao diện v1

Ngày: 29/10/2026. Phác thảo được người dùng yêu cầu để chọn hướng trước khi sửa ứng dụng.

**Lựa chọn đã chốt trong chat ngày 29/10/2026: B — Workspace sáng.** Người dùng đã yêu cầu “làm luôn”; hướng B đã được áp dụng vào ứng dụng. Xem [kế hoạch và kết quả](../../plans/2026-10-29-workspace-b.md). Các bản phác thảo ở đây được giữ để tham chiếu, không tự sửa dữ liệu ứng dụng.

Mở `10X-Interface-Directions.html` bằng Chrome, hoặc phục vụ thư mục này bằng HTTP local để dùng canvas đầy đủ. Font đã đặt tại `assets/`; trang không phụ thuộc CDN và không gọi API ứng dụng.

- **A — Điều khiển tối:** navy/cyan, điều hướng trái, trạng thái vận hành rõ; giữ tinh thần giao diện hiện có.
- **B — Workspace sáng:** trắng/xám/xanh đậm, lưới nội dung và bước tiếp theo rõ; hướng được đề xuất cho thao tác hằng ngày.
- **C — Studio nội dung:** giấy ấm/xanh rêu, điều hướng trên, tiêu đề có nhịp và bản thảo trung tâm.

Chế độ so sánh là bản thu gọn có chủ đích; “Xem lớn” mở bố cục đầy đủ, cho chuyển Đề bài/Kết quả, thử nhập và thử các nút. Nút hành động chỉ hiện phản hồi minh họa, không lưu hay tải dữ liệu thật, không gọi AI.

Nút chọn hướng và ô ghi chú chỉ ghi localStorage với namespace riêng `10x.interface-directions.preview.v1`; không ghi vào dữ liệu dự án, không tự gửi lựa chọn trong chat. Người dùng cần phản hồi A/B/C hoặc cách kết hợp.

Logo chữ và font bắt nguồn từ source giao diện hiện có. Nội dung lấy từ fixture ICA và sample provider, không đọc hồ sơ thật. Xem `asset-sources.md` cho nguồn font. Không có ảnh sản phẩm bên ngoài hoặc số liệu doanh thu giả.

Giao diện thật tại cổng3220 đã chuyển sang B theo yêu cầu tiếp theo của người dùng; worker3230 vẫn dùng quy trình hiện có. Bản phác thảo vẫn độc lập với ứng dụng.
