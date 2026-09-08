---
name: implement-fe-feature
description: Universal workflow for developing ANY new UI module, page, or feature on React + Vite + JavaScript (JSX) with Zod validation, Luxury Beauty styling, and strict ESLint boundaries.
version: 2.1.0
---

# Universal Workflow: Implement Frontend Feature

## Phase 1: Contract & Data Validation (Zod Schema)
1. Xác định dữ liệu form và payload tương ứng từ Backend DTO.
2. Tạo file `src/schemas/<feature>.schema.js` định nghĩa các validation rules với thông báo lỗi tiếng Việt thân thiện, rõ ràng.
3. Xuất schema ra để form handler (`react-hook-form` / form custom) và service cùng tái sử dụng.

## Phase 2: Constants & API Service
1. Định nghĩa các hằng số nghiệp vụ, enum status, URL endpoints trong `src/constants/<feature>.constant.js` (Tuyệt đối không dùng Magic Numbers).
2. Tạo file `src/services/<feature>.service.js`.
3. Định nghĩa các hàm gọi API sử dụng `apiClient` Axios từ `src/lib/api-client.js`.

## Phase 3: State & Custom Hooks
1. Nếu tính năng cần chia sẻ state toàn cục (thông tin user, ca đặt realtime, giỏ hàng dịch vụ), tạo Zustand store tại `src/store/<feature>Store.js`.
2. Trừu tượng hóa logic phức tạp (gọi API, phân trang, debounced search, filter, WebSocket subscription) vào custom hook tại `src/hooks/use<Feature>.js`.

## Phase 4: UI Components & Luxury Beauty Styling
1. Tạo thư mục `src/components/features/<feature>/` chứa các component con phục vụ riêng cho tính năng.
2. Tái sử dụng các UI components cơ sở từ `src/components/base/` (`BaseButton.jsx`, `BaseInput.jsx`, `BaseModal.jsx`, `BaseTable.jsx`...).
3. Áp dụng chuẩn màu sắc từ `tailwind.config.js` (`brand-primary`, `brand-rose`, `surface-card`, `surface-light`), micro-animations và typography thanh lịch.
4. Xử lý đầy đủ 3 trạng thái giao diện: **Loading (Skeleton Shimmer)**, **Empty State**, và **Error Alert**.

## Phase 5: Page Assembly & Layout Routing
1. Ghép nối component thành màn hình hoàn chỉnh tại `src/pages/<Feature>/<Feature>Page.jsx`.
2. Bao bọc page bằng Layout tương ứng (`MainLayout.jsx`, `AuthLayout.jsx`, `AgencyLayout.jsx`, `CustomerLayout.jsx`).
3. Đăng ký route tại `src/routes/index.jsx`.

## Phase 6: Linting & Quality Verification
1. Chạy `npm run lint` để kiểm tra ranh giới folder (`eslint-plugin-boundaries`), cấm unused imports, cấm magic numbers, cấm hardcode colors.
2. Chạy `npm run build` đảm bảo bundle Vite không gặp lỗi biên dịch.
3. Kiểm tra tích hợp Sentry bắt exception ngoại lệ trên giao diện.
