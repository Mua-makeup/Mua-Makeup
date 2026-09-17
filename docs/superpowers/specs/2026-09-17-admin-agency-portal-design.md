# ĐẶC TẢ THIẾT KẾ HỆ THỐNG: SUPER_ADMIN & AGENCY_ADMIN PORTAL & 3D ARCHITECTURAL LANDING PAGE

**Ngày tạo**: 2026-09-17  
**Dự án**: Nền tảng Đặt lịch Make-up (Makeup Booking Platform)  
**Công nghệ**: React 18 + Vite + TailwindCSS + Zod + Zustand + Axios + Lucide Icons + HTML5 Canvas 3D + CSS 3D Perspective  
**Phân quyền**: Super Admin (`ROLE_SUPER_ADMIN`), Agency Admin (`ROLE_AGENCY_ADMIN`), Public Landing (`/`), và Trang 404 (`*`)

---

## 1. MỤC TIÊU & TÔN CHỈ THIẾT KẾ

### 1.1. Mục tiêu
Xây dựng trọn vẹn toàn bộ giao diện Frontend chuyên biệt phục vụ 2 phân quyền quản trị cao cấp nhất của hệ thống:
1. **Super Admin (`ROLE_SUPER_ADMIN`)**: Quản trị vận hành sàn, kiểm duyệt bằng cấp & chứng chỉ MUA, quản trị danh mục dịch vụ gốc và phong cách make-up chuẩn sàn, theo dõi trạng thái Core API & PostgreSQL.
2. **Agency Admin (`ROLE_AGENCY_ADMIN`)**: Chủ Studio / Đại lý Make-up. Quản lý hồ sơ thương hiệu, cấu hình gói dịch vụ, quy trình make-up & Add-ons, chính sách phụ phí di chuyển/lễ tết, quy tắc phụ phí làm thêm giờ (Overtime), tuyển dụng thợ qua mã mời/QR (ZXing 72h), phân chia % hoa hồng, gán Tone sở trường & gói dịch vụ cho thợ, và ma trận xếp ca trực 7 ngày/tuần chống trùng giờ.
3. **Public 3D Landing Page (`/`)**: Trang chủ giới thiệu toàn diện kiến trúc công nghệ đa tầng của nền tảng (8 Schemas PostgreSQL, PostGIS, Monolith Core API, Redis GEO, Embedded WebSocket STOMP, Escrow Ledger) bằng Canvas 3D và CSS 3D Isometric Stack, kèm lối tắt vào cổng quản trị.
4. **404 Not Found Page (`*`)**: Trang thông báo không tìm thấy đường dẫn với thiết kế thanh lịch, thông minh điều hướng về Dashboard theo Role của phiên đăng nhập.

### 1.2. Tôn chỉ Thiết kế (Design Principles)
* **Clean, Minimalist & High Data-Density**: Tối giản, tập trung vào hiệu suất công việc, bảng dữ liệu mật độ cao, lọc và tìm kiếm tức thì. Tuyệt đối không lòe loẹt, không gradient phức tạp hay glassmorphism mờ gây giật lag bảng dữ liệu.
* **Chuẩn màu sắc**:
  - Nền trang: `bg-slate-50` (`#F8FAFC`)
  - Bảng & Thẻ: `bg-white` (`#FFFFFF`), viền `border-slate-200`
  - Màu thương hiệu chính (Primary): Rose (`bg-rose-600 hover:bg-rose-700 text-white`)
  - Trạng thái ngữ nghĩa: Active (Xanh lá `emerald`), Pending (Vàng `amber`), Danger/Overdue (Đỏ `rose`), Draft/Inactive (Xám `slate`)
* **100% Zod Validation**: Mọi form nhập liệu và request payload đều được validate chặt chẽ qua Zod trước khi gọi API.
* **100% Khớp Endpoint Backend**: Không hardcode URL, sử dụng chuẩn DTO và Enums của backend `code/backend/core-api`.

---

## 2. KIẾN TRÚC ĐIỀU HƯỚNG & PHÂN QUYỀN (ROUTING)

### 2.1. Ma trận Tuyến đường (Routes Matrix)

