# HỆ THỐNG QUY CHUẨN THIẾT KẾ GIAO DIỆN (UI/UX STYLE GUIDELINE)
## NỀN TẢNG ĐẶT LỊCH MAKE-UP (MUA MAKEUP PLATFORM)

---

## 1. Triết lý Thiết kế Hệ thống (Design Philosophy)

Hệ thống giao diện Nền tảng Đặt lịch Make-up (**MUA MAKEUP**) được thiết kế theo phong cách **Hiện đại, Tinh tế và Trực quan (Modern, Clean & High-Contrast)** dựa trên nguyên mẫu thiết kế Figma chính thức:

* **Màu sắc Nhận diện Thống nhất (Signature Rose)**: Sử dụng tông đỏ hồng Rose Ruby (`#E11D48` - Tailwind `rose-600`) kết hợp gradient cánh hoa tươi sáng (`#E11D48` $\rightarrow$ `#F43F5E`) làm màu hành động chủ đạo, toát lên sự chuyên nghiệp, quyến rũ và đẳng cấp làm đẹp.
* **Độ tương phản cao & Rõ nét (High Contrast & Legibility)**: Toàn bộ tiêu đề sử dụng sắc xanh đen Slate sâu thẳm (`#0F172A`), nền trắng tinh khiết (`#FFFFFF`) và nền canvas dịu mắt (`#F8FAFC`), giúp thông tin hiển thị sắc nét, không gây nhức mỏi mắt.
* **Đường nét Thanh lịch & Tinh tế (Delicate Curves & Borders)**: Thẻ Card form được bo góc mềm mại (`20px - 24px`), viền thẻ phủ ánh hồng nhạt (`#FFE4E6` / `#FECDD3`), tạo cảm giác sang trọng mà vẫn tối giản, hiện đại.

---

## 2. Bảng Màu Chuẩn Hệ Thống (Official Color Palette)

### A. Màu Nhận diện Thương hiệu (Brand Colors)
| Tên màu | Mã HEX | Tailwind Class | Mô tả & Ứng dụng |
| :--- | :---: | :---: | :--- |
| **Rose Primary (Chủ đạo)** | `#E11D48` | `rose-600` | Màu nút bấm chính (CTA), Link nổi bật, Icon active, Logo gradient |
| **Rose Hover** | `#BE123C` | `rose-700` | Trạng thái hover/active của nút bấm |
| **Rose Light / Soft Tint** | `#FFE4E6` | `rose-100` | Viền thẻ Card nổi bật, nền badge, viền focus form |
| **Rose Accent Gradient** | `#E11D48` $\rightarrow$ `#F43F5E` | - | Gradient của icon logo MUA MAKEUP và nút bấm đặc biệt |

---

### B. Màu Văn bản & Bề mặt (Text & Surface Colors)
| Phân loại | Mã HEX | Tailwind Class | Mục đích sử dụng |
| :--- | :---: | :---: | :--- |
| **Heading Text (Tiêu đề chính)**| `#0F172A` | `slate-900` | Tên thương hiệu, Tiêu đề màn hình H1, H2, Nhãn form quan trọng |
| **Body / Subtitle Text** | `#64748B` | `slate-500` | Phụ đề, ghi chú hướng dẫn, văn bản thân |
| **Muted / Placeholder Text** | `#94A3B8` | `slate-400` | Icon tiền tố ô input, placeholder, tiêu đề mục phụ |
| **Surface Card (Nền thẻ)** | `#FFFFFF` | `white` | Nền các khối Card thông tin, modal đăng nhập/đăng ký |
| **Input Background** | `#FFFFFF` | `white` | Nền các ô Text Input |
| **Input Border** | `#E2E8F0` | `slate-200` | Viền ô nhập liệu ở trạng thái mặc định |
| **Canvas Background** | `#F8FAFC` | `slate-50` | Nền tổng thể của toàn bộ trang web và ứng dụng |

---

### C. Màu Trạng thái Ngữ nghĩa (Semantic Status Colors)
| Trạng thái | Mã HEX | Biểu tượng & Ứng dụng |
| :--- | :---: | :--- |
| **Success (Thành công / Hoàn thành)** | `#10B981` | Xanh ngọc lục bảo: Đã nghiệm thu đơn, đăng ký thành công |
| **Warning / Pending (Chờ xử lý)** | `#F59E0B` | Màu hổ phách: Đơn chờ thợ nhận, đếm ngược ca làm |
| **Danger / Error (Lỗi / Cảnh báo)** | `#EF4444` | Đỏ san hô: Dấu hoa thị bắt buộc (*), lỗi validation, hủy đơn |
| **Info / Moving (Di chuyển / Thông tin)**| `#3B82F6` | Xanh dương: Thợ đang di chuyển đến nhà khách, icon thông tin |

---

## 3. Hệ thống Typography (Kiểu chữ & Phông nền)

### A. Phông chữ quy chuẩn
* **Phông toàn diện (Toàn bộ Hệ thống)**: `Inter`, `Plus Jakarta Sans`, hoặc `Outfit` (Modern Sans-serif).
* **Tuyệt đối KHÔNG dùng font Serif (như Playfair) hay font màu vàng neon** gây rối mắt và không đồng bộ với nguyên mẫu thiết kế Figma.

