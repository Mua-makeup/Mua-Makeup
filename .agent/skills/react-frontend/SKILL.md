---
name: react-frontend
description: Universal engineering standards and patterns for developing scalable Frontend features on React + Vite + JavaScript (JSX) with Zod validation, Axios layer, strict boundaries, and Sentry monitoring.
version: 2.1.0
tags: [frontend, react, vite, javascript, tailwindcss, zod, boundaries, sentry, system-wide]
---

# Universal React Frontend Development Skill

## 1. Phạm vi & Mục đích
Skill này định hình quy chuẩn phát triển cho toàn bộ ứng dụng giao diện (`code/frontend/`), phục vụ 3 phân hệ người dùng chính theo SRS:
- **Phân hệ Khách hàng (Customer)**: Tìm kiếm thợ/đại lý, đặt ca Realtime/Scheduled, xem bản đồ GPS tracking, thanh toán ví/thẻ, đánh giá review.
- **Phân hệ Thợ Make-up Tự do (Freelance MUA)**: Quản lý portfolio, nhận ca đếm ngược 30s, bật GPS tracking, quản lý ví cá nhân.
- **Phân hệ Đại lý Make-up (Agency / Studio)**: Quản lý thợ thuộc quyền, bảng giá đại lý, nhận & điều phối đơn, quản lý ví đại lý.

---

## 2. Kiến trúc Thư mục Chuẩn (Frontend Project Structure)

Mọi tính năng mới được xây dựng theo cấu trúc phân tầng rõ ràng:
```text
code/frontend/
├── .husky/                            # Pre-commit hook chạy lint trước khi git commit
├── public/                            # Tài nguyên tĩnh không qua build (favicon, robots.txt)
├── src/
│   ├── assets/                        # Ảnh, svg, local fonts đi qua Vite build
│   ├── schemas/                       # Validator trên front end (Bắt buộc sử dụng ZOD)
│   ├── services/                      # Các hàm gọi API tới backend qua Axios
│   ├── constants/                     # Định nghĩa hằng số (Status, Enums, Endpoints, cấm Magic Number)
│   ├── utils/                         # Hàm tiện ích dùng chung (Formatters, Geolocation, Currency)
│   ├── hooks/                         # Custom React Hooks (useBooking, useGpsTracker, useAuth)
│   ├── store/                         # Global State Management (Zustand)
│   ├── components/
│   │   ├── base/                      # Atomic UI component (BaseButton, BaseInput, BaseModal, BaseTable)
│   │   └── features/                  # Component theo nghiệp vụ (features/booking/, features/agency/...)
│   ├── layouts/                       # MainLayout, AuthLayout, AgencyLayout, CustomerLayout
│   ├── pages/                         # Màn hình tổng hợp (Auth/, Dashboard/, Booking/, Agency/...)
│   ├── routes/                        # Cấu hình react-router-dom
│   ├── lib/                           # Cấu hình axios instance, websocket client, utils chung
│   ├── styles/                        # Cấu hình CSS theme, global styles
│   ├── providers/                     # React Context Providers (QueryClient, AuthProvider, ThemeProvider)
│   ├── App.jsx                        # Component gốc
│   └── main.jsx                       # Điểm neo vào index.html
├── eslint.config.mjs                  # Linter khắt khe: eslint-plugin-boundaries, kebab-case, cấm magic number, cấm hardcode
├── .prettierrc                        # Cấu hình Prettier format code
├── tailwind.config.js                 # Ghi đè mã màu semantic (brand-*, surface-*)
├── vite.config.js                     # Cấu hình Vite build
├── sentry/                            # Cấu hình ghi nhận crash bug trên production
├── Dockerfile, .dockerignore
└── .env, .env.local, .env.development # Cấu hình biến môi trường
```

---

## 3. Quy chuẩn Kỹ thuật Bắt buộc

### 3.1. Ranh giới Module (Enforced by ESLint Boundaries)
- **Tầng Core (`schemas/`, `utils/`, `constants/`)**: Chỉ chứa logic thuần JavaScript, tuyệt đối không phụ thuộc hoặc import ngược từ `components/`, `pages/`, `services/`.
- **Tầng Service (`services/`)**: Chỉ nhận dữ liệu đã được Zod validate, gửi qua `apiClient` Axios và trả về payload chuẩn.
- **Tầng UI (`components/`, `pages/`)**: Tương tác thông qua Hooks, Services và Schemas.

