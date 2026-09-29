# Kế Hoạch Chỉnh Sửa Đúng Theo Luồng Yêu Cầu

Kế hoạch này bám sát 100% đúng theo 4 nội dung bạn đã phân tích, không thêm thắt tính năng ngoài:

---

### 1. Sửa Lỗi Hiển Thị Thu Nhập Của Thợ & % Chiết Khấu Động
* **Vấn đề**: Thông báo nhận ca hiện 239.600đ, nhưng vào màn ca làm việc lại hiện 262.000đ (262.000đ là tổng tiền khách trả, chưa trừ chiết khấu).
* **Chỉnh sửa**:
  * **Backend**:
    * Đưa % chiết khấu thợ tự do thành cấu hình động (mặc định 20%, lưu tại Redis `settings:freelancer_commission_rate` để có thể điều chỉnh linh hoạt).
    * Bổ sung trường `earningsAmount` (thu nhập thực nhận sau chiết khấu) vào API trả về cho thợ (`BookingStatusDetailRes` và `FreelancerBookingItem`).
  * **Mobile App (Màn Thợ)**:
    * Tại `job-execution/[id].tsx`, hiển thị đúng thu nhập thực nhận `earningsAmount` (239.600đ) thay vì lấy nhầm tổng bill `totalAmount` (262.000đ).

---

### 2. Trang Chi Tiết Khớp Thợ Phía Khách Hàng (Chuyển Từ Modal Sang 1 Trang Riêng)
* **Vấn đề**: Hiện tại chỉ là một modal popup nhỏ, thiếu bóc tách giá (phụ phí, phí di chuyển, add-ons) và không xem được page/đánh giá của thợ.
* **Chỉnh sửa**:
  * Chuyển thành 1 trang riêng: `code/app/src/app/booking/instant-matched/[id].tsx`.
  * **Hiển thị chi tiết**:
    * Bóc tách hóa đơn: Giá dịch vụ + Phụ phí khẩn cấp (150.000đ) + Phí khoảng cách di chuyển.
    * Phần chọn dịch vụ mua thêm (Add-ons) nếu khách có nhu cầu.
    * Thông tin thợ: Avatar, tên, số sao, và nút bấm để xem trang cá nhân (page) cùng đánh giá của thợ.
  * **2 Lựa chọn hành động cho khách**:
    1. **Khách từ chối**: Có nút bấm từ chối đơn hàng $\rightarrow$ gửi request nhả thợ cũ và quay lại màn hình tìm thợ khác.
    2. **Khách đồng ý**: Chuyển vào màn đặt cọc thanh toán trước (hiển thị số tiền cọc 30%, cho phép bấm giả lập đặt cọc thành công).

---

### 3. Đồng Bộ Sang Thợ Sau Khi Cọc Thành Công & Bắt Đầu Di Chuyển
* **Chỉnh sửa**:
  * Sau khi khách cọc thành công:
    * Backend bắn thông báo WebSocket sang thợ.
    * Màn hình của thợ cập nhật ngay lập tức lại giá tiền và các dịch vụ mua thêm nếu khách có chọn.
    * Thợ có 2 lựa chọn: **Từ chối ca make** hoặc **Chấp nhận ca make và bấm Bắt đầu di chuyển**.
  * Khi thợ bắt đầu di chuyển: Cả màn khách và màn thợ hiển thị bản đồ Live tracking GPS và trạng thái thời gian thực.

---

### 4. Bổ Sung Tính Năng Hủy Đơn Hàng Cho Cả Thợ Và Khách
* **Trường hợp 1 (Thợ chuẩn bị di chuyển & đang di chuyển)**:
  * Cả khách và thợ đều có nút Hủy đơn trên ứng dụng.
  * Bắt buộc cả 2 bên phải điền lý do hủy.
* **Trường hợp 2 (Thợ đã tới nơi hoặc đang trang điểm - Riêng cho thợ)**:
  * Thợ có nút Hủy / Báo cáo sự cố tại chỗ.
  * Thợ bắt buộc phải: **Điền giải trình lý do** + **Gửi hình ảnh chụp thực tế**.
  * Chuyển trạng thái đơn sang chờ hệ thống Admin xác nhận mới được tính là hủy chính thức.
