---
name: react-frontend
description: Universal engineering standards and patterns for developing scalable Frontend features on React + Vite + JavaScript (JSX) with Zod validation, Axios layer, and strict boundaries.
version: 2.0.0
tags: [frontend, react, vite, javascript, tailwindcss, zod, system-wide]
---

# Universal React Frontend Development Skill

## 1. Phạm vi & Mục đích
Skill này định hình quy chuẩn phát triển cho toàn bộ ứng dụng giao diện (`code/front end/`), phục vụ mọi phân hệ nghiệp vụ hiện tại và mở rộng về sau (E-commerce, Dịch vụ Làm đẹp/Makeup, Đặt lịch hẹn, Giỏ hàng, Thanh toán, Quản trị Admin, v.v.).

---

## 2. Kiến trúc Thư mục & Luồng Dữ liệu 1 chiều (Data Flow)
Mỗi tính năng mới được xây dựng theo cấu trúc phân tầng rõ ràng:
```
code/front end/src/
├── schemas/                           # Zod Schemas (Contract dữ liệu & Form Validation)
│   └── <feature>.schema.js
├── services/                          # Tương tác API qua Axios (apiClient)
│   └── <feature>.service.js
├── constants/                         # Hằng số hệ thống (Pagination, Status, Endpoints, Storage keys)
│   └── <feature>.constant.js
├── utils/                             # Hàm tiện ích dùng chung (Formatters, Helpers, Parsers)
│   └── <feature>.util.js
├── hooks/                             # Custom React Hooks logic tái sử dụng
│   └── use<Feature>.js
├── store/                             # Global State Management (Zustand)
│   └── <feature>Store.js
├── components/
│   ├── base/                          # UI nguyên tử tái sử dụng (BaseButton, BaseInput, BaseModal, BaseTable)
│   └── features/<feature>/            # UI chuyên biệt cho từng tính năng
├── layouts/                           # Khung bố cục (MainLayout, AuthLayout, AdminLayout)
├── pages/                             # Màn hình tổng hợp
│   └── <Feature>/<Feature>Page.jsx
└── routes/                            # Quản lý định tuyến (AppRoutes)
```

---

## 3. Quy chuẩn Kỹ thuật Bắt buộc

### 3.1. Ranh giới Module (Enforced by ESLint Boundaries)
- **Tầng Core (`schemas/`, `utils/`, `constants/`)**: Chỉ chứa logic thuần JS, tuyệt đối không phụ thuộc hoặc import từ `components/`, `pages/`, `services/`.
- **Tầng Service (`services/`)**: Chỉ nhận dữ liệu đầu vào đã validate, gửi qua `apiClient` và trả về kết quả hoặc bắt lỗi HTTP.
- **Tầng UI (`components/`, `pages/`)**: Sử dụng Hook/Service/Schema để hiển thị và tương tác.

### 3.2. Form Validation & Data Contract với Zod
Mọi dữ liệu từ người dùng nhập vào hoặc payload gửi lên backend phải được validate qua Zod schema:
```javascript
import { z } from 'zod';

export const makeupBookingSchema = z.object({
  serviceId: z.string().min(1, 'Vui lòng chọn dịch vụ'),
  appointmentDate: z.string().min(1, 'Vui lòng chọn ngày hẹn'),
  customerPhone: z.string().regex(/^(0[3|5|7|8|9])+([0-9]{8})$/, 'Số điện thoại không hợp lệ'),
  note: z.string().max(200, 'Ghi chú tối đa 200 ký tự').optional(),
});
```

### 3.3. Clean Code & Styling
- **Không Magic Numbers**: Đưa các giá trị (thời gian timeout, limit phân trang, kích thước file upload...) vào `constants/`.
- **Không Hard-code Color**: Luôn sử dụng design system từ `tailwind.config.js` (`brand-*`, `surface-*`).
- **File Naming**:
  - React Component: `PascalCase.jsx` (ví dụ: `BookingModal.jsx`, `ServiceCard.jsx`).
  - JS Helpers/Services: `kebab-case.js` (ví dụ: `makeup-service.js`, `booking-schema.js`).
  - Hooks: `use<Name>.js` (ví dụ: `useBooking.js`).

---

## 4. Quy trình triển khai một Feature mới
- [ ] 1. Tạo Zod Schema tại `src/schemas/<feature>.schema.js`.
- [ ] 2. Tạo API service tại `src/services/<feature>.service.js`.
- [ ] 3. Tạo custom hook hoặc store (nếu cần quản lý state phức tạp).
- [ ] 4. Xây dựng các UI Components con trong `src/components/features/<feature>/`.
- [ ] 5. Tổng hợp màn hình tại `src/pages/<Feature>/<Feature>Page.jsx`.
- [ ] 6. Đăng ký route tại `src/routes/index.jsx`.
- [ ] 7. Chạy `npm run lint` đảm bảo 0 lỗi cảnh báo và 0 vi phạm ranh giới.
