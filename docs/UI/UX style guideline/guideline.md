# HỆ THỐNG QUY CHUẨN THIẾT KẾ GIAO DIỆN (UI/UX STYLE GUIDELINE)
## NỀN TẢNG ĐẶT LỊCH MAKE-UP (MAKEUP BOOKING PLATFORM)

---

## 1. Triết lý Thiết kế (Design Philosophy)

Nền tảng hướng tới phân khúc dịch vụ làm đẹp, thẩm mỹ cao cấp (Beauty & Glamour). Toàn bộ trải nghiệm giao diện người dùng phải toát lên 3 giá trị cốt lõi:
* **Sang trọng & Quý phái (Luxury & Glamour)**: Kết hợp hài hòa giữa ánh kim Champagne Gold, sắc hồng Rose Gold và nền nhung tối Velvet Charcoal.
* **Thanh lịch & Tinh tế (Elegance & Simplicity)**: Bố cục thoáng đãng, đường viền thanh mảnh, đổ bóng mềm mại và hiệu ứng kính mờ (Glassmorphism).
* **Hiện đại & Sống động (Dynamic & Responsive)**: Micro-animations mượt mà, đồng hồ đếm ngược nhận ca 30s sinh động, bản đồ GPS tracking di chuyển thời gian thực.

---

## 2. Bảng Màu Chuẩn Hệ Thống (Color Palette)

### A. Màu Nhận diện Thương hiệu (Brand Colors)
| Tên màu | Mã HEX | Mô tả & Ứng dụng |
| :--- | :---: | :--- |
| **Champagne Gold (Primary)** | `#D4AF37` | Màu chủ đạo: Nút bấm chính (CTA), Huy hiệu VIP, Icon nổi bật, Viền active |
| **Rose Gold (Secondary)** | `#E0A9AF` | Màu phụ: Điểm nhấn dịch vụ Cô dâu, Tag sự kiện, Hiệu ứng chuyển màu gradient |
| **Warm Nude (Accent)** | `#C58F78` | Màu nhấn: Card hover, viền phụ kiện trang điểm, nút thứ cấp |
| **Velvet Charcoal (Dark Mode)**| `#1A1817` | Nền nhung đen tuyền cho chế độ Dark Mode cao cấp |

---

### B. Màu Nền & Bề mặt (Surface & Neutral Colors)
| Phân loại | Mã HEX | Mục đích sử dụng |
| :--- | :---: | :--- |
| **Warm Ivory (Light Background)** | `#FFFDF9` | Nền sáng tổng thể của toàn bộ ứng dụng |
| **Pure White (Surface Card)** | `#FFFFFF` | Nền các thẻ Card thông tin, Modal pop-up |
| **Soft Cream (Muted Surface)** | `#F5EFEB` | Nền ô nhập liệu (Input), Nền Dropdown |
| **Delicate Border** | `#E8DFD8` | Đường viền mảnh chia ngăn các khối nội dung |
| **Dark Card (Dark Mode)** | `#24201E` | Thẻ Card nổi bật trên nền Dark Mode |
| **Dark Border (Dark Mode)** | `#38322E` | Viền ngăn chia trên nền Dark Mode |

---

### C. Màu Trạng thái Đơn hàng & Hệ thống (Status Colors)
| Trạng thái | Mã HEX | Biểu tượng & Ứng dụng |
| :--- | :---: | :--- |
| **Pending (Chờ duyệt / Broadcast)** | `#F59E0B` | Màu hổ phách: Đơn chờ thợ nhận, đếm ngược 30s |
| **Moving (Thợ đang di chuyển)** | `#3B82F6` | Màu xanh dương: Tracking GPS thợ đang đến nhà khách |
| **In-Progress (Đang trang điểm)** | `#8B5CF6` | Màu tím Glamour: Ca làm đang được thực hiện |
| **Completed (Hoàn thành)** | `#10B981` | Màu ngọc lục bảo: Đã nghiệm thu, giải ngân tiền ví |
| **Cancelled / Danger (Hủy / Lỗi)**| `#EF4444` | Màu đỏ san hô: Hủy đơn, thông báo lỗi validation |

---

## 3. Hệ thống Typography (Kiểu chữ & Phông nền)