| Tuyến Đường | Quyền Hạn | Component | Mô Tả Nghiệp Vụ |
| :--- | :--- | :--- | :--- |
| `/` | Public | `LandingPage` | Trang chủ 3D tổng quan kiến trúc nền tảng, nút CTA vào `/login` |
| `/login` | Public | `LoginPage` | Đăng nhập chung, tự động redirect theo Role sau khi xác thực |
| `/admin/dashboard` | `ROLE_SUPER_ADMIN` | `AdminDashboardPage` | Chỉ số sàn, trạng thái kết nối Core API, danh sách MUA chờ duyệt |
| `/admin/muas/credentials` | `ROLE_SUPER_ADMIN` | `MuaVerificationPage` | Duyệt / từ chối chứng chỉ hành nghề MUA |
| `/admin/taxonomy` | `ROLE_SUPER_ADMIN` | `TaxonomyManagementPage` | Quản trị danh mục dịch vụ gốc và phong cách make-up chuẩn sàn |
| `/agency/dashboard` | `ROLE_AGENCY_ADMIN` | `AgencyDashboardPage` | Báo cáo KPI Studio, lối tắt sinh mã QR tuyển dụng, xếp ca |
| `/agency/profile` | `ROLE_AGENCY_ADMIN` | `AgencyProfilePage` | Hồ sơ Studio & % hoa hồng nội bộ mặc định (0% - 60%) |
| `/agency/packages` | `ROLE_AGENCY_ADMIN` | `ServicePackageListPage` | Danh sách gói dịch vụ, bật/tắt nhận đơn, quản lý quy trình & Add-ons |
| `/agency/surcharges` | `ROLE_AGENCY_ADMIN` | `SurchargeConfigPage` | Cấu hình phụ phí km, đêm muộn, lễ tết & quy tắc/báo cáo Overtime |
| `/agency/staff` | `ROLE_AGENCY_ADMIN` | `StaffManagementPage` | Quản lý thợ, duyệt đơn xin vào, mã QR 72h, hoa hồng, styles & packages |
| `/agency/shifts` | `ROLE_AGENCY_ADMIN` | `ShiftSchedulePage` | Ma trận phân ca tuần 7 ngày với thuật toán chặn trùng giờ |
| `*` | Mọi đối tượng | `NotFoundPage` | Trang 404 Not Found kèm nút quay về Dashboard theo Role |

### 2.2. Guards Bảo Vệ
- **`ProtectedRoute`**: Kiểm tra trạng thái đăng nhập từ `useAuthStore`. Nếu chưa đăng nhập, lưu lại path hiện tại và chuyển hướng về `/login`.
- **`RoleBasedRoute`**: Kiểm tra `allowedRoles`. Nếu User không đủ quyền (ví dụ Agency Admin cố truy cập `/admin/*` hoặc Super Admin cố truy cập `/agency/*`), hệ thống chặn truy cập và hiển thị màn hình 403 Forbidden hoặc điều hướng về Dashboard đúng quyền.

---

## 3. CẤU TRÚC MÃ NGUỒN FRONTEND (`code/frontend/src/`)

