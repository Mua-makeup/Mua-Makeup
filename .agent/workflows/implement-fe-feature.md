---
name: implement-fe-feature
description: Universal workflow for developing ANY new UI module, page, or feature on React + Vite + JavaScript (JSX).
version: 2.0.0
---

# Universal Workflow: Implement Frontend Feature

## Phase 1: Contract & Data Validation (Zod Schema)
1. Xác định dữ liệu form và payload tương ứng từ Backend.
2. Tạo file `src/schemas/<feature>.schema.js` định nghĩa các validation rules với thông báo lỗi thân thiện.
3. Xuất schema ra để form handler và service cùng tái sử dụng.

## Phase 2: API Service & HTTP Client
1. Tạo file `src/services/<feature>.service.js`.
2. Định nghĩa các hàm CRUD / Action sử dụng `apiClient` từ `src/services/api-client.js`.
3. Quản lý URL endpoint thông qua `src/constants/<feature>.constant.js`.

## Phase 3: State & Custom Hooks
1. Nếu tính năng cần chia sẻ state toàn cục (giỏ hàng, thông tin đăng nhập, danh sách yêu thích), tạo Zustand store tại `src/store/<feature>Store.js`.
2. Nếu tính năng có logic xử lý phức tạp (gọi API, phân trang, filter), trừu tượng hóa vào custom hook `src/hooks/use<Feature>.js`.

## Phase 4: UI Components & Styling
1. Tạo thư mục `src/components/features/<feature>/` chứa các component con phục vụ riêng cho tính năng này.
2. Tái sử dụng các UI components cơ sở từ `src/components/base/` (`BaseButton.jsx`, `BaseInput.jsx`, `BaseTable.jsx`...).
3. Áp dụng chuẩn màu sắc và typography từ `tailwind.config.js` (`brand-*`, `surface-*`).

## Phase 5: Page Assembly & Routing
1. Ghép nối component thành màn hình hoàn chỉnh tại `src/pages/<Feature>/<Feature>Page.jsx`.
2. Đặt page vào Layout tương ứng (`MainLayout.jsx`, `AuthLayout.jsx`, `AdminLayout.jsx`).
3. Đăng ký route tại `src/routes/index.jsx`.

## Phase 6: Linting & Quality Verification
1. Chạy `npm run lint` để kiểm tra ranh giới folder (`eslint-plugin-boundaries`), cấm unused imports, cấm magic numbers.
2. Chạy `npm run build` để đảm bảo bundle Vite không gặp lỗi biên dịch.
