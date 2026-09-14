# ĐẶC TẢ THIẾT KẾ & XÂY DỰNG FRONTEND: SUPER_ADMIN & AGENCY_ADMIN PORTAL
## DỰ ÁN NỀN TẢNG ĐẶT LỊCH MAKE-UP (MAKEUP BOOKING PLATFORM)
### Công nghệ: React 18 + Vite + TailwindCSS + Zod + Zustand + Axios
### Phong cách thiết kế: Minimalist & Clean Data Dashboard (Đơn giản, trực quan, dễ nhìn, không lòe loẹt)

---

## 📌 1. TỔNG QUAN & PHẠM VI HỆ THỐNG QUẢN TRỊ

Tài liệu này đóng vai trò là **kim chỉ nam duy nhất** phục vụ xây dựng toàn bộ giao diện người dùng (Frontend Web SPA) dành riêng cho 2 phân quyền quản trị cao cấp nhất của hệ thống:
1. **Super Admin (`ROLE_SUPER_ADMIN`)**: Quản trị viên tối cao của sàn Makeup Platform. Chịu trách nhiệm kiểm duyệt thợ make-up, quản trị danh mục dịch vụ gốc (Taxonomy), theo dõi tài khoản, chỉ số toàn sàn và can thiệp vận hành.
2. **Agency Admin (`ROLE_AGENCY_ADMIN`)**: Chủ Studio / Đại lý Make-up. Quản lý hồ sơ thương hiệu, cấu hình gói dịch vụ, chính sách phụ phí, tuyển dụng thợ qua mã mời/QR, phân chia % hoa hồng và xếp ca trực tuần cho thợ.

### Nguyên Tắc Thiết Kế Cốt Lõi: Clean & High Data-Density Dashboard
* **Tuyệt đối KHÔNG sử dụng phong cách lòe loẹt, gradient cầu kỳ, bóng mờ phức tạp hay hiệu ứng chuyển động rườm rà** vốn chỉ phù hợp với trang giới thiệu B2C của khách hàng.
* **Tập trung vào tính thực dụng (Utility-first)**: Dữ liệu trình bày rõ ràng, mật độ thông tin cao, bảng biểu (Data Table) dễ lọc, tìm kiếm tức thì, modal thao tác nhanh, cảnh báo ngữ nghĩa chuẩn xác (Thành công - Cảnh báo - Lỗi - Thông tin).
* **Màu sắc trung tính, dễ nhìn (Subtle & High Contrast)**: Nền Slate sáng (`#F8FAFC`), bảng trắng (`#FFFFFF`), chữ đen/xám đậm (`#0F172A` / `#334155`), đường viền mảnh thanh lịch (`#E2E8F0`), điểm nhấn thương hiệu bằng tông màu Rose/Indigo nền nã, đạt chuẩn trợ năng WCAG AA.

---

## 🏗️ 2. MAPPING TÍNH NĂNG VỚI BACKEND CODE HIỆN TẠI

Dựa trên mã nguồn hiện hữu tại `code/backend/core-api/` và cơ sở dữ liệu `makeup_platform_db`:

| Phân hệ / Controller Backend | Endpoint Backend | Quyền hạn (Role) | Chức năng Frontend tương ứng |
| :--- | :--- | :--- | :--- |
| **`AuthController`** | `POST /api/v1/auth/login`<br>`GET /api/v1/auth/me`<br>`POST /api/v1/auth/logout`<br>`POST /api/v1/auth/change-password`<br>`PUT /api/v1/auth/language` | Tất cả | Đăng nhập cổng quản trị, lưu JWT & Cookie, kiểm tra Role điều hướng, đổi mật khẩu, chuyển đổi ngôn ngữ Vi/En |
| **`AdminMuaCredentialController`** | `PUT /api/v1/admin/muas/{muaId}/certificates/verify` | `ROLE_SUPER_ADMIN` | Màn hình Duyệt chứng chỉ & bằng cấp của MUA (Xem ảnh, Approve / Reject kèm lý do) |
| **`MasterTaxonomyController`** | `GET /api/v1/master-categories`<br>`GET /api/v1/makeup-styles` | Public / Admin | Hiển thị và quản lý Danh mục dịch vụ gốc toàn sàn và Danh mục Phong cách make-up chuẩn sàn |
| **`ServicePackageController`** | `POST /api/v1/packages`<br>`PUT /api/v1/packages/{id}`<br>`DELETE /api/v1/packages/{id}`<br>`PATCH /api/v1/packages/{id}/availability`<br>`GET /api/v1/packages/my-packages`<br>`GET /api/v1/packages/{id}` | `ROLE_AGENCY_ADMIN` | Quản lý danh sách gói dịch vụ Studio, tạo mới/sửa gói, bật/tắt nhận đơn, gán danh mục & styles |
| **`PackageItemController`** | `POST /api/v1/packages/{pkgId}/items`<br>`PUT /api/v1/packages/{pkgId}/items/{itemId}`<br>`DELETE /api/v1/packages/{pkgId}/items/{itemId}`<br>`GET /api/v1/packages/{pkgId}/items` | `ROLE_AGENCY_ADMIN` | Quản lý các bước quy trình làm đẹp của gói và các dịch vụ cộng thêm (Add-ons) có tính phí |
| **`SurchargeController`** | `POST /api/v1/surcharges`<br>`PUT /api/v1/surcharges/{id}`<br>`DELETE /api/v1/surcharges/{id}`<br>`GET /api/v1/surcharges/my-surcharges` | `ROLE_AGENCY_ADMIN` | Cấu hình bảng phụ phí Studio: di chuyển km xa, khung giờ sáng sớm/đêm muộn, ngày lễ Tết |
| **`Agency Operations`** *(Theo schema `agency_schema`)* | `GET/PUT /api/v1/agencies/profile`<br>`POST /api/v1/agencies/invitations`<br>`GET /api/v1/agencies/staff`<br>`PATCH /api/v1/agencies/staff/{id}/review`<br>`PATCH /api/v1/agencies/staff/{id}/commission`<br>`PUT /api/v1/agencies/staff/{id}/styles`<br>`GET/POST /api/v1/agencies/shifts` | `ROLE_AGENCY_ADMIN` | - Hồ sơ Studio & % hoa hồng mặc định<br>- Modal sinh mã & ảnh QR tuyển dụng thợ (ZXing 72h)<br>- Danh sách nhân sự thợ & duyệt đơn, gán hoa hồng<br>- Gán Tone make-up sở trường cho thợ<br>- Bảng ma trận xếp ca làm việc 7 ngày/tuần |

---

## 🗂️ 3. QUY CHUẨN CẤU TRÚC THƯ MỤC FRONTEND (`code/frontend/src/`)

Toàn bộ mã nguồn phải tuân thủ phân tách ranh giới rõ ràng theo vai trò người dùng:

