# ĐẶC TẢ THIẾT KẾ & XÂY DỰNG FRONTEND: SUPER_ADMIN & AGENCY_ADMIN PORTAL (v2.0)
## DỰ ÁN NỀN TẢNG ĐẶT LỊCH MAKE-UP (MAKEUP BOOKING PLATFORM)
### Công nghệ: React 18 + Vite + TailwindCSS + Zod + Zustand + Axios + Lucide Icons
### Phong cách thiết kế: Minimalist & Clean Data Dashboard (Tối giản, trực quan, mật độ dữ liệu cao, không lòe loẹt)

---

## 📌 1. TỔNG QUAN & PHẠM VI HỆ THỐNG QUẢN TRỊ

Tài liệu này đóng vai trò là **kim chỉ nam duy nhất** phục vụ xây dựng toàn bộ giao diện người dùng (Frontend Web SPA) dành riêng cho 2 phân quyền quản trị cao cấp nhất của hệ thống:
1. **Super Admin (`ROLE_SUPER_ADMIN`)**: Quản trị viên tối cao của sàn Makeup Platform. Chịu trách nhiệm kiểm duyệt chứng chỉ thợ make-up, quản trị danh mục dịch vụ gốc (Taxonomy), theo dõi tài khoản, chỉ số vận hành toàn sàn và can thiệp vận hành.
2. **Agency Admin (`ROLE_AGENCY_ADMIN`)**: Chủ Studio / Đại lý Make-up. Quản lý hồ sơ thương hiệu, cấu hình gói dịch vụ, quy trình make-up & Add-ons, chính sách phụ phí di chuyển/lễ tết, quy tắc phụ phí làm thêm giờ (Overtime), tuyển dụng thợ qua mã mời/QR (ZXing 72h), phân chia % hoa hồng, gán Tone sở trường & gói dịch vụ cho thợ, và ma trận xếp ca trực 7 ngày/tuần chống trùng giờ.

### Nguyên Tắc Thiết Kế Cốt Lõi: Clean & High Data-Density Dashboard
* **Tuyệt đối KHÔNG sử dụng phong cách lòe loẹt, gradient cầu kỳ, bóng mờ phức tạp hay hiệu ứng chuyển động rườm rà** vốn chỉ phù hợp với trang giới thiệu B2C của khách hàng.
* **Tập trung vào tính thực dụng (Utility-first)**: Dữ liệu trình bày rõ ràng, mật độ thông tin cao, bảng biểu (Data Table) dễ lọc, tìm kiếm tức thì, modal thao tác nhanh, cảnh báo ngữ nghĩa chuẩn xác (Thành công - Cảnh báo - Lỗi - Thông tin).
* **Màu sắc trung tính, dễ nhìn (Subtle & High Contrast)**: Nền Slate sáng (`#F8FAFC`), bảng trắng (`#FFFFFF`), chữ đen/xám đậm (`#0F172A` / `#334155`), đường viền mảnh thanh lịch (`#E2E8F0`), điểm nhấn thương hiệu bằng tông màu Rose tinh tế (`#E11D48`), đạt chuẩn trợ năng WCAG AA.

---

## 🏗️ 2. MAPPING TÍNH NĂNG VỚI 100% MÃ NGUỒN BACKEND HIỆN TẠI

Hệ thống Frontend kết nối đồng bộ trực tiếp tới toàn bộ các Controller và Endpoint của Spring Boot Core API (`http://localhost:8080`):

