---
name: ui-ux-design-system
description: Luxury Beauty & Glamour UI/UX Design System standard for the Makeup Booking Platform Frontend (Tailwind CSS, design tokens, micro-animations, glassmorphism, responsive mobile-first, and rich UI components).
version: 1.0.0
tags: [frontend, ui-ux, design-system, tailwindcss, luxury-beauty, animations, components]
---

# Luxury Beauty UI/UX Design System Skill

## 1. Triết lý Thiết kế (Design Philosophy)
Nền tảng Đặt lịch Make-up hướng tới phân khúc dịch vụ làm đẹp, thẩm mỹ cao cấp. Giao diện người dùng phải toát lên vẻ **Sang trọng (Luxury)**, **Thanh lịch (Elegance)** và **Hiện đại (State-of-the-Art)**:
- **Tông màu chủ đạo**: Rose Gold, Champagne Gold, Nude Tone kết hợp nền Dark Velvet / Crystal White.
- **Glassmorphism & Gradients**: Đổ bóng mềm mại, hiệu ứng mờ kính (Backdrop blur), viền border tinh tế.
- **Micro-animations**: Chuyển động mượt mà khi hover, đếm ngược nhận đơn pulse effect, tiến trình tracking GPS theo thời gian thực.
- **Không dùng Placeholder cơ bản**: Mọi hình ảnh danh mục Before/After và portfolio đều phải sắc nét, chuẩn thẩm mỹ makeup.

---

## 2. Bảng Mã Màu Semantic (Tailwind CSS Tokens)

Được cấu hình chuẩn trong `tailwind.config.js` (không bao giờ hard-code mã HEX trong code JSX):

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#D4AF37',     // Champagne Gold - Nút bấm chính, CTA, Huy hiệu VIP
          rose: '#E0A9AF',        // Rose Gold - Điểm nhấn dịch vụ cô dâu, làm đẹp
          accent: '#C58F78',      // Warm Nude - Card hover, badge viền
          dark: '#1A1817',        // Velvet Charcoal - Nền chế độ tối sang trọng
        },
        surface: {
          light: '#FFFDF9',       // Warm Ivory White - Nền sáng
          card: '#FFFFFF',        // Nền Card nổi bật
          muted: '#F5EFEB',       // Nền phụ, input background
          border: '#E8DFD8',      // Viền thanh mảnh
          darkCard: '#24201E',    // Card chế độ Dark Mode
        },
        status: {
          pending: '#F59E0B',     // Chờ xác nhận
          moving: '#3B82F6',      // Thợ đang di chuyển
          inProgress: '#8B5CF6',  // Đang trang điểm
          completed: '#10B981',   // Hoàn thành ca làm
          cancelled: '#EF4444',   // Đã hủy đơn
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'], // Dành cho tiêu đề Banner & Gói dịch vụ VIP
      },
      boxShadow: {
        luxury: '0 10px 30px -5px rgba(212, 175, 55, 0.15)',
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.08)',
      }
    }
  }
}
```

---

## 3. Quy chuẩn Các Component Nghiệp vụ Đặc thù (Domain UI Patterns)

### 3.1. Instant Booking Countdown Modal (Đếm ngược nhận ca 30–45s)
- **Vị trí**: `src/components/features/booking/InstantBookingCountdownModal.jsx`
- **Yêu cầu UI**:
  - Vòng tròn đồng hồ SVG đếm ngược chuyển động tròn mượt mà (Circular progress animation).
  - Màu sắc đổi dần từ Xanh $\rightarrow$ Vàng $\rightarrow$ Đỏ khi thời gian dưới 10 giây.
  - Hiển thị rõ: Khoảng cách (km), Tên gói make-up, Thu nhập nhận được, Địa chỉ khách hàng.
  - Nút "Chấp nhận ca" kích thước lớn, hiệu ứng rung nhẹ (pulse animation).

### 3.2. Realtime GPS Tracking Map Card
- **Vị trí**: `src/components/features/tracking/GpsTrackingView.jsx`
- **Yêu cầu UI**:
  - Tích hợp bản đồ trực quan với marker hoạt họa của Thợ Make-up di chuyển mượt (smooth interpolation).
  - Thanh trạng thái 4 bước: *Đã nhận đơn $\rightarrow$ Đang di chuyển $\rightarrow$ Đã đến nơi $\rightarrow$ Đang make-up*.
  - Nút gọi điện / chat nhanh dạng Float button tiện dụng.

### 3.3. Before / After Image Comparison Slider
- **Vị trí**: `src/components/features/portfolio/BeforeAfterSlider.jsx`
- **Yêu cầu UI**:
  - Cho phép người dùng kéo thanh trượt sang trái/phải để so sánh mặt mộc và kết quả sau khi make-up.
  - Hỗ trợ xem full-screen độ phân giải cao.

### 3.4. Calendar Schedule Dispatching Matrix (Lịch điều phối của Đại lý)
- **Vị trí**: `src/components/features/agency/AgencyCalendarSchedule.jsx`
- **Yêu cầu UI**:
  - Giao diện Timeline ma trận (Hàng: Danh sách Thợ; Cột: Khung giờ trong ngày).
  - Khối màu hiển thị rõ: Ca bận (đã gán), Ca rảnh, Ca chờ duyệt.
  - Hỗ trợ thao tác kéo thả (Drag-and-Drop) để đổi thợ điều phối nhanh chóng.

---

## 4. Quy tắc Kiểm tra UI/UX & Responsive Checklist
- [ ] **Mobile-First**: Tối ưu 100% hiển thị trên màn hình điện thoại (375px - 430px) cho App Khách hàng và MUA.
- [ ] **Accessibility (a11y)**: Tỉ lệ tương phản màu chữ và nền đạt chuẩn WCAG AA.
- [ ] **Loading Skeleton**: Mọi trạng thái chờ tải API đều phải có hiệu ứng Skeleton Shimmer màu champagne nude, không dùng spinner quay đơn điệu.
- [ ] **Empty States**: Khi chưa có đơn hàng/review, hiển thị hình minh họa vector thẩm mỹ kèm nút hành động rõ ràng.