```text
code/frontend/src/
├── api/                               # Định nghĩa endpoints & Axios base instances
│   ├── authApi.js                     # API Login, Logout, Me, Refresh Token
│   ├── superAdminApi.js               # API riêng cho Super Admin (Taxonomy, Credentials)
│   └── agencyApi.js                   # API riêng cho Agency Admin (Profile, Staff, Packages, Surcharges, Shifts)
│
├── schemas/                           # Zod Schemas validate toàn bộ Form & Filter
│   ├── authSchema.js                  # Login, Change Password, Language
│   ├── superAdminSchema.js            # Verify Certificate, Taxonomy management
│   └── agencySchema.js                # Studio Profile, Service Package, Add-on, Surcharge, Shift
│
├── constants/                         # Enums, Status code, Label tiếng Việt/Anh, Route Paths
│   ├── authConstants.js               # USER_ROLES, TOKEN_KEYS
│   ├── superAdminConstants.js         # VERIFICATION_STATUS, TAXONOMY_TYPES
│   └── agencyConstants.js             # SHIFT_DAYS, SURCHARGE_TYPES, STAFF_STATUS
│
├── store/                             # Zustand State Management
│   ├── useAuthStore.js                # Thông tin tài khoản đăng nhập, role, permissions, token
│   ├── useSuperAdminStore.js          # Danh sách hồ sơ MUA chờ duyệt, metrics
│   └── useAgencyStore.js              # Thông tin Studio, danh sách thợ, gói dịch vụ, ca làm
│
├── hooks/                             # Custom React Hooks
│   ├── useAuth.js                     # Hook xử lý đăng nhập, phân quyền Role, đăng xuất
│   ├── usePagination.js               # Hook xử lý phân trang bảng dữ liệu
│   └── useConfirmModal.js             # Hook bật dialog xác nhận xóa/duyệt
│
├── components/
│   ├── base/                          # Atomic UI tái sử dụng (Tối giản, Clean, WCAG AA)
│   │   ├── Button.jsx                 # Nút bấm (primary, secondary, danger, outline)
│   │   ├── Input.jsx                  # Input text kèm nhãn và lỗi validation
│   │   ├── Select.jsx                 # Dropdown select chuẩn
│   │   ├── Textarea.jsx               # Input văn bản nhiều dòng
│   │   ├── Badge.jsx                  # Huy hiệu trạng thái (Success, Warning, Danger, Info, Neutral)
│   │   ├── DataTable.jsx              # Bảng dữ liệu chuẩn (Sorting, Empty State, Pagination)
│   │   ├── Modal.jsx                  # Hộp thoại pop-up cơ bản
│   │   ├── ConfirmDialog.jsx          # Hộp thoại xác nhận thao tác nguy hiểm (Xóa, Từ chối)
│   │   ├── Skeleton.jsx               # Hiệu ứng nạp dữ liệu nhẹ nhàng
│   │   └── Card.jsx                   # Khung chứa nội dung viền mảnh tối giản
│   │
│   ├── features/
│   │   ├── admin/                     # Component phục vụ riêng Super Admin
│   │   │   ├── MuaCredentialTable.jsx # Bảng danh sách chứng chỉ thợ chờ duyệt
│   │   │   ├── CertificateReviewModal.jsx # Modal soi ảnh chứng chỉ và duyệt/từ chối
│   │   │   └── TaxonomyList.jsx       # Danh sách danh mục & phong cách make-up
│   │   │
│   │   └── agency/                    # Component phục vụ riêng Agency Admin
│   │       ├── PackageFormModal.jsx   # Modal tạo/sửa gói dịch vụ kèm chọn Styles
│   │       ├── PackageItemManager.jsx # Quản lý các bước làm đẹp & Add-on của gói
│   │       ├── SurchargeConfigCard.jsx# Thẻ cấu hình phụ phí di chuyển/giờ giấc/lễ tết
│   │       ├── StaffInvitationModal.jsx # Modal hiển thị mã mời & QR Code (ZXing 72h)
│   │       ├── StaffCommissionModal.jsx # Modal đàm phán tỷ lệ % hoa hồng cho thợ
│   │       ├── StaffStyleAssignModal.jsx# Modal gán Tone make-up cho thợ
│   │       └── WeeklyShiftTable.jsx   # Bảng xếp ca làm việc tuần chống trùng giờ
│   │
│   └── layout/                        # Khung giao diện quản trị
│       ├── AdminLayout.jsx            # Layout có Sidebar + Header riêng của Super Admin
│       ├── AgencyLayout.jsx           # Layout có Sidebar + Header riêng của Agency Admin
│       ├── Sidebar.jsx                # Menu điều hướng bên trái
│       ├── Header.jsx                 # Thanh công cụ trên cùng (Profile, Lang Switcher, Logout)
│       └── PageHeader.jsx             # Tiêu đề trang + Breadcrumb + Action Buttons
│
├── pages/
│   ├── Auth/
│   │   └── LoginPage.jsx              # Trang đăng nhập chung cho quản trị viên
│   │
│   ├── SuperAdmin/                    # CÁC MÀN HÌNH SUPER ADMIN
│   │   ├── AdminDashboardPage.jsx     # Tổng quan chỉ số nền tảng
│   │   ├── MuaVerificationPage.jsx    # Màn hình xét duyệt bằng cấp / chứng chỉ MUA
│   │   └── TaxonomyManagementPage.jsx # Màn hình xem & quản lý Danh mục / Style chuẩn sàn
│   │
│   └── Agency/                        # CÁC MÀN HÌNH AGENCY ADMIN
│       ├── AgencyDashboardPage.jsx    # Tổng quan Studio (Số thợ, gói dịch vụ, rating)
│       ├── AgencyProfilePage.jsx      # Hồ sơ Studio & Tỷ lệ hoa hồng nội bộ mặc định
│       ├── ServicePackageListPage.jsx # Danh sách gói dịch vụ & cấu hình Add-on
│       ├── SurchargeConfigPage.jsx    # Thiết lập bảng phụ phí Studio
│       ├── StaffManagementPage.jsx    # Quản lý nhân sự thợ, sinh mã QR, duyệt thợ, hoa hồng
│       └── ShiftSchedulePage.jsx      # Lập lịch ca làm việc tuần và kiểm soát xung đột
│
└── routes/
    ├── index.jsx                      # Định nghĩa AppRoutes
    ├── ProtectedRoute.jsx             # Guard chặn truy cập nếu chưa đăng nhập
    └── RoleBasedRoute.jsx             # Guard chặn theo Role (SUPER_ADMIN vs AGENCY_ADMIN)
```