| Phân hệ / Controller Backend | Endpoint Backend | Quyền hạn (Role) | Chức năng Frontend tương ứng |
| :--- | :--- | :--- | :--- |
| **`AuthController`** | `POST /api/v1/auth/login`<br>`GET /api/v1/auth/me`<br>`POST /api/v1/auth/logout`<br>`POST /api/v1/auth/refresh`<br>`POST /api/v1/auth/change-password`<br>`PUT /api/v1/auth/language` | Tất cả | Đăng nhập cổng quản trị, lưu JWT & Cookie, kiểm tra Role điều hướng, đổi mật khẩu, chuyển đổi ngôn ngữ Vi/En tức thì |
| **`AdminMuaCredentialController`** | `PUT /api/v1/admin/muas/{muaId}/certificates/verify` | `ROLE_SUPER_ADMIN` | Màn hình Duyệt chứng chỉ & bằng cấp MUA: Xem ảnh chất lượng cao, soi kinh nghiệm/tiểu sử, Phê duyệt hoặc Từ chối kèm lý do (`verificationNote`) |
| **`MasterTaxonomyController`** | `GET /api/v1/master-categories`<br>`GET /api/v1/makeup-styles` | Public / Admin | Hiển thị và quản lý Danh mục dịch vụ gốc toàn sàn và Danh mục Phong cách make-up chuẩn sàn |
| **`ServicePackageController`** | `POST /api/v1/packages`<br>`PUT /api/v1/packages/{id}`<br>`DELETE /api/v1/packages/{id}`<br>`PATCH /api/v1/packages/{id}/availability`<br>`GET /api/v1/packages/my-packages`<br>`GET /api/v1/packages/{id}` | `ROLE_AGENCY_ADMIN` | Quản lý danh sách gói dịch vụ Studio, tạo mới/sửa gói, bật/tắt nhận đơn (`isAvailable`), gán danh mục & multi-select styles |
| **`PackageItemController`** | `POST /api/v1/packages/{pkgId}/items`<br>`PUT /api/v1/packages/{pkgId}/items/{itemId}`<br>`DELETE /api/v1/packages/{pkgId}/items/{itemId}`<br>`GET /api/v1/packages/{pkgId}/items` | `ROLE_AGENCY_ADMIN` | Quản lý các bước quy trình làm đẹp tiêu chuẩn (`COMPONENT`) và các dịch vụ cộng thêm (`ADD_ON`) có tính phí phụ trội |
| **`SurchargeController`** | `POST /api/v1/surcharges`<br>`PUT /api/v1/surcharges/{id}`<br>`DELETE /api/v1/surcharges/{id}`<br>`GET /api/v1/surcharges/my-surcharges` | `ROLE_AGENCY_ADMIN` | Cấu hình bảng phụ phí Studio: cự ly di chuyển vượt km, khung giờ đêm muộn/sáng sớm, ngày nghỉ lễ Tết |
| **`AgencyProfileController`** | `GET /api/v1/agencies/profile`<br>`PUT /api/v1/agencies/profile` | `ROLE_AGENCY_ADMIN` | Xem và cập nhật thông tin Studio: Tên, hotline, địa chỉ cơ sở, logo và % hoa hồng nội bộ mặc định (`commissionRateInternal`: 0% - 60%) |
| **`AgencyStaffController`** | `POST /api/v1/agencies/invitations`<br>`GET /api/v1/agencies/invitations`<br>`DELETE /api/v1/agencies/invitations/{inviteCode}`<br>`GET /api/v1/agencies/staff`<br>`GET /api/v1/agencies/staff/{staffId}`<br>`PUT /api/v1/agencies/staff/{staffId}/review`<br>`PUT /api/v1/agencies/staff/{staffId}/status`<br>`PUT /api/v1/agencies/staff/{staffId}/commission`<br>`DELETE /api/v1/agencies/staff/{staffId}` | `ROLE_AGENCY_ADMIN` | - Sinh mã mời và mã QR tuyển dụng thợ (ZXing 72h)<br>- Danh sách thợ đang làm và đơn xin gia nhập chờ duyệt<br>- Phê duyệt/từ chối đơn xin gia nhập<br>- Đàm phán hoa hồng cá nhân riêng cho từng thợ<br>- Tạm đình chỉ hoặc xóa thợ khỏi Studio |
| **`AgencyStaffPackageController`** | `PUT /api/v1/agencies/staff/{staffId}/packages`<br>`GET /api/v1/agencies/staff/{staffId}/packages` | `ROLE_AGENCY_ADMIN` | Gán danh sách gói dịch vụ mà thợ có đủ kỹ năng và được quyền thực hiện cho khách hàng |
| **`AgencyStaffStyleController`** | `PUT /api/v1/agencies/staff/{staffId}/styles`<br>`GET /api/v1/agencies/staff/{staffId}/styles` | `ROLE_AGENCY_ADMIN` | Gán Tone phong cách make-up sở trường (Douyin, Thái, Tây, Tự nhiên) để tối ưu điều phối ca |
| **`AgencyShiftController`** | `POST /api/v1/agencies/shifts`<br>`GET /api/v1/agencies/shifts/matrix`<br>`GET /api/v1/agencies/shifts/staff/{staffId}`<br>`DELETE /api/v1/agencies/shifts/{shiftId}` | `ROLE_AGENCY_ADMIN` | Lập lịch làm việc ma trận 7 ngày trong tuần; kiểm tra và chặn ngay lập tức nếu giờ phân ca mới bị trùng với ca đã có của thợ |
| **`AgencyOvertimeController`** | `POST /api/v1/agency/overtime-rules`<br>`GET /api/v1/agency/overtime-rules`<br>`DELETE /api/v1/agency/overtime-rules/{ruleId}`<br>`GET /api/v1/agency/overtime-reports`<br>`GET /api/v1/agency/overtime-reports/{reportId}`<br>`POST /api/v1/agency/overtime-reports/{reportId}/review` | `ROLE_AGENCY_ADMIN` | - Cấu hình quy tắc phụ phí làm thêm giờ / phát sinh ngoài ca<br>- Theo dõi và xét duyệt các báo cáo Overtime từ thợ gửi về (Phê duyệt / Từ chối) |

