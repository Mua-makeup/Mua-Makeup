---
name: implement-admin-agency-fe
description: Universal step-by-step workflow for developing Clean, Minimalist, Data-Dense Admin and Agency frontend modules (SUPER_ADMIN & AGENCY_ADMIN) on React + Vite + Zod + Tailwind.
version: 1.0.0
---

# Workflow: Implement Clean Admin & Agency Frontend Feature

Quy trình chuẩn 6 bước để phát triển bất kỳ màn hình hoặc module quản trị nào dành cho **Super Admin** hoặc **Agency Admin**, đảm bảo tuân thủ kiến trúc phân tầng, Zod schema, ranh giới thư mục và phong cách UI tối giản, không lòe loẹt.

---

## Phase 1: API Contract & Zod Validation Schema
1. Khảo sát Endpoint Backend và Request/Response DTO tương ứng.
2. Tạo file schema tại `src/schemas/superAdminSchema.js` hoặc `src/schemas/agencySchema.js`.
3. Định nghĩa các quy tắc kiểm tra dữ liệu bằng Zod (bắt buộc thông điệp lỗi tiếng Việt rõ ràng, dễ hiểu).

---

## Phase 2: Constants & API Service Layer
1. Khai báo các hằng số, trạng thái (status enums), tabs điều hướng trong `src/constants/superAdminConstants.js` hoặc `src/constants/agencyConstants.js`.
2. Định nghĩa hàm gọi API tại `src/api/superAdminApi.js` hoặc `src/api/agencyApi.js` sử dụng instance Axios `apiClient` từ `src/lib/api-client.js`.
3. Tuyệt đối không gọi trực tiếp Axios trong thân component giao diện.

---

## Phase 3: State Management & Custom Hooks
1. Nếu dữ liệu cần dùng chung giữa nhiều trang (thông tin Studio, danh sách thợ, chỉ số toàn sàn), khai báo tại Zustand store `src/store/useSuperAdminStore.js` hoặc `src/store/useAgencyStore.js`.
2. Tạo custom hook xử lý nghiệp vụ (gọi API, lọc, tìm kiếm, phân trang) tại `src/hooks/` để giữ cho UI component gọn nhẹ và tập trung vào hiển thị.

---

## Phase 4: Xây Dựng Component Giao Diện Tối Giản (Clean UI)
1. Tạo component con phục vụ riêng nghiệp vụ tại:
   - `src/components/features/admin/` (cho Super Admin).
   - `src/components/features/agency/` (cho Agency Admin).
2. Tái sử dụng tối đa các thành phần cơ sở chuẩn mực từ `src/components/base/` (`Button`, `Input`, `Select`, `Badge`, `DataTable`, `Modal`, `ConfirmDialog`, `Skeleton`).
3. **Tuân thủ quy chuẩn UI sạch**:
   - Sử dụng nền `bg-slate-50`, thẻ `bg-white border-slate-200`.
   - Phân biệt trạng thái bằng Badge ngữ nghĩa (Xanh / Vàng / Đỏ / Xám).
   - Không sử dụng hiệu ứng bóng mờ phức tạp (glassmorphism), không dùng neon chói lọi, không dùng gradient màu mè.
4. Luôn xử lý đủ 3 trạng thái: Đang tải (`Skeleton`), Dữ liệu trống (`Empty State`), và Thông báo lỗi (`Toast/Alert`).

---

## Phase 5: Ghép Màn Hình & Bảo Vệ Tuyến Đường (Layout & Routing)
1. Ghép nối component thành trang hoàn chỉnh tại:
   - `src/pages/SuperAdmin/<PageName>Page.jsx`
   - hoặc `src/pages/Agency/<PageName>Page.jsx`
2. Bọc trang bên trong Layout quản trị tương ứng:
   - `AdminLayout.jsx` (Dành cho Super Admin).
   - `AgencyLayout.jsx` (Dành cho Agency Admin).
3. Đăng ký tuyến đường tại `src/routes/index.jsx` và bao bọc bằng `ProtectedRoute` kết hợp `RoleBasedRoute` (`allowedRoles={['ROLE_SUPER_ADMIN']}` hoặc `allowedRoles={['ROLE_AGENCY_ADMIN']}`).

---

## Phase 6: Kiểm Tra Chất Lượng & Xác Minh (Verification)
1. Chạy kiểm tra linting: `npm run lint` để đảm bảo không vi phạm ranh giới thư mục (`boundaries`), không còn unused import hay magic numbers.
2. Kiểm tra biên dịch: `npm run build` đảm bảo bundle Vite không phát sinh lỗi TypeScript/JSX.
3. Thao tác kiểm thử giao diện trên trình duyệt: Thử nghiệm phân trang, tìm kiếm, mở modal và kiểm tra tính trực quan trên màn hình Desktop và Tablet.