---

## 🎨 4. QUY CHUẨN THIẾT KẾ UI/UX TỐI GIẢN (MINIMALIST DASHBOARD STANDARD)

Để đảm bảo AI và Developer tạo ra giao diện **gọn gàng, thanh lịch, dễ nhìn, tuyệt đối không lòe loẹt**, bắt buộc áp dụng các quy tắc sau:

### 4.1. Bảng màu chuẩn mực (Color Palette)
* **Background nền**: `bg-slate-50` (`#F8FAFC`) - tạo cảm giác êm dịu, không bị chói mắt.
* **Thẻ & Bảng nội dung**: `bg-white` (`#FFFFFF`) kết hợp viền mỏng `border border-slate-200`.
* **Màu chữ (Typography)**:
  - Tiêu đề chính: `text-slate-900` (`#0F172A`) - Đậm nét, dứt khoát.
  - Văn bản nội dung: `text-slate-700` (`#334155`).
  - Chữ chú thích/nhãn phụ: `text-slate-500` (`#64748B`).
* **Màu nhấn thương hiệu (Brand Accent)**:
  - Màu chính (Primary): `bg-rose-600 hover:bg-rose-700 text-white` (`#E11D48`) - Điểm nhấn tinh tế trên các nút hành động chính (CTA).
  - Màu thứ cấp (Secondary): `bg-slate-100 hover:bg-slate-200 text-slate-800` (`#F1F5F9`).
* **Màu trạng thái ngữ nghĩa (Status Badges)**:
  - Hoạt động / Đã duyệt (Active/Approved): `bg-emerald-50 text-emerald-700 border-emerald-200`.
  - Chờ xử lý (Pending): `bg-amber-50 text-amber-700 border-amber-200`.
  - Từ chối / Xung đột / Nguy hiểm (Rejected/Danger): `bg-rose-50 text-rose-700 border-rose-200`.
  - Vô hiệu hóa / Bản nháp (Inactive/Draft): `bg-slate-100 text-slate-600 border-slate-200`.

### 4.2. Cấm kỵ thiết kế (Design Anti-Patterns)
* ❌ **CẤM** dùng nền màu đen tuyền kèm đèn neon màu mè (Cyberpunk/Dark neon).
* ❌ **CẤM** dùng hiệu ứng kính mờ (Backdrop Blur / Glassmorphism) trên bảng dữ liệu quản trị vì gây nhòe chữ và giật khung hình.
* ❌ **CẤM** dùng các gradient chuyển 3-4 màu chói lọi trên các nút bấm hoặc thẻ số liệu.
* ❌ **CẤM** lạm dụng icon trang trí vô nghĩa; mỗi icon phải phục vụ mục đích nhận diện thao tác rõ ràng.