---

## 🗂️ 3. CẤU TRÚC THƯ MỤC CHUẨN FRONTEND (`code/frontend/src/`)

Mã nguồn tuân thủ phân tách ranh giới rõ ràng theo Module và Role:

```text
code/frontend/src/
├── api/                               # Định nghĩa endpoints & Axios instances
│   ├── apiClient.js                   # Axios base client (interceptors token, error handling)
│   ├── authApi.js                     # Login, Logout, Me, Refresh, Change Password, Language
│   ├── superAdminApi.js               # Verify Certificate, Master Taxonomy
│   └── agencyApi.js                   # Profile, Staff, Packages, Items, Surcharges, Shifts, Overtime
│
├── schemas/                           # 100% Zod Schemas validate toàn bộ Form & Filter
│   ├── authSchema.js                  # Login, Change Password
│   ├── superAdminSchema.js            # Verify Certificate (kèm check note khi từ chối)
│   └── agencySchema.js                # Package, Add-on, Surcharge, Shift, OvertimeRule, Commission
│
├── constants/                         # Enums, Status codes, nhãn Vi/En, Route paths
│   ├── authConstants.js               # USER_ROLES, TOKEN_KEYS
│   ├── superAdminConstants.js         # VERIFICATION_STATUS, TAXONOMY_TYPES
│   └── agencyConstants.js             # SHIFT_DAYS, SURCHARGE_TYPES, STAFF_STATUS, OVERTIME_STATUS
│
├── store/                             # Zustand State Management
│   ├── useAuthStore.js                # Auth state, role, token, user profile
│   ├── useSuperAdminStore.js          # MUA verification queue, stats, active filters
│   └── useAgencyStore.js              # Studio profile, staff list, packages, shifts, surcharges
│
├── hooks/                             # Custom React Hooks
│   ├── useAuth.js                     # Quản lý phiên đăng nhập và bảo vệ route
│   ├── usePagination.js               # Logic phân trang bảng dữ liệu
│   └── useShiftConflict.js            # Thuật toán phát hiện xung đột trùng giờ trực ca
│
├── components/
│   ├── base/                          # Atomic UI tái sử dụng (Tối giản, Clean, WCAG AA)
│   │   ├── Button.jsx                 # Primary (Rose), Secondary, Danger, Outline
│   │   ├── Input.jsx                  # Input field kèm nhãn và lỗi Zod validation
│   │   ├── Select.jsx                 # Dropdown select chuẩn
│   │   ├── Textarea.jsx               # Textarea nhiều dòng
│   │   ├── Badge.jsx                  # Status badges (Active, Pending, Rejected, Draft)
│   │   ├── DataTable.jsx              # Bảng dữ liệu chuẩn (Pagination, Empty state, Sticky header)
│   │   ├── Modal.jsx                  # Hộp thoại pop-up cơ bản kèm nút đóng và Esc key
│   │   ├── ConfirmDialog.jsx          # Hộp thoại xác nhận thao tác nguy hiểm (Xóa, Từ chối)
│   │   ├── Skeleton.jsx               # Nạp dữ liệu mượt mà, không spinner đơn điệu
│   │   └── Toast.jsx                  # Thông báo nổi góc dưới phải (Success, Error, Info)
│   │
│   ├── layout/                        # Khung giao diện quản trị
│   │   ├── TopRoleBanner.jsx          # Thanh chuyển Role & Profile trên cùng
│   │   ├── AdminLayout.jsx            # Layout Super Admin (Sidebar + Content)
│   │   ├── AgencyLayout.jsx           # Layout Agency Admin (Sidebar + Content)
│   │   ├── Sidebar.jsx                # Menu điều hướng bên trái kèm notification counter
│   │   └── PageHeader.jsx             # Tiêu đề trang + Breadcrumb + Nút CTA
│   │
│   └── features/
│       ├── admin/                     # Component phục vụ Super Admin
│       │   ├── MuaCredentialTable.jsx # Bảng danh sách chứng chỉ thợ chờ duyệt
│       │   ├── CertificateReviewModal.jsx # Modal soi ảnh chứng chỉ và duyệt/từ chối
│       │   └── TaxonomyList.jsx       # Danh sách danh mục & phong cách make-up
│       │
│       └── agency/                    # Component phục vụ Agency Admin
│           ├── PackageFormModal.jsx   # Modal tạo/sửa gói dịch vụ kèm chọn Styles
│           ├── PackageItemManager.jsx # Modal/Drawer quản lý quy trình & Add-on
│           ├── SurchargeConfigCard.jsx# Thẻ cấu hình phụ phí di chuyển/giờ giấc/lễ tết
│           ├── OvertimeConfigCard.jsx # Thẻ cấu hình quy tắc phụ phí Overtime & duyệt đơn
│           ├── StaffInvitationModal.jsx # Modal sinh mã mời & ảnh QR (ZXing 72h)
│           ├── StaffCommissionModal.jsx # Modal đàm phán % hoa hồng cho thợ
│           ├── StaffStyleAssignModal.jsx# Modal gán Tone make-up sở trường
│           ├── StaffPackageAssignModal.jsx # Modal gán gói dịch vụ được phép làm
│           └── WeeklyShiftTable.jsx   # Lưới xếp ca tuần tích hợp chặn trùng giờ
│
├── pages/
│   ├── Auth/
│   │   └── LoginPage.jsx              # Trang đăng nhập chung cho quản trị viên
│   │
│   ├── SuperAdmin/                    # CÁC MÀN HÌNH SUPER ADMIN
│   │   ├── AdminDashboardPage.jsx     # Tổng quan chỉ số nền tảng & cảnh báo
│   │   ├── MuaVerificationPage.jsx    # Màn hình xét duyệt bằng cấp / chứng chỉ MUA
│   │   └── TaxonomyManagementPage.jsx # Màn hình quản lý Danh mục / Style chuẩn sàn
│   │
│   └── Agency/                        # CÁC MÀN HÌNH AGENCY ADMIN
│       ├── AgencyDashboardPage.jsx    # Tổng quan Studio, KPI & lối tắt nhanh
│       ├── AgencyProfilePage.jsx      # Hồ sơ Studio & % hoa hồng mặc định
│       ├── ServicePackageListPage.jsx # Danh sách gói dịch vụ & cấu hình Add-on
│       ├── SurchargeConfigPage.jsx    # Thiết lập phụ phí km, đêm muộn, lễ tết & Overtime
│       ├── StaffManagementPage.jsx    # Quản lý thợ, QR 72h, hoa hồng, styles & packages
│       └── ShiftSchedulePage.jsx      # Ma trận xếp ca làm việc tuần chống trùng giờ
│
└── routes/
    ├── index.jsx                      # AppRoutes cấu hình react-router-dom
    ├── ProtectedRoute.jsx             # Chặn nếu chưa đăng nhập
    └── RoleBasedRoute.jsx             # Chặn chéo giữa ROLE_SUPER_ADMIN và ROLE_AGENCY_ADMIN
```

