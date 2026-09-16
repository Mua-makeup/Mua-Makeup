---
name: ui-ux-design-system
description: Design System standard for the Makeup Booking Platform Frontend (React + Vite + TailwindCSS), encompassing both High Data-Density Admin/Agency Portals and Luxury Beauty Client interfaces.
version: 2.0.0
tags: [frontend, ui-ux, design-system, tailwindcss, admin-portal, agency-portal, luxury-beauty, data-dense]
---

# Makeup Booking Platform: Unified UI/UX Design System Skill (v2.0)

## 1. Triết Lý Thiết Kế 2 Phân Hệ (Dual-Subsystem Philosophy)

Hệ thống giao diện người dùng Nền tảng Đặt lịch Make-up được phân định rõ ràng thành 2 phân hệ có ngôn ngữ thiết kế bổ trợ nhau:

### 1.1. Phân Hệ Quản Trị Hệ Thống & Studio (Super Admin & Agency Admin Portals)
- **Tôn chỉ**: **Clean, Minimalist & High Data-Density Dashboard** (Tối giản, sạch sẽ, trực quan, mật độ dữ liệu cao, không mỏi mắt khi sử dụng liên tục).
- **Màu nền**: Canvas `bg-slate-50` (`#F8FAFC`), Card/Table `bg-white` (`#FFFFFF`), đường viền thanh mảnh `border-slate-200` (`#E2E8F0`).
- **Màu nhấn thương hiệu**: `brand-primary: #E11D48` (`Rose-600`), hover `#BE123C` (`Rose-700`), nền phụ `#FFE4E6` (`Rose-100`).
- **Độ tương phản**: Đạt chuẩn WCAG AA với văn bản `text-slate-900` (`#0F172A`) và nhãn phụ `text-slate-500` (`#64748B`).
- **Nguyên tắc vàng**:
  - ❌ CẤM dùng hiệu ứng kính mờ (glassmorphism/blur) trên bảng dữ liệu vì gây nhòe văn bản và giật lag trình duyệt.
  - ❌ CẤM dùng nền đen tuyền neon lòe loẹt hoặc gradient chuyển 3-4 màu trên nút/thẻ quản trị.
  - ❌ CẤM tràn cuộn ngang toàn trang (Horizontal Scroll), chỉ cho phép cuộn bên trong khối container bảng `overflow-x-auto`.

### 1.2. Phân Hệ Đặt Lịch Dành Cho Khách Hàng & MUA (B2C Client & Mobile Web)
- **Tôn chỉ**: **Luxury Beauty & Glamour Aesthetic** (Sang trọng, thanh lịch, giàu cảm xúc làm đẹp).
- **Tông màu**: Champagne Gold (`#D4AF37`), Warm Nude (`#C58F78`), Rose Gold kết hợp Dark Velvet Charcoal (`#1A1817`).
- **Trải nghiệm**: Circular countdown 30–45s khi nhận đơn khẩn cấp, Live GPS marker tracking thời gian thực, Before/After image slider so sánh mặt mộc và sau make-up.

---

## 2. Bảng Mã Màu & Design Tokens Chuẩn (Tailwind CSS Config)

Được định cấu hình tập trung trong `code/frontend/tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./public/**/*.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'serif'], // Dành riêng cho tiêu đề dịch vụ VIP B2C
      },
      colors: {
        // Tông màu chủ đạo quản trị (Admin & Agency Portal)
        brand: {
          primary: '#E11D48', // Rose-600
          hover: '#BE123C',   // Rose-700
          light: '#FFE4E6',   // Rose-100
          dark: '#9F1239',    // Rose-800
        },
        // Bảng màu trạng thái ngữ nghĩa (Semantic Status Tokens)
        status: {
          active: '#10B981',    // Emerald-500: Hoạt động, Đã xác thực, Đạt chuẩn
          pending: '#F59E0B',   // Amber-500: Chờ phê duyệt, Đang chờ xử lý
          danger: '#EF4444',    // Rose-500: Từ chối, Xung đột giờ, Đã hủy, Lỗi
          inactive: '#64748B',  // Slate-500: Tạm ngưng, Bản nháp, Vô hiệu
        },
        // Bề mặt giao diện trung tính (Neutral Surfaces)
        surface: {
          canvas: '#F8FAFC',    // Slate-50: Nền tổng thể
          card: '#FFFFFF',      // Nền thẻ card & bảng dữ liệu
          muted: '#F1F5F9',     // Slate-100: Nền thanh công cụ, thead bảng
          border: '#E2E8F0',    // Slate-200: Viền thẻ và đường kẻ bảng
          subtle: '#CBD5E1',    // Slate-300: Viền khi hover
        }
      },
      boxShadow: {
        'clean': '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'modal': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      }
    }
  },
  plugins: []
}
```

---

## 3. Quy Chuẩn Badge Trạng Thái Ngữ Nghĩa (Status Badges)

Mọi trạng thái trong bảng dữ liệu hoặc thẻ card bắt buộc dùng đúng cú pháp:

```jsx
// 1. Hoạt động / Đã xác thực / Thành công (Active / Approved)
<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
  Đã xác thực / Hoạt động
</span>

// 2. Chờ phê duyệt / Chờ phản hồi (Pending / In Review)
<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span>
  Chờ phê duyệt
</span>

// 3. Từ chối / Xung đột ca / Lỗi (Rejected / Overlap Conflict / Danger)
<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>
  Đã từ chối / Xung đột giờ
</span>

// 4. Tạm ngưng / Bản nháp (Inactive / Draft)
<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
  Tạm ngưng / Bản nháp
</span>
```

---

## 4. Các Mẫu Giao Diện Quản Trị Đặc Thù (Admin & Agency UI Patterns)

### 4.1. Top Role Switcher Header (Thanh Điều Hướng Vai Trò & Tài Khoản)
- Thanh cố định trên cùng (`h-14 bg-slate-900 text-white sticky top-0 z-50`).
- Cung cấp nút chuyển đổi nhanh giữa **Super Admin** và **Agency Admin** phục vụ demo và kiểm thử.
- Tích hợp bộ chuyển đổi ngôn ngữ Vi/En (`PUT /api/v1/auth/language`), avatar người dùng và nút Đăng xuất.

### 4.2. Thẻ Chỉ Số Tổng Quan (Metric Card)
- Bố cục 4 cột linh hoạt (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`).
- Hiển thị nhãn chỉ số, số liệu lớn `text-2xl font-bold`, xu hướng biến động và icon trực quan đặt trong ô tròn màu nền nhạt.

### 4.3. Bảng Dữ Liệu Tối Giản Mật Độ Cao (Data-Dense Table)
- Header `bg-slate-100/75 text-xs font-semibold uppercase text-slate-600 tracking-wider`.
- Các hàng có đường viền mảnh `border-b border-slate-100`, hiệu ứng hover nhẹ `hover:bg-slate-50/80`.
- Cột thao tác (Actions) luôn nằm ở vị trí tận cùng bên phải, căn lề phải.
- Phân trang dưới đáy bảng hiển thị số bản ghi hiện tại và các nút trang gọn gàng.

### 4.4. Modal Soi Bằng Cấp MUA (`CertificateReviewModal`)
- Modal kích thước lớn (`max-w-2xl`), hiển thị ảnh chứng chỉ gốc sắc nét kèm tính năng xem chi tiết.
- Hiển thị đầy đủ tiểu sử, số năm kinh nghiệm và chuyên môn của MUA.
- Ô nhập lý do từ chối (`verificationNote`) bắt buộc kiểm tra validation khi người quản trị bấm **Từ chối hồ sơ**.
- 2 nút bấm rõ ràng: Nút Xanh lá (Phê duyệt chứng chỉ) và Nút Đỏ (Từ chối hồ sơ).

### 4.5. Modal Sinh Mã & QR Tuyển Dụng Thợ (ZXing 72h)
- Sinh mã mời thợ dạng `INV-AG1-XXXXXX`.
- Hiển thị mã QR rõ nét để thợ mở ứng dụng MUA quét gia nhập Studio.
- Đồng hồ đếm ngược 72 giờ hiển thị trực quan (`badge bg-amber-50 text-amber-800`).
- Nút bấm **Sao chép Link mời** và **Tải ảnh QR**.

### 4.6. Ma Trận Xếp Ca Tuần & Phát Hiện Trùng Giờ (Weekly Shift Matrix & Conflict Detector)
- Lưới 7 cột tương ứng với các ngày từ **Thứ Hai đến Chủ Nhật**.
- Mỗi ca làm việc hiển thị tên ca, tên thợ đảm nhiệm, khung giờ trực.
- Form phân ca mới tích hợp bộ kiểm tra xung đột thời gian thực: nếu khung giờ thêm mới trùng với ca đã có của thợ trong ngày, giao diện tự động khóa nút lưu và hiển thị banner cảnh báo đỏ nổi bật (`bg-rose-50 border-rose-200 text-rose-700`).

### 4.7. Thông Báo Nổi (Toast Notification)
- Tọa độ cố định góc dưới bên phải (`fixed bottom-5 right-5 z-50`).
- Tự động biến mất sau 3 giây với hiệu ứng trượt mượt mà.
- 3 trạng thái: Thành công (`bg-emerald-900 text-emerald-100`), Lỗi (`bg-rose-900 text-rose-100`), Thông tin (`bg-slate-900 text-slate-100`).

---

## 5. Tiêu Chuẩn Kiểm Thử Trải Nghiệm & Responsive (UX Checklist)
- [ ] **Mật độ dữ liệu cao**: Bảng phân trang gọn gàng (10 - 20 dòng/trang), không tràn thanh cuộn ngang toàn trang.
- [ ] **Tương phản & Trợ năng (a11y)**: Đạt chuẩn WCAG AA với văn bản `text-slate-900` trên nền `bg-white` / `bg-slate-50`.
- [ ] **Modal & Dialogs**: Mở nhanh, có nút đóng "x" rõ ràng và hỗ trợ phím tắt `Esc` để thoát.
- [ ] **Cảnh báo xung đột thời gian thực**: Khi thao tác xếp ca bị trùng giờ của thợ, tự động vô hiệu hóa nút Lưu và hiển thị banner cảnh báo đỏ nổi bật.