### 4.3. Tiêu chuẩn Bảng Dữ Liệu (DataTable Standard)
* Header bảng dùng nền `bg-slate-100/75 text-slate-700 font-semibold text-xs uppercase tracking-wider`.
* Mỗi hàng có đường phân cách mỏng `border-b border-slate-100`, hover nhẹ `hover:bg-slate-50/80 transition-colors`.
* Cột hành động (Actions) luôn đặt ở cuối cùng bên phải, icon nút bấm gọn gàng (`Edit`, `Delete`, `View`, `Verify`).
* Khi không có dữ liệu: hiển thị hình minh họa phẳng tối giản kèm thông báo rõ ràng: *"Chưa có dữ liệu nào trong danh mục này"*.

---

## 🖥️ 5. ĐẶC TẢ CHI TIẾT CÁC MÀN HÌNH THEO TỪNG ROLE

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
  - Bảng thu nhỏ: 5 yêu cầu xét duyệt chứng chỉ mới nhất cần xử lý.

#### Màn hình A2: Xét duyệt Bằng cấp / Chứng chỉ MUA (`/admin/muas/credentials`)
* **Mục tiêu**: Thực thi nghiệp vụ của `AdminMuaCredentialController` (`PUT /api/v1/admin/muas/{muaId}/certificates/verify`).
* **Bố cục UI**:
  - Bộ lọc: Trạng thái (`TẤT CẢ`, `CHỜ DUYỆT`, `ĐÃ XÁC THỰC`, `ĐÃ TỪ CHỐI`), tìm kiếm theo tên thợ hoặc số điện thoại.
  - Bảng danh sách:
    - Cột 1: MUA ID & Họ tên thợ.
    - Cột 2: Số điện thoại & Email.
    - Cột 3: Tên chứng chỉ hành nghề (`cert_name`).
    - Cột 4: Ngày nộp hồ sơ.
    - Cột 5: Trạng thái hiện tại (Badge màu: Vàng cho Chờ duyệt, Xanh cho Đã duyệt, Đỏ cho Từ chối).
    - Cột 6: Thao tác: Nút **"Kiểm duyệt"** (mở Modal chi tiết).
* **Modal Kiểm duyệt Chứng chỉ (`CertificateReviewModal`)**:
  - Hiển thị ảnh chứng chỉ chất lượng cao, có nút phóng to / xoay ảnh.
  - Hiển thị thông tin: Tên thợ, năm kinh nghiệm, tiểu sử.
  - Trường nhập **Ghi chú / Lý do từ chối** (`verificationNote` - bắt buộc nếu từ chối).
  - 2 Nút bấm hành động:
    - Nút Xanh lá: **"Phê duyệt Chứng chỉ"** (`action = "APPROVE"`).
    - Nút Đỏ: **"Từ chối Hồ sơ"** (`action = "REJECT"`).

#### Màn hình A3: Quản lý Danh mục Dịch vụ & Phong cách Make-up (`/admin/taxonomy`)
* **Mục tiêu**: Xem danh sách `master_service_categories` và `makeup_styles`.
* **Bố cục UI**:
  - Tab 1: **Danh mục Dịch vụ Gốc** (Trang điểm Cô dâu, Dự tiệc, Kỷ yếu, Chụp ảnh...).
  - Tab 2: **Phong cách Make-up Chuẩn Sàn** (Tone Hàn Douyin, Tone Thái, Tone Tây...).
  - Hiển thị danh sách dạng bảng đơn giản: Mã danh mục (`category_code`), Tên hiển thị, Mô tả, Trạng thái hoạt động.

---

### PHẦN B: CỔNG CHỦ STUDIO / ĐẠI LÝ (`/agency/*`)

#### Màn hình B1: Tổng quan Studio (`/agency/dashboard`)
* **Mục tiêu**: Báo cáo tổng thể cho chủ Studio.
* **Bố cục UI**:
  - Hàng Card chỉ số: Số lượng thợ trực thuộc, Số gói dịch vụ đang mở bán, Điểm đánh giá trung bình (`rating_avg`), % Hoa hồng nội bộ mặc định.
  - Lối tắt hành động nhanh: Nút **"Sinh mã mời thợ (QR)"**, Nút **"Tạo gói dịch vụ mới"**, Nút **"Xếp ca làm việc"**.