---

## 🎨 4. QUY CHUẨN THIẾT KẾ & BẢNG TOKEN MÀU (MINIMALIST DASHBOARD STANDARD)

Để đảm bảo toàn bộ hệ thống giao diện **sạch sẽ, thanh lịch, dễ nhìn, tuyệt đối không lòe loẹt**:

### 4.1. Bảng màu chuẩn mực (Color Palette)
* **Background nền**: `bg-slate-50` (`#F8FAFC`) - êm dịu, không chói mắt.
* **Thẻ & Bảng nội dung**: `bg-white` (`#FFFFFF`) kết hợp viền mỏng `border border-slate-200`.
* **Màu chữ (Typography)**:
  - Tiêu đề chính: `text-slate-900` (`#0F172A`) - Đậm nét, dứt khoát.
  - Văn bản nội dung: `text-slate-700` (`#334155`).
  - Chữ chú thích/nhãn phụ: `text-slate-500` (`#64748B`) hoặc font-mono cho mã ID/thời gian.
* **Màu nhấn thương hiệu (Brand Accent)**:
  - Màu chính (Primary): `bg-rose-600 hover:bg-rose-700 text-white` (`#E11D48`) - Điểm nhấn tinh tế trên các nút hành động chính (CTA).
  - Màu thứ cấp (Secondary): `bg-white hover:bg-slate-50 text-slate-700 border border-slate-200`.