### B. Thang kích thước & Trọng số chữ (Type Scale)
* **Brand Title ("MUA MAKEUP")**: `22px - 24px` / ExtraBold (`font-extrabold`) / Màu `#0F172A` / Uppercase
* **Heading 1 ("Đăng Nhập Hệ Thống")**: `26px - 30px` / Bold (`font-bold`) / Màu `#0F172A`
* **Subtitle**: `13px - 14px` / Regular / Màu `#64748B`
* **Input Label**: `13px - 14px` / Medium (`font-medium`) / Màu `#0F172A` kèm dấu `*` màu đỏ `#EF4444`
* **Button Text**: `15px - 16px` / SemiBold (`font-semibold`) / Màu trắng `#FFFFFF`
* **Helper / Caption**: `12px - 13px` / Regular / Màu `#64748B` hoặc `#94A3B8`

---

## 4. Quy chuẩn Các Component Giao diện Chuẩn Figma

### 1. Logo Thương hiệu (`BrandLogo`)
* **Biểu tượng (Icon Badge)**: Hình vuông bo góc tròn (`14px - 16px`), nền Gradient đỏ hồng (`#E11D48` $\rightarrow$ `#F43F5E`), icon lấp lánh (Sparkles `✨`) màu trắng tinh khiết ở giữa.
* **Tên thương hiệu**: Chữ in hoa `MUA MAKEUP`, font sans-serif in đậm (`font-extrabold`), màu xanh đen `#0F172A`.

### 2. Thẻ Đăng nhập / Đăng ký (`AuthCard`)
* Nền trắng (`#FFFFFF`), bo góc lớn (`24px`).
* Viền bao quanh tinh tế màu hồng cánh sen nhạt (`border: 1px solid #FFE4E6` hoặc `#FECDD3`).
* Đổ bóng nhẹ nhàng, khuếch tán: `box-shadow: 0 10px 30px -5px rgba(225, 29, 72, 0.05)`.

### 3. Ô Nhập liệu Chuẩn (`BaseInput`)
* Chiều cao: `48px - 52px`, bo góc `10px - 12px`.
* Nền trắng, viền mảnh `#E2E8F0`.
* Icon đầu dòng màu `#94A3B8`.
* Trạng thái Focus: Viền chuyển sang màu hồng Rose `#E11D48` kèm vòng phát sáng nhẹ `ring-2 ring-rose-100`.

### 4. Nút Hành động Chính (`PrimaryButton`)
* Nền: Màu đỏ hồng Ruby `#E11D48` (hoặc hover `#BE123C`).
* Chữ trắng in đậm: `"Đăng Nhập Vào Hệ Thống →"`, icon mũi tên sang phải.
* Chiều cao: `48px - 52px`, bo góc `10px - 12px`.
* Đổ bóng nhẹ: `box-shadow: 0 4px 12px rgba(225, 29, 72, 0.25)`.

### 5. Khối Tài khoản Test Nhanh Di Động (`QuickTestAccounts`)
* Khung nền nhạt bo góc `12px`, viền `#E2E8F0`.
* Tiêu đề: `"TÀI KHOẢN DÙNG THỬ (MOBILE ROLES)"` (chữ in hoa nhỏ 11px, màu `#94A3B8`).
* 3 Thẻ con lựa chọn nhanh dành cho 3 phân hệ ứng dụng di động:
  - **Khách Hàng**: Icon người dùng hồng đỏ (`#E11D48`), số điện thoại `0912345678`.
  - **Thợ MUA Tự Do**: Icon cọ trang điểm cam vàng (`#F59E0B`), số điện thoại `0987654321`.
  - **Nhân Viên Agency**: Icon tòa nhà xanh dương (`#3B82F6`), số điện thoại `0933112233`.

### 6. Quy Chuẩn Hiển Thị Trạng Thái Lỗi Form & Phản Hồi (Error State & Feedback UI)
* **Trạng thái Lỗi của Ô Nhập (`BaseInput Error State`)**:
  - Đường viền ô input: Chuyển sang màu đỏ cảnh báo Coral Red `#EF4444`.
  - Icon đầu dòng: Đổi sang màu đỏ cảnh báo `#EF4444`.
  - Dòng giải thích lỗi (Helper Error Text): Cỡ chữ nhỏ `11.5px - 12px`, màu `#EF4444`, độ đậm `500` (Medium), hiển thị cách mép trái `2px` ngay dưới chân ô nhập.
  - **Nội dung lỗi bắt buộc**: Phải hiển thị chính xác nguyên nhân vi phạm (Ví dụ: *"Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt"*), nghiêm cấm chỉ hiển thị câu chung chung mơ hồ như *"Dữ liệu không hợp lệ"*.
* **Thông báo Alert / Toast Feedback**:
  - Khi API trả về lỗi validation hoặc lỗi nghiệp vụ, bắt buộc bóc tách qua tiện ích chuẩn hóa `parseApiError(err)` để hiển thị nội dung lỗi cụ thể nhất tới người dùng.