### A. Phông chữ quy chuẩn
* **Phông chính (Body & UI Components)**: `Outfit`, `Inter` (sans-serif) — Đảm bảo tính hiện đại, rõ ràng, dễ đọc trên màn hình di động.
* **Phông tiêu đề cao cấp (Editorial & VIP Titles)**: `Playfair Display` (serif) — Tạo điểm nhấn sang trọng cho Banner trang chủ, Tiêu đề dịch vụ cô dâu, Bảng giá Studio.

### B. Thang kích thước chữ (Type Scale)
* **Hero Display**: `36px - 48px` / Bold (Font Playfair Display)
* **Heading 1 (H1)**: `28px - 32px` / SemiBold (Font Outfit)
* **Heading 2 (H2)**: `22px - 24px` / Medium
* **Heading 3 (H3)**: `18px - 20px` / Medium
* **Body Regular**: `14px - 16px` / Regular (Line-height: 1.6)
* **Caption / Helper**: `12px - 13px` / Regular (Màu chữ xám trung tính)

---

## 4. Hiệu ứng Thị giác & Đổ bóng (Elevation & Glassmorphism)

### A. Đổ bóng ánh kim (Luxury Shadows)
* **Thẻ Card dịch vụ**: `box-shadow: 0 10px 30px -5px rgba(212, 175, 55, 0.12);`
* **Nút bấm CTA chính**: `box-shadow: 0 4px 14px 0 rgba(212, 175, 55, 0.39);`
* **Modal Overlay**: `box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);`

### B. Hiệu ứng Kính mờ (Glassmorphism)
* **Header / Navigation Bar**:
  ```css
  background: rgba(255, 253, 249, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(232, 223, 216, 0.6);
  ```

---

## 5. Quy chuẩn Các Component Nghiệp vụ Cốt lõi

### 1. Modal Đếm ngược Nhận đơn Realtime 30s (`InstantBookingCountdownModal`)
* Đồng hồ đếm ngược vòng tròn SVG (`stroke-dashoffset` mượt mà).
* Đổi màu chỉ báo từ **Vàng Champagne** (`#D4AF37`) sang **Đỏ cảnh báo** (`#EF4444`) khi thời gian còn dưới 10 giây.
* Nút "Chấp nhận ca làm" lớn, hiệu ứng rung nhẹ (pulse animation).

### 2. Thẻ Bản đồ Tracking GPS Realtime (`GpsTrackingView`)
* Marker định vị của Thợ Make-up chuyển động mượt theo tọa độ WebSocket 5s.
* Thanh tiến trình 4 chặng: *Đã nhận đơn $\rightarrow$ Đang di chuyển $\rightarrow$ Đã đến nơi $\rightarrow$ Hoàn thành*.

### 3. Thanh trượt So sánh Trước & Sau Make-up (`BeforeAfterSlider`)
* Kéo thanh trượt ngang để so sánh ảnh mặt mộc và kết quả sau make-up.
* Đường phân cách mạ vàng champagne kèm icon kéo 2 chiều.

### 4. Ma trận Lịch điều phối Studio (`AgencyCalendarSchedule`)
* Timeline ma trận: Trục dọc là danh sách Thợ, trục ngang là các khung giờ trong ngày.
* Thao tác trực quan gán thợ, đổi ca làm việc nhanh chóng.

---

## 6. Tiêu chuẩn Tương tác & Trải nghiệm (UX Standards)

1. **Mobile-First Responsive**: 100% giao diện Khách hàng và Thợ phải tối ưu hoàn hảo cho màn hình cảm ứng di động (375px – 430px).
2. **Skeleton Shimmer Loading**: Khi chờ tải dữ liệu API, sử dụng Skeleton Shimmer chuyển sắc Champagne Nude nhẹ nhàng, tuyệt đối không dùng spinner tròn đơn điệu.
3. **Empty States**: Khi danh mục/lịch hẹn chưa có dữ liệu, hiển thị hình ảnh minh họa thẩm mỹ kèm câu hướng dẫn và nút kích hoạt hành động rõ ràng.
4. **Form Validation Feedback**: Báo lỗi tức thì bằng tooltip / text màu đỏ san hô mềm mại ngay bên dưới ô nhập liệu khi dữ liệu không thỏa mãn Zod Schema.