* **Màu trạng thái ngữ nghĩa (Status Badges)**:
  - Hoạt động / Đã duyệt (Active/Approved): `bg-emerald-50 text-emerald-700 border-emerald-200`.
  - Chờ xử lý (Pending): `bg-amber-50 text-amber-700 border-amber-200`.
  - Từ chối / Xung đột / Nguy hiểm (Rejected/Danger): `bg-rose-50 text-rose-700 border-rose-200`.
  - Vô hiệu hóa / Bản nháp (Inactive/Draft): `bg-slate-100 text-slate-600 border-slate-200`.

### 4.2. Cấm kỵ thiết kế (Design Anti-Patterns)
* ❌ **CẤM** dùng nền màu đen tuyền kèm đèn neon màu mè (Cyberpunk/Dark neon).
* ❌ **CẤM** dùng hiệu ứng kính mờ (Backdrop Blur / Glassmorphism) trên bảng dữ liệu quản trị vì gây nhòe chữ và giật khung hình.
* ❌ **CẤM** dùng gradient chuyển 3-4 màu chói lọi trên các nút bấm hoặc thẻ số liệu.
* ❌ **CẤM** lạm dụng icon trang trí vô nghĩa; mỗi icon phải phục vụ mục đích nhận diện thao tác rõ ràng.

---

## 🖥️ 5. ĐẶC TẢ CHI TIẾT TỪNG MÀN HÌNH THEO ROLE

---

### PHẦN A: CỔNG SUPER ADMIN (`/admin/*`)

#### Màn hình A1: Tổng quan Nền tảng (`/admin/dashboard`)
* **Mục tiêu**: Nắm bắt nhanh các chỉ số then chốt cần hành động tức thì.
* **Bố cục UI**:
  - Hàng 4 Card chỉ số:
    1. **Hồ sơ MUA chờ duyệt chứng chỉ**: Số lượng kèm nút bấm nhảy trực tiếp tới trang duyệt.
    2. **Tổng số Studio đang hoạt động**: Thống kê số lượng Studio.
    3. **Tổng số Gói dịch vụ toàn sàn**: Số gói dịch vụ.
    4. **Trạng thái kết nối Hệ thống**: Ping Spring Boot Core API & PostgreSQL (Healthy / Degraded).
  - Bảng thu nhỏ: Các yêu cầu xét duyệt chứng chỉ mới nhất cần xử lý kèm nút "Kiểm duyệt".