```text
code/frontend/src/
├── api/
│   ├── apiClient.js                   # Axios base client (Base URL: http://localhost:8080, Token Interceptor, 401 handling)
│   ├── authApi.js                     # /api/v1/auth/* (login, logout, me, refresh-token, change-password, language)
│   ├── superAdminApi.js               # /api/v1/admin/muas/{id}/certificates/verify, /api/v1/master-categories, /api/v1/makeup-styles
│   └── agencyApi.js                   # profile, invitations, staff, packages, items, surcharges, shifts, overtime
├── schemas/
│   ├── authSchema.js                  # LoginReq, ChangePasswordReq
│   ├── superAdminSchema.js            # VerifyCertificateReq (bắt buộc notes nếu từ chối)
│   └── agencySchema.js                # Package, PackageItem, Surcharge, Shift, OvertimeRule, Commission
├── constants/
│   ├── authConstants.js               # USER_ROLES, STORAGE_KEYS
│   ├── superAdminConstants.js         # CERT_STATUS, TAXONOMY_TABS
│   └── agencyConstants.js             # SHIFT_DAYS, SURCHARGE_TYPES, STAFF_STATUS, OVERTIME_STATUS
├── store/
│   ├── useAuthStore.js                # user, token, role, isAuthenticated, login, logout, checkAuth
│   ├── useSuperAdminStore.js          # credentials list, categories, styles, stats
│   └── useAgencyStore.js              # profile, staff, packages, shifts, surcharges, overtime
├── hooks/
│   ├── useAuth.js                     # Context session & role helper
│   ├── usePagination.js               # Phân trang bảng dữ liệu
│   └── useShiftConflict.js            # Thuật toán phát hiện xung đột giờ trực ca thời gian thực
├── components/
│   ├── base/                          # Thành phần UI cơ bản chuẩn WCAG AA
│   │   ├── Button.jsx                 # Variants: primary, secondary, danger, outline, ghost
│   │   ├── Input.jsx                  # Input field kèm Zod error label
│   │   ├── Select.jsx                 # Dropdown select chuẩn
│   │   ├── Textarea.jsx               # Textarea nhiều dòng
│   │   ├── Badge.jsx                  # Semantic Status Badge (Active, Pending, Rejected, Draft)
│   │   ├── DataTable.jsx              # Bảng dữ liệu chuẩn (Pagination, Empty state, Sticky header)
│   │   ├── Modal.jsx                  # Hộp thoại pop-up kèm phím Esc và nút đóng
│   │   ├── ConfirmDialog.jsx          # Hộp thoại xác nhận thao tác nguy hiểm
│   │   ├── Skeleton.jsx               # Shimmer loading
│   │   └── Toast.jsx                  # Thông báo nổi góc màn hình
│   ├── layout/                        # Khung quản trị
│   │   ├── TopRoleBanner.jsx          # Thanh header trên cùng: Role badge, profile info, đổi pass, đăng xuất
│   │   ├── AdminLayout.jsx            # Layout chuyên biệt Super Admin
│   │   ├── AgencyLayout.jsx           # Layout chuyên biệt Agency Admin
│   │   └── Sidebar.jsx                # Menu điều hướng chuyên biệt theo Role
│   └── features/                      # Thành phần nghiệp vụ
│       ├── landing/
│       │   ├── Canvas3DConstellation.jsx # Vẽ mạng lưới hạt không gian 3D tương tác theo chuột
│       │   └── IsometricArchitectureStack.jsx # Mô hình 3D isometric 4 tầng công nghệ
│       ├── admin/
│       │   ├── MuaCredentialTable.jsx
│       │   └── CertificateReviewModal.jsx
│       └── agency/
│           ├── PackageFormModal.jsx
│           ├── PackageItemManager.jsx
│           ├── SurchargeConfigCard.jsx
│           ├── OvertimeConfigCard.jsx
│           ├── StaffInvitationModal.jsx # Hiển thị mã QR ZXing 72h, tải ảnh PNG, sao chép mã
│           ├── StaffCommissionModal.jsx
│           ├── StaffStyleAssignModal.jsx
│           ├── StaffPackageAssignModal.jsx
│           └── WeeklyShiftTable.jsx   # Lưới xếp ca tuần tích hợp chặn trùng giờ
└── pages/
    ├── Landing/
    │   └── LandingPage.jsx            # Trang chủ 3D tổng quan kiến trúc nền tảng
    ├── Auth/
    │   └── LoginPage.jsx              # Trang đăng nhập quản trị
    ├── NotFound/
    │   └── NotFoundPage.jsx           # Trang 404 Not Found
    ├── SuperAdmin/
    │   ├── AdminDashboardPage.jsx
    │   ├── MuaVerificationPage.jsx
    │   └── TaxonomyManagementPage.jsx
    └── Agency/
        ├── AgencyDashboardPage.jsx
        ├── AgencyProfilePage.jsx
        ├── ServicePackageListPage.jsx
        ├── SurchargeConfigPage.jsx
        ├── StaffManagementPage.jsx
        └── ShiftSchedulePage.jsx
```

---

## 4. CHI TIẾT CÁC PHÂN HỆ NGHIỆP VỤ & API MAPPING

### 4.1. Public Landing Page 3D (`LandingPage.jsx`)
- **Hero Canvas 3D Constellation**: Canvas vòng lặp 60fps vẽ hàng trăm nút hạt 3D và tia liên kết mô phỏng mạng lưới phân phối dịch vụ làm đẹp thời gian thực giữa Khách hàng, Thợ Freelancer MUA, Studio Agency và Super Admin.
- **Interactive 3D Isometric Stack**: 4 tầng kiến trúc công nghệ có thể tương tác xoay góc nhìn theo con trỏ chuột:
  1. *Tầng 1: Data Storage*: PostgreSQL 16 + 8 Schemas + PostGIS Geometry Point 4326.
  2. *Tầng 2: Core Monolith*: Spring Boot Core API + Redisson Lock + Double-Entry Escrow Ledger.
  3. *Tầng 3: Realtime Telemetry*: WebSocket STOMP `/ws-makeup` + Redis GEO (Quét 5-15km, đếm ngược 30s).
  4. *Tầng 4: Operation Portals*: Super Admin & Agency Admin.
- Nút CTA "Truy cập Cổng Quản Trị" điều hướng vào `/login`.

### 4.2. Cổng Quản Trị Super Admin
- **Màn hình A1: Tổng quan Nền tảng (`AdminDashboardPage`)**:
  - Thống kê: Hồ sơ chờ duyệt, Studio hoạt động, Gói dịch vụ toàn sàn, Trạng thái Core API.