### 3.2. Form Validation & Data Contract với Zod
Mọi dữ liệu người dùng nhập hoặc payload API gửi lên backend phải có Zod schema tại `src/schemas/`:
```javascript
import { z } from 'zod';

export const instantBookingSchema = z.object({
  serviceId: z.number().positive('Vui lòng chọn dịch vụ make-up'),
  address: z.string().min(5, 'Địa chỉ phải từ 5 ký tự trở lên'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  paymentMethod: z.enum(['MOMO', 'VNPAY', 'WALLET', 'CASH']),
  notes: z.string().max(255).optional(),
});
```

### 3.3. Quy tắc Clean Code & Styling
- **Không Magic Numbers**: Đưa tất cả các hằng số (timeout, countdown 30s, max file upload size 5MB, pagination limit 10) vào `src/constants/`.
- **Không Hard-code Color**: Bắt buộc dùng semantic color tokens từ `tailwind.config.js` (`brand-rose`, `brand-gold`, `surface-dark`, `surface-card`).
- **File Naming Convention**:
  - React Component: `PascalCase.jsx` (`BookingCard.jsx`, `AgencyStaffModal.jsx`).
  - JS Helpers / Services / Schemas: `kebab-case.js` (`booking-service.js`, `agency.schema.js`).
  - Custom Hooks: `use<Name>.js` (`useGpsLocation.js`, `useCountdownTimer.js`).

### 3.4. Chuẩn mực Đa ngôn ngữ (System-Wide i18n & Backend Error Extraction)
- **100% Văn bản UI phải dùng `useI18nStore`**: Tuyệt đối không hardcode text trực tiếp trong JSX. Sử dụng hook:
  ```javascript
  import { useI18nStore } from '../../store/useI18nStore';
  const { t } = useI18nStore();
  // ...
  <h1>{t('agency_overview_title')}</h1>
  ```
- **Đồng bộ song ngữ tại `src/constants/i18n.constant.js`**: Khi thêm key mới, bắt buộc phải khai báo đầy đủ cả 2 mục `TRANSLATIONS.vi` và `TRANSLATIONS.en`.
- **Thông báo Toast & Bóc tách Lỗi Toàn Diện qua `parseApiError`**: Khi bắt lỗi trong `try/catch` hoặc thông báo kết quả API, BẮT BUỘC dùng hàm chuẩn hóa `parseApiError(err)` để trích xuất thông điệp chi tiết và map lỗi trường dữ liệu (`fieldErrors`) vào form:
  ```javascript
  import { parseApiError } from '@/utils/error';

  try {
    const res = await agencyService.updateProfile(payload);
    setToastMessage(res.message || t('save_success'));
  } catch (err) {
    const parsed = parseApiError(err);
    if (parsed.fieldErrors) {
      setFormErrors(parsed.fieldErrors); // Map thẳng lỗi trường dữ liệu vào helper error bên dưới input
    }
    setToastMessage(parsed.message); // Ưu tiên thông điệp chi tiết của trường (ví dụ: "Mật khẩu phải chứa...") thay vì câu chung chung
  }
  ```
- **Tự động gửi Header `Accept-Language`**: `apiClient` luôn gửi `Accept-Language: vi` hoặc `en` theo cài đặt hiện tại của người dùng.

---

## 4. Quy trình triển khai một UI Feature mới
- [ ] 1. Tạo Zod Schema tại `src/schemas/<feature>.schema.js`.
- [ ] 2. Định nghĩa hằng số, status enums tại `src/constants/<feature>.constant.js`.
- [ ] 3. Tạo API service tại `src/services/<feature>.service.js`.
- [ ] 4. Tạo custom hook hoặc Zustand store tại `src/hooks/` hoặc `src/store/`.
- [ ] 5. Xây dựng Atomic UI components cơ sở trong `src/components/base/` và Feature components trong `src/components/features/<feature>/`.
- [ ] 6. Ghép màn hình hoàn chỉnh tại `src/pages/<Feature>/<Feature>Page.jsx` và gắn Layout phù hợp.
- [ ] 7. Đăng ký route tại `src/routes/index.jsx`.
- [ ] 8. Chạy `npm run lint` đảm bảo 0 warning, 0 error và tuân thủ ranh giới folder.