#### Màn hình A2: Xét duyệt Bằng cấp / Chứng chỉ MUA (`/admin/muas/credentials`)
* **Mục tiêu**: Thực thi nghiệp vụ của `AdminMuaCredentialController` (`PUT /api/v1/admin/muas/{muaId}/certificates/verify`).
* **Bố cục UI**:
  - Bộ lọc: Trạng thái (`TẤT CẢ`, `CHỜ DUYỆT`, `ĐÃ XÁC THỰC`, `ĐÃ TỪ CHỐI`), tìm kiếm theo tên thợ hoặc số điện thoại.
  - Bảng danh sách:
    - Cột 1: MUA ID & Họ tên thợ.
    - Cột 2: Số điện thoại & Email.
    - Cột 3: Tên chứng chỉ hành nghề (`cert_name`).
    - Cột 4: Ngày nộp hồ sơ.
    - Cột 5: Trạng thái hiện tại (Badge màu chuẩn).
    - Cột 6: Thao tác: Nút **"Kiểm duyệt"** (mở Modal chi tiết).
* **Modal Kiểm duyệt Chứng chỉ (`CertificateReviewModal`)**:
  - Hiển thị ảnh chứng chỉ chất lượng cao, có nút phóng to / xem ảnh gốc.
  - Hiển thị thông tin: Tên thợ, năm kinh nghiệm, tiểu sử.
  - Trường nhập **Ghi chú / Lý do từ chối** (`verificationNote` - bắt buộc validate nếu từ chối).
  - 2 Nút bấm hành động:
    - Nút Xanh lá: **"Phê duyệt Chứng chỉ"** (`action = "APPROVE"`).
    - Nút Đỏ: **"Từ chối Hồ sơ"** (`action = "REJECT"`).

#### Màn hình A3: Quản lý Danh mục Dịch vụ & Phong cách Make-up (`/admin/taxonomy`)
* **Mục tiêu**: Xem danh sách `master_service_categories` và `makeup_styles`.
* **Bố cục UI**:
  - Tab 1: **Danh mục Dịch vụ Gốc** (Trang điểm Cô dâu, Dự tiệc, Kỷ yếu, Chụp ảnh...).
  - Tab 2: **Phong cách Make-up Chuẩn Sàn** (Tone Hàn Douyin, Tone Thái, Tone Tây, Tự nhiên...).
  - Hiển thị danh sách dạng bảng đơn giản: Mã danh mục (`category_code`), Tên hiển thị, Mô tả, Trạng thái hoạt động.

---

### PHẦN B: CỔNG CHỦ STUDIO / ĐẠI LÝ (`/agency/*`)

#### Màn hình B1: Tổng quan Studio (`/agency/dashboard`)
* **Mục tiêu**: Báo cáo tổng thể cho chủ Studio.
* **Bố cục UI**:
  - Hàng Card chỉ số: Số lượng thợ trực thuộc, Số gói dịch vụ đang mở bán, Điểm đánh giá trung bình (`rating_avg`), % Hoa hồng nội bộ mặc định.
  - Lối tắt hành động nhanh: Nút **"Sinh mã mời thợ (QR)"**, Nút **"Tạo gói dịch vụ mới"**, Nút **"Xếp ca làm việc"**.

#### Màn hình B2: Hồ sơ & Chính sách Hoa hồng Studio (`/agency/profile`)
* **Mục tiêu**: Cập nhật thông tin phòng trang điểm theo `AgencyProfileController` (`GET/PUT /api/v1/agencies/profile`).
* **Bố cục Form (Chia 2 cột rõ ràng)**:
  - Cột trái: Tên Studio (`agencyName`), Hotline liên hệ, Ảnh đại diện/Logo Studio.
  - Cột phải: Địa chỉ cơ sở (Số nhà/Đường, Quận/Huyện, Tỉnh/Thành phố), Tỷ lệ hoa hồng nội bộ mặc định (`commissionRateInternal`: 0% - 60%).
  - Nút bấm: **"Lưu thay đổi"** kèm Toast thông báo thành công.