- **Màn hình A2: Xét duyệt Chứng chỉ MUA (`MuaVerificationPage`)**:
  - API: `PUT /api/v1/admin/muas/{muaId}/certificates/verify`
  - DTO: `VerifyCertificateReq` (`{ certIndex, imageUrl, isVerified, notes }`)
  - Modal xem ảnh chứng chỉ gốc độ nét cao, phê duyệt hoặc từ chối kèm nhập lý do.
- **Màn hình A3: Quản lý Danh mục & Phong cách (`TaxonomyManagementPage`)**:
  - API: `GET /api/v1/master-categories`, `GET /api/v1/makeup-styles`
  - Danh mục dịch vụ gốc và Tone trang điểm chuẩn sàn.

### 4.3. Cổng Quản Trị Agency Admin
- **Màn hình B1: Tổng quan Studio (`AgencyDashboardPage`)**:
  - Thống kê Studio: Số thợ trực thuộc, số gói dịch vụ, điểm đánh giá trung bình, % hoa hồng nội bộ mặc định.
- **Màn hình B2: Hồ sơ & Chính sách Hoa hồng (`AgencyProfilePage`)**:
  - API: `GET/PUT /api/v1/agencies/profile` & `PUT /api/v1/agencies/commission`
  - Tên Studio, Hotline, Địa chỉ, Logo, % hoa hồng nội bộ mặc định (0% - 60%).
- **Màn hình B3: Quản lý Gói Dịch vụ & Add-ons (`ServicePackageListPage`)**:
  - API: `GET /api/v1/packages/my`, `POST/PUT/DELETE /api/v1/packages`, `PATCH /api/v1/packages/{id}/availability`
  - Quy trình & Add-ons: `GET/POST/PUT/DELETE /api/v1/packages/{packageId}/items` (`COMPONENT` hoặc `ADD_ON`).
- **Màn hình B4: Cấu hình Phụ phí & Quản lý Overtime (`SurchargeConfigPage`)**:
  - Phụ phí: `GET /api/v1/surcharges/my-surcharges`, `POST/PUT/DELETE /api/v1/surcharges` (km, đêm muộn, lễ tết).
  - Tăng ca Overtime: `POST/GET/DELETE /api/v1/agency/overtime-rules`, `GET/POST /api/v1/agency/overtime-reports` (Xét duyệt báo cáo tăng ca).
- **Màn hình B5: Quản lý Thợ, Tuyển dụng QR 72h & Phân quyền (`StaffManagementPage`)**:
  - Mã mời & QR: `POST /api/v1/agencies/invitations`, `GET /api/v1/agencies/invitations`, `DELETE /api/v1/agencies/invitations/{inviteCode}`.
  - Hiển thị ảnh QR từ `qrCodeBase64` quét được 100% bằng điện thoại, nút copy mã mời, copy link, tải ảnh PNG, đồng hồ đếm ngược 72h.
  - Danh sách thợ & Duyệt đơn: `GET /api/v1/agencies/staff`, `PUT /api/v1/agencies/staff/{staffId}/review`, `PUT /api/v1/agencies/staff/{staffId}/status`.
  - Hoa hồng cá nhân: `PUT /api/v1/agencies/staff/{staffId}/commission`.
  - Gán Tone thế mạnh & Gói dịch vụ: `GET/PUT /api/v1/agencies/staff/{staffId}/styles` & `GET/PUT /api/v1/agencies/staff/{staffId}/packages`.
- **Màn hình B6: Ma trận Xếp Ca Tuần Chống Trùng Giờ (`ShiftSchedulePage`)**:
  - API: `POST /api/v1/agencies/shifts`, `GET /api/v1/agencies/shifts/matrix`, `DELETE /api/v1/agencies/shifts/{shiftId}`.
  - Tích hợp hook `useShiftConflict` tự động đối soát khung giờ `[startTime, endTime]`. Nếu trùng với ca đã có của thợ trong ngày, tự động vô hiệu hóa nút Lưu và hiển thị cảnh báo đỏ trực quan.

### 4.4. Trang 404 Not Found (`NotFoundPage.jsx`)
- Hiển thị khi người dùng truy cập route không xác định (`*`).
- Nút bấm thông minh đưa về Dashboard nếu đã đăng nhập hoặc về Trang chủ nếu là khách.

---

## 5. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)
1. Cấu trúc thư mục chuẩn 100% theo bản đặc tả.
2. Không vi phạm quy tắc `eslint-plugin-boundaries` và vượt qua `npm run lint`.
3. 100% Form nhập liệu và Request payload được validate bởi Zod schema.
4. Không hardcode chuỗi API endpoint trong component.
5. Ảnh QR code từ `qrCodeBase64` hiển thị sắc nét và quét được 100% bằng camera điện thoại.
6. Trang 404 Not Found bắt chính xác mọi route lạ và các private route được bảo vệ chặt chẽ.