#### Màn hình B2: Hồ sơ & Chính sách Hoa hồng Studio (`/agency/profile`)
* **Mục tiêu**: Cập nhật thông tin phòng trang điểm theo `UpdateAgencyProfileReq`.
* **Bố cục Form (Chia 2 cột rõ ràng)**:
  - Cột trái: Tên Studio (`agencyName`), Hotline liên hệ, Ảnh đại diện/Logo Studio.
  - Cột phải: Địa chỉ cơ sở (Số nhà/Đường, Quận/Huyện, Tỉnh/Thành phố), Tỷ lệ hoa hồng nội bộ mặc định (`commissionRateInternal`: 0% - 100%).
  - Nút bấm: **"Lưu thay đổi"** kèm Toast thông báo thành công.

#### Màn hình B3: Quản lý Gói Dịch vụ & Add-ons (`/agency/packages`)
* **Mục tiêu**: Thực thi nghiệp vụ của `ServicePackageController` và `PackageItemController`.
* **Bố cục UI**:
  - Thanh công cụ: Nút **"+ Thêm Gói Dịch Vụ Mới"**, ô tìm kiếm theo tên gói.
  - Bảng danh sách gói:
    - Tên gói, Danh mục gốc, Thời gian ước tính (phút), Giá niêm yết (VNĐ), Công tắc bật/tắt nhận đơn (`isAvailable`), Thao tác (Sửa, Xóa, Quản lý Add-ons).
  - **Modal Tạo / Sửa Gói Dịch Vụ**:
    - Nhập Tên gói, Mô tả, Giá tiền, Thời lượng (phút).
    - Chọn Danh mục dịch vụ gốc (Dropdown nạp từ API `/api/v1/master-categories`).
    - Chọn các Tone Phong cách make-up áp dụng (Multi-select tag từ `/api/v1/makeup-styles`).
  - **Drawer / Modal Quản lý Quy trình & Dịch vụ Mua Thêm (Add-ons)**:
    - Danh sách các bước (`COMPONENT`: tẩy trang, dưỡng da, đánh nền, kẻ mắt...).
    - Danh sách dịch vụ cộng thêm (`ADD_ON`: dán mi giả cao cấp, làm tóc cô dâu...). Cho phép gán giá phụ trội.

#### Màn hình B4: Thiết lập Bảng Phụ Phí Studio (`/agency/surcharges`)
* **Mục tiêu**: Cấu hình phụ phí theo `SurchargeController`.
* **Bố cục 3 Card Cấu Hình**:
  1. **Phụ phí Cự ly Di chuyển**:
     - Khoảng cách miễn phí tối đa (km).
     - Đơn giá trên mỗi km vượt quá (VNĐ/km).
     - Khoảng cách phục vụ tối đa (km).
  2. **Phụ phí Khung Giờ Đặc Biệt (Sáng sớm / Đêm muộn)**:
     - Giờ bắt đầu tính phụ phí đêm (ví dụ: `21:00`).
     - Giờ kết thúc phụ phí sáng sớm (ví dụ: `06:00`).
     - Mức phí phụ thu (VNĐ).
  3. **Phụ phí Ngày Lễ / Tết**:
     - Danh sách ngày lễ áp dụng và tỷ lệ phụ thu (%) hoặc mức tiền cố định.

#### Màn hình B5: Quản lý Thợ, Tuyển Dụng & Hoa Hồng (`/agency/staff`)
* **Mục tiêu**: Thực thi trọn vẹn luồng tuyển dụng và hợp đồng nhân sự của Studio.
* **Bố cục UI**:
  - Nút bấm nổi bật: **"Tuyển Thợ Mới (Sinh Mã QR)"**.
  - Tab 1: **Thợ Đang Hoạt Động** (Danh sách thợ, avatar, SĐT, % hoa hồng riêng, các tone phong cách phụ trách, nút chỉnh sửa).
  - Tab 2: **Đơn Xin Gia Nhập Chờ Duyệt** (Danh sách thợ quét QR xin vào, nút Duyệt / Từ chối).