#### Màn hình B3: Quản lý Gói Dịch vụ & Add-ons (`/agency/packages`)
* **Mục tiêu**: Thực thi nghiệp vụ của `ServicePackageController` và `PackageItemController`.
* **Bố cục UI**:
  - Thanh công cụ: Nút **"+ Thêm Gói Dịch Vụ Mới"**, ô tìm kiếm theo tên gói.
  - Bảng danh sách gói:
    - Tên gói, Danh mục gốc, Thời gian ước tính (phút), Giá niêm yết (VNĐ), Công tắc bật/tắt nhận đơn (`isAvailable`), Thao tác (Sửa, Xóa, Quản lý Add-ons).
  - **Modal Tạo / Sửa Gói Dịch Vụ (`PackageFormModal`)**:
    - Nhập Tên gói, Mô tả, Giá tiền, Thời lượng (phút).
    - Chọn Danh mục dịch vụ gốc (Dropdown nạp từ `/api/v1/master-categories`).
    - Chọn các Tone Phong cách make-up áp dụng (Multi-select tag từ `/api/v1/makeup-styles`).
  - **Drawer / Modal Quản lý Quy trình & Dịch vụ Mua Thêm (Add-ons)**:
    - Danh sách các bước (`COMPONENT`: tẩy trang, dưỡng da, đánh nền, kẻ mắt...).
    - Danh sách dịch vụ cộng thêm (`ADD_ON`: dán mi giả cao cấp, làm tóc cô dâu...). Cho phép gán giá phụ trội.

#### Màn hình B4: Thiết lập Bảng Phụ Phí Studio & Overtime (`/agency/surcharges`)
* **Mục tiêu**: Cấu hình phụ phí theo `SurchargeController` và `AgencyOvertimeController`.
* **Bố cục 4 Card Cấu Hình**:
  1. **Phụ phí Cự ly Di chuyển**: Khoảng cách miễn phí tối đa (km), Đơn giá trên mỗi km vượt quá (VNĐ/km), Khoảng cách phục vụ tối đa (km).
  2. **Phụ phí Khung Giờ Đặc Biệt (Sáng sớm / Đêm muộn)**: Giờ bắt đầu tính đêm (ví dụ: `21:00`), Giờ kết thúc sáng sớm (ví dụ: `06:00`), Mức phí phụ thu (VNĐ).
  3. **Phụ phí Ngày Lễ / Tết**: Danh sách ngày lễ áp dụng và tỷ lệ phụ thu (%) hoặc mức tiền cố định.
  4. **Quy tắc Phụ Phí Tăng Ca (Overtime Rules & Reports)**:
     - Cấu hình đơn giá làm thêm giờ (`ratePerHour`), giờ giới hạn tối đa.
     - Bảng theo dõi và xét duyệt các báo cáo Overtime gửi về từ thợ (`OvertimeReportRes`) với các nút Phê duyệt / Từ chối.

#### Màn hình B5: Quản lý Thợ, Tuyển Dụng & Phân Quyền (`/agency/staff`)
* **Mục tiêu**: Thực thi trọn vẹn luồng tuyển dụng và hợp đồng nhân sự của Studio theo `AgencyStaffController`, `AgencyStaffPackageController`, và `AgencyStaffStyleController`.
* **Bố cục UI**:
  - Nút bấm nổi bật: **"Tuyển Thợ Mới (Sinh Mã QR)"**.
  - Tab 1: **Thợ Đang Hoạt Động** (Danh sách thợ, avatar, SĐT, % hoa hồng riêng, các tone phong cách phụ trách, các gói dịch vụ được giao, nút thao tác).
  - Tab 2: **Đơn Xin Gia Nhập Chờ Duyệt** (Danh sách thợ quét QR xin vào, thông tin chứng chỉ, nút Duyệt / Từ chối).
* **Modal Sinh Mã QR Tuyển Dụng (`StaffInvitationModal`)**:
  - Hiển thị mã mời dạng `INV-AG1-XXXXXX`, ảnh QR code quét được (ZXing), đồng hồ đếm ngược thời hạn 72h.
  - Nút **"Sao chép Link"** và **"Tải ảnh QR"**.
