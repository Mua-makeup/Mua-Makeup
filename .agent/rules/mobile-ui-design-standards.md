# Quy Chuẩn Bắt Buộc: Giao Diện Mobile App (Clean, Human-Crafted UI & Minimalist Iconography)

## 1. Triết Lý Thiết Kế & Trải Nghiệm (Human-Crafted vs AI-Slop)
Giao diện ứng dụng di động (React Native / Expo) bắt buộc phải phản ánh phong cách của **lập trình viên & Product Designer con người lành nghề**: Tinh tế, thực dụng, tôn trọng không gian thị giác và cấu trúc thông tin rõ ràng. 

**TUYỆT ĐỐI NÓI KHÔNG VỚI PHONG CÁCH "AI CODE TỰ SINH RƯỜM RÀ" (NO AI-SLOP UI):**
- Không nhồi nhét icon bừa bãi vào từng dòng chữ hoặc tiêu đề.
- Không dùng hiệu ứng gradient bóng bẩy màu mè, không phát sáng neon (glow) giả tạo.
- Không bọc các icon trong các khối hình tròn/vuông sặc sỡ (`bg-blue-100 rounded-full`, `backgroundColor: '#F3E8FF'`).

---

## 2. Quy Chuẩn Iconography Bắt Buộc

### 2.1. Chỉ Thêm Những Icon Thực Sự Cốt Lõi
- **Chỉ sử dụng icon khi phục vụ hành động trực tiếp**:
  - Thanh điều hướng chính (Bottom Tab Bar).
  - Nút Back quay lại màn hình trước.
  - Nút Đóng (Close / Dismiss) trên Modal / BottomSheet.
  - Thao tác Camera / Ảnh khi chụp nghiệm thu ca làm (`uploadCompletionPhoto`).
  - Biểu tượng cảnh báo hoặc hành động cấp thiết (nếu có).
- **CẤM thêm icon bừa bãi**:
  - Không gắn icon trang trí trước tiêu đề (Header titles, Section headers).
  - Không gắn icon trang trí trước mỗi dòng thông tin (Tên khách hàng, SĐT, Địa chỉ, Giá tiền, v.v.). Hãy để typography và nhãn văn bản tự thể hiện.
  - Không chèn icon vào đầu mỗi mục trong danh sách (list items) nếu mục đó không phải nút bấm chức năng đặc thù.

### 2.2. Nét Icon Nhỏ, Thanh Mảnh (Thin Stroke Outline Only)
- Toàn bộ icon sử dụng nét mảnh nhẹ nhàng (Outline style, stroke width $\le$ 1.5–1.8, ví dụ `Ionicons` với biến thể `-outline`).
- Tránh dùng icon dạng khối đặc to bản, đậm nét (`filled` quá khổ) gây nặng nề và thô kệch.

### 2.3. Tuyệt Đối KHÔNG Dùng Nền Icon (No Icon Background Wrappers)
- Icon phải **đứng trần (naked/clean icon)** trực tiếp trên nền của màn hình hoặc card chứa nó.
- Cấm bọc icon trong các khối hộp nền tròn hoặc vuông nhiều màu sắc (No colored badge wrappers, no circular pastel backgrounds).

---

## 3. Tối Giản Màu Sắc & Bố Cục Giao Diện

### 3.1. Bảng Màu Tối Giản, Trung Tính (Neutral & Clean Palette)
- **Nền chính**: Trắng tinh khôi (`#FFFFFF`) hoặc xám siêu nhẹ (`#F8FAFC`, `#F1F5F9`).
- **Văn bản & Viền**: Hệ màu Slate/Gray phân cấp tự nhiên:
  - Tiêu đề chính / Văn bản đậm: `#0F172A` (Slate 900)
  - Nội dung thường: `#334155` (Slate 700)
  - Gợi ý phụ / Placeholder: `#64748B` (Slate 500)
  - Đường viền mỏng phẳng: `#E2E8F0` (Slate 200) hoặc `#CBD5E1` (Slate 300)
- **Màu nhấn (Primary Action)**: Chỉ dùng tối đa **1 màu nhấn chủ đạo** (ví dụ tông Rose/Đỏ trầm sang trọng hoặc Slate đen đậm) cho nút hành động chính (Primary CTA). Cấm phối màu cầu vồng trên cùng một màn hình.

### 3.2. Dẫn Dắt Bằng Typography & Khoảng Trắng (Whitespace Hierarchy)
- Dẫn dắt mắt nhìn của người dùng bằng:
  - Kích cỡ chữ (`fontSize`: 13px - 14px cho dữ liệu, 16px - 18px cho tiêu đề).
  - Độ đậm chữ (`fontWeight`: '400', '500', '600').
  - Khoảng cách đệm (`padding`, `margin`, `gap`) cân đối, thoáng đãng.
- Tuyệt đối không dùng icon để làm "bình phong" bù đắp cho bố cục kém.

---

## 4. Quy Chuẩn Code Style (React Native / Expo)
- Khai báo styles tách bạch bằng `StyleSheet.create(...)`.
- Đặt tên class/style phản ánh đúng ngữ nghĩa (`container`, `header`, `actionBtn`, `title`, `metaText`), không đặt tên chung chung hoặc lồng ghép style inline quá nhiều.
- Cấu trúc component gãy gọn, dễ bảo trì, đúng chuẩn lập trình viên con người chuyên nghiệp.