* **Modal Sinh Mã QR Tuyển Dụng**:
  - Nhập mức hoa hồng đề xuất ban đầu (ví dụ: 30%), Ghi chú lời mời.
  - Hiển thị mã mời dạng `INV-AG1-XXXXXX`, ảnh QR code quét được, đồng hồ đếm ngược thời hạn 72h.
  - Nút **"Sao chép Link"** và **"Tải ảnh QR"**.
* **Modal Đàm phán Hoa hồng Cá nhân (`StaffCommissionModal`)**:
  - Nhập tỷ lệ % hoa hồng Studio giữ cho thợ tay nghề cao (ví dụ: thợ giỏi giữ 20%, thợ mới giữ 35%).
* **Modal Gán Tone Phong cách Make-up (`StaffStyleAssignModal`)**:
  - Checkbox danh sách các Style make-up (Tone Hàn, Tone Thái, Tone Tây...) để hiển thị thế mạnh của thợ.

#### Màn hình B6: Ma Trận Xếp Ca Làm Việc Tuần (`/agency/shifts`)
* **Mục tiêu**: Phân ca làm việc 7 ngày trong tuần, chống trùng giờ theo thuật toán backend.
* **Bố cục UI**:
  - Bảng lưới 7 cột tương ứng từ **Thứ Hai đến Chủ Nhật**.
  - Cột dọc: Các khung giờ sáng/chiều/tối.
  - Nút **"+ Phân Ca Mới"**: Chọn thợ, ngày trong tuần, tên ca, giờ bắt đầu (`startTime`), giờ kết thúc (`endTime`).
  - Cảnh báo trực quan: Nếu giờ mới trùng với ca đã có của thợ trong ngày, hệ thống chặn ngay trên Form và hiển thị thông báo xung đột rõ ràng.

---

## 🔒 6. BẢO MẬT & ĐIỀU HƯỚNG PHÂN QUYỀN (ROUTING & GUARDS)

* **Bảo vệ tuyến đường (Protected Routes)**:
  - Nếu chưa đăng nhập $\rightarrow$ Điều hướng về `/login`.
  - Nếu đã đăng nhập với `ROLE_SUPER_ADMIN` $\rightarrow$ Chỉ được truy cập `/admin/*`, cố tình vào `/agency/*` sẽ báo lỗi 403.
  - Nếu đã đăng nhập với `ROLE_AGENCY_ADMIN` $\rightarrow$ Chỉ được truy cập `/agency/*`, cố tình vào `/admin/*` sẽ báo lỗi 403.
* **Cơ chế lưu trữ Token**:
  - Access Token lưu trong bộ nhớ hoặc Zustand Store (kèm Authorization header).
  - Refresh Token lưu an toàn qua HttpOnly Cookie (đã cấu hình sẵn trong `AuthController`).

---

## ✅ 7. TIÊU CHÍ NGHIỆM THU CHO AI & DEVELOPER (ACCEPTANCE CHECKLIST)

Mọi mã nguồn giao diện xây dựng cho phân hệ Super Admin và Agency Admin bắt buộc phải đáp ứng:
1. [ ] **Thư mục chuẩn hóa**: Đúng 100% cây thư mục quy định tại Mục 3.
2. [ ] **100% Zod Validation**: Mọi form nhập liệu đều phải có schema validate tại `src/schemas/`.
3. [ ] **Không hardcode chuỗi API URL**: 100% gọi qua các hàm trong `src/api/`.
4. [ ] **Không hardcode màu sắc tùy tiện**: Chỉ sử dụng bảng màu quy chuẩn tại Mục 4.1.
5. [ ] **Xử lý đầy đủ 3 trạng thái**: Loading (Skeleton), Dữ liệu rỗng (Empty State), Lỗi (Error Toast/Alert).
6. [ ] **Không lỗi ESLint**: Vượt qua lệnh `npm run lint` mà không có cảnh báo boundary vi phạm.