* **Modal Đàm phán Hoa hồng Cá nhân (`StaffCommissionModal`)**:
  - Nhập hoặc kéo thanh trượt điều chỉnh tỷ lệ % hoa hồng Studio giữ đối với từng thợ riêng biệt.
* **Modal Gán Tone Thế Mạnh (`StaffStyleAssignModal`)**:
  - Checkbox danh sách các Style make-up (Tone Hàn, Tone Thái, Tone Tây...) để hiển thị thế mạnh của thợ.
* **Modal Gán Gói Dịch Vụ Cho Thợ (`StaffPackageAssignModal`)**:
  - Checkbox các gói dịch vụ của Studio mà thợ này được phân công phục vụ khách.

#### Màn hình B6: Ma Trận Xếp Ca Làm Việc Tuần (`/agency/shifts`)
* **Mục tiêu**: Phân ca làm việc 7 ngày trong tuần theo `AgencyShiftController`, tích hợp thuật toán chặn trùng giờ ca trực.
* **Bố cục UI**:
  - Bảng lưới 7 cột tương ứng từ **Thứ Hai đến Chủ Nhật**.
  - Mỗi cột hiển thị danh sách các ca trực: Tên ca, Thợ đảm nhiệm, Giờ bắt đầu - Giờ kết thúc.
  - Nút **"+ Phân Ca Mới"**: Mở modal chọn thợ, ngày trong tuần, tên ca, giờ bắt đầu (`startTime`), giờ kết thúc (`endTime`).
  - **Bộ kiểm tra xung đột thời gian thực**: Nếu giờ mới trùng với ca đã có của thợ trong ngày, hệ thống tự động khóa nút lưu và hiển thị banner đỏ cảnh báo chi tiết: *"Cảnh Báo Xung Đột Ca Trực: Khung giờ trùng với [Tên ca đã có]!"*.

---

## 🔒 6. BẢO MẬT & ĐIỀU HƯỚNG PHÂN QUYỀN (ROUTING & GUARDS)

* **Bảo vệ tuyến đường (Protected Routes)**:
  - Nếu chưa đăng nhập $\rightarrow$ Điều hướng về `/login`.
  - Nếu đã đăng nhập với `ROLE_SUPER_ADMIN` $\rightarrow$ Chỉ được truy cập `/admin/*`, cố tình vào `/agency/*` sẽ chặn và trả về thông báo lỗi 403 Forbidden.
  - Nếu đã đăng nhập với `ROLE_AGENCY_ADMIN` $\rightarrow$ Chỉ được truy cập `/agency/*`, cố tình vào `/admin/*` sẽ chặn và trả về thông báo lỗi 403 Forbidden.
* **Cơ chế lưu trữ Token**:
  - Access Token lưu trong bộ nhớ và Zustand Store (kèm Authorization header).
  - Refresh Token lưu an toàn qua HttpOnly Cookie (đã cấu hình sẵn trong `AuthController`).

---

## ✅ 7. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CHECKLIST)

Mọi mã nguồn giao diện xây dựng cho phân hệ Super Admin và Agency Admin bắt buộc phải đáp ứng:
1. [ ] **Thư mục chuẩn hóa**: Đúng 100% cây thư mục quy định tại Mục 3.
2. [ ] **100% Zod Validation**: Mọi form nhập liệu đều phải có schema validate tại `src/schemas/`.
3. [ ] **Không hardcode chuỗi API URL**: 100% gọi qua các hàm trong `src/api/`.
4. [ ] **Không hardcode màu sắc tùy tiện**: Chỉ sử dụng bảng màu quy chuẩn tại Mục 4.1 và đối chiếu chuẩn theo file `admin_agency_preview.html`.
5. [ ] **Xử lý đầy đủ 3 trạng thái**: Loading (Skeleton), Dữ liệu rỗng (Empty State), Lỗi (Error Toast/Alert).
6. [ ] **Không lỗi ESLint**: Vượt qua lệnh `npm run lint` mà không có cảnh báo vi phạm.
