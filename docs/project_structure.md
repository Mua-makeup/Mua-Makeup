# Cấu trúc thư mục dự án (Project Structure)
## Nền tảng Đặt lịch & Điều phối Dịch vụ Trang điểm (Makeup Platform Monorepo)

Tài liệu này chuẩn hóa và tinh chỉnh cấu trúc cây thư mục toàn diện cho dự án theo mô hình **Monorepo**, kết hợp giữa **Frontend React JS (Vite)** và **Backend Java Spring Boot (Modular Monolith - Layered DDD)** phù hợp 100% với tài liệu đặc tả SRS, CSDL và các tính năng nghiệp vụ của nền tảng.

---

## I. Tổng quan Cấu trúc Monorepo (Root Directory)

```text
makeup-platform/
├── docs/                               # Toàn bộ tài liệu kỹ thuật, kiến trúc và quy trình
│   ├── srs.md                          # Tài liệu đặc tả yêu cầu phần mềm (SRS chuẩn)
│   ├── convention.md                   # Quy chuẩn code (Git commit, Clean Code, Naming, RESTful)
│   ├── project-structure.md            # Đặc tả chi tiết cấu trúc thư mục (File này)
│   ├── api-specs/                      # Định nghĩa OpenAPI/Swagger Specs (.yaml/.json)
│   ├── backlogs/                       # Kế hoạch thực hiện & User Stories theo Sprint
│   │   ├── sprint0/                    # Khởi tạo nền tảng, Git Monorepo, CSDL, Docker
│   │   ├── sprint1/                    # User & Auth, RBAC, Catalog & Phụ phí
│   │   ├── sprint2/                    # Agency Management, Portfolio Showcase & Skills
│   │   ├── sprint3/                    # Booking Engine, Dispatching, Dynamic Pricing
│   │   ├── sprint4/                    # Telemetry GPS Stream, Redis GEO, WebSocket WSS
│   │   └── sprint5/                    # Double-Entry Wallet, Escrow, Review & Tip
│   ├── DB-erd/                         # Thiết kế Cơ sở dữ liệu
│   │   ├── schema.sql                  # Script DDL toàn bộ 25+ bảng CSDL PostgreSQL + PostGIS
│   │   ├── database-design.md          # Thuyết minh chi tiết các bảng, quan hệ và kiểu dữ liệu
│   │   └── erd-diagram.png             # Hình ảnh sơ đồ thực thể liên kết ERD
│   ├── UI/UX style guideline/          # Bộ quy chuẩn giao diện thiết kế
│   │   ├── design-tokens.json          # Bảng mã màu chủ đạo, typography, spacing
│   │   └── design-system.md            # Hướng dẫn component UI, Responsive guideline
│   └── postman/                        # Bộ sưu tập Postman Collection & Environment
│       ├── Mua_Makeup_Local.postman_environment.json
│       ├── Mua_Makeup_Platform.postman_collection.json
│       └── README.md
│
├── code/                               # Mã nguồn thực thi của toàn bộ hệ thống
│   ├── frontend/                       # Cổng Web Quản trị (ReactJS + JavaScript + Vite - Super Admin & Agency)
│   ├── mobile/                         # Ứng dụng Di động Đa nền tảng (React Native + TypeScript - Customer & Freelance MUA)
│   └── backend/                        # Ứng dụng Backend Spring Boot (Layered Monolith)
│       └── core-api/                   # Module chính chứa toàn bộ Bounded Contexts
│
├── .agent/                             # Cấu hình Rules, Skills và Workflows cho AI Agent
│   ├── rules/                          # Quy tắc kiểm duyệt code, kiến trúc cho AI
│   │   ├── backend-rule.md             # Quy tắc Java 21, Spring Boot, Clean Architecture
│   │   ├── frontend-rule.md            # Quy tắc React Vite, Tailwind, ESLint, Zod
│   │   └── git-workflow-rule.md        # Quy chuẩn commit convention, branch name
│   ├── skills/                         # Kỹ năng nghiệp vụ chuyên biệt
│   │   ├── geo-telemetry-skill.md      # Xử lý PostGIS, Redis GEO, ST_DistanceSphere
│   │   └── wallet-ledger-skill.md      # Quy tắc hạch toán sổ cái kép (Double-entry)
│   └── workflows/                      # Quy trình làm việc tự động hóa
│       ├── code-review-flow.md         # Quy trình review PR & check linter
│       └── release-flow.md             # Quy trình đóng gói bản dựng (Build & Tag)
│
├── test/                               # Bộ kịch bản kiểm thử tích hợp & kiểm thử tải
│   ├── postman/                        # Bộ sưu tập Postman Collection & Environment
│   │   └── makeup-platform.postman_collection.json
│   ├── jmeter/                         # Kịch bản test chịu tải ca khẩn cấp (Surge booking)
│   │   └── race-condition-booking.jmx
│   └── e2e/                            # Kiểm thử luồng End-to-End người dùng
│
├── docker-compose.yml                  # Khởi chạy toàn bộ hạ tầng Local (Postgres, PostGIS, Redis)
├── docker-compose.prod.yml             # Cấu hình container cho môi trường Staging/Production
└── .gitignore                          # Danh sách loại trừ push Git cho toàn monorepo
```

---

## II. Cấu trúc Cổng Quản trị Web Portal (ReactJS + JavaScript + Vite)

Áp dụng cho ứng dụng **Web Agency Management Portal (`ROLE_AGENCY_ADMIN`, `ROLE_AGENCY_STAFF`) & Web Super Admin (`ROLE_SUPER_ADMIN`)**.

```text
code/frontend/
├── public/                             # Tài nguyên tĩnh độc lập không qua build pipeline
│   ├── favicon.ico
│   └── robots.txt
│
├── src/
│   ├── assets/                         # Tài nguyên đồ họa, hình ảnh
│   │   ├── images/                     # Logo thương hiệu, placeholder avatar
│   │   └── icons/                      # SVG icons tùy chỉnh
│   │
│   ├── pages/                          # Các màn hình phân theo phân hệ & vai trò (Clean Role Boundaries)
│   │   ├── Auth/                       # Phân hệ Xác thực & Đăng ký
│   │   │   ├── LoginPage.jsx           # Đăng nhập bằng Email/SĐT + Mật khẩu (Cookie-based Auth)
│   │   │   ├── RegisterAgencyPage.jsx  # Đăng ký hồ sơ đại lý / Studio mới
│   │   │   └── RegisterFreelancerPage.jsx # Đăng ký hồ sơ chuyên viên MUA tự do
│   │   │
│   │   ├── SuperAdmin/                 # Phân hệ Quản trị viên Sàn (ROLE_SUPER_ADMIN)
│   │   │   ├── AdminDashboardPage.jsx  # Tổng quan KPI sàn, trạng thái Core API & hàng chờ chứng chỉ
│   │   │   ├── AdminAgenciesPage.jsx   # Thẩm định & duyệt/thu hồi studio (Có ConfirmDialog xác nhận)
│   │   │   ├── AdminUsersPage.jsx      # Quản trị danh sách người dùng, khóa/mở tài khoản (ConfirmDialog)
│   │   │   ├── AdminBookingsPage.jsx   # Giám sát đơn đặt lịch toàn hệ thống realtime
│   │   │   ├── MuaVerificationPage.jsx # Thẩm định hồ sơ bằng cấp chuyên viên MUA
│   │   │   ├── SurgePricingManagementPage.jsx # Quản lý bảng quy tắc giá động (Surge Pricing) & H3 Hexagon
│   │   │   └── TaxonomyManagementPage.jsx # Quản trị Danh mục dịch vụ gốc & Tone phong cách (Toast tự tắt)
│   │   │
│   │   └── Agency/                     # Phân hệ Chủ Studio / Quản lý Đại lý (ROLE_AGENCY_ADMIN)
│   │       ├── AgencyDashboardPage.jsx # Báo cáo doanh thu studio, số lượng đơn & hiệu suất thợ
│   │       ├── StaffManagementPage.jsx # Quản lý thợ nội bộ, gán style/gói dịch vụ, xóa thợ (ConfirmDialog)
│   │       ├── ServicePackageListPage.jsx # Quản lý gói dịch vụ, ẩn/hiện, xóa gói (ConfirmDialog)
│   │       ├── AgencyBookingsPage.jsx  # Lịch hẹn khách đặt tại cơ sở & tận nơi
│   │       └── AgencySettingsPage.jsx  # Cài đặt thông tin cơ sở, hoa hồng & bản đồ định vị GPS
│   │
│   ├── components/                     # Hệ thống Component giao diện Luxury Beauty tái sử dụng
│   │   ├── base/                       # Atomic Base Components chuẩn thiết kế
│   │   │   ├── Button.jsx              # Button đa biến thể: primary, secondary, danger, success, outline, ghost
│   │   │   ├── Input.jsx               # Input field tích hợp validation error & icon
│   │   │   ├── Select.jsx              # Dropdown select chuẩn giao diện
│   │   │   ├── Textarea.jsx            # Ô nhập văn bản đa dòng
│   │   │   ├── Badge.jsx               # Tag trạng thái (active, pending, rejected, inactive)
│   │   │   ├── Modal.jsx               # Hộp thoại popup linh hoạt với backdrop & focus trap
│   │   │   ├── ConfirmDialog.jsx       # Modal xác nhận bắt buộc cho 100% THAO TÁC XÓA / THU HỒI / ĐĂNG XUẤT
│   │   │   ├── DataTable.jsx           # Bảng dữ liệu có phân trang, tìm kiếm & sắp xếp
│   │   │   └── Toast.jsx               # Thông báo nổi góc màn hình, tự động biến mất sau 3 giây
│   │   │
│   │   └── features/                   # Component nghiệp vụ chuyên sâu
│   │       ├── admin/                  # Modal thẩm định chứng chỉ, danh mục, phong cách & quy tắc giá động
│   │       │   ├── CertificateReviewModal.jsx # Xem chi tiết bằng cấp & phê duyệt/từ chối
│   │       │   ├── CategoryModal.jsx   # Thêm/sửa danh mục dịch vụ (Có Toast thông báo)
│   │       │   ├── StyleModal.jsx      # Thêm/sửa phong cách make-up (Có Toast thông báo)
│   │       │   └── SurgeRuleModal.jsx  # Cấu hình khung giờ, ngày trong tuần & hệ số surge multiplier
│   │       └── agency/                 # Component dành riêng cho quản trị studio
│   │           ├── LocationMapPicker.jsx # Bản đồ tương tác định vị cơ sở (Goong/Leaflet, smart fallback Hà Nội, auto-geocode)
│   │           ├── PackageItemManager.jsx # Quản lý dịch vụ con / add-on của gói (Xóa có ConfirmDialog)
│   │           ├── ServicePackageModal.jsx # Tạo / chỉnh sửa gói dịch vụ trang điểm
│   │           ├── StaffInvitationModal.jsx # Tạo mã QR tuyển dụng 72h (Hủy mã có ConfirmDialog)
│   │           ├── StaffPackageAssignModal.jsx # Phân quyền gói dịch vụ cho thợ thực hiện
│   │           ├── StaffStyleAssignModal.jsx # Gán tone phong cách sở trường cho nhân viên
│   │           └── WeeklyShiftTable.jsx # Ma trận xếp ca làm việc tuần (Xóa ca có ConfirmDialog)
│   │
│   ├── layouts/                        # Khung bố cục hệ thống
│   │   ├── AdminLayout.jsx             # Layout dành cho Super Admin (Sidebar, Header, Breadcrumbs)
│   │   ├── AgencyLayout.jsx            # Layout dành cho Agency Admin
│   │   └── TopRoleBanner.jsx           # Thanh Banner tài khoản (Dropdown thông tin, Đổi MK & Đăng xuất có ConfirmDialog)
│   │
│   ├── routes/                         # Định tuyến & Phân quyền bảo mật RBAC
│   │   ├── AppRoutes.jsx               # Tuyến đường tổng hợp
│   │   ├── ProtectedRoute.jsx          # Bảo vệ route với HttpOnly Cookie Auth, kiểm tra /auth/me
│   │   └── RoleBasedRoute.jsx          # Chặn truy cập trái quyền theo vai trò (ROLE_SUPER_ADMIN, ROLE_AGENCY_ADMIN...)
│   │
│   ├── services/                       # Tầng HTTP Client gọi Backend API
│   │   ├── api-client.js               # Axios client: withCredentials=true (HttpOnly Cookie), Accept-Language
│   │   ├── auth.service.js             # API đăng nhập, đăng xuất, refresh-token, lấy thông tin tài khoản
│   │   ├── agency.service.js           # API gói dịch vụ, phụ phí, thợ, xếp ca, mã mời QR, cài đặt vị trí
│   │   └── super-admin.service.js      # API thẩm định chứng chỉ, studio, người dùng, giá động & taxonomy
│   │
│   ├── store/                          # Quản lý State toàn cục bằng Zustand
│   │   ├── useAuthStore.js             # In-memory auth state (Không lưu token nhạy cảm trong localStorage)
│   │   └── useI18nStore.js             # Đa ngôn ngữ song ngữ 100% (VI & EN), chuyển đổi tức thì không reload
│   │
│   ├── constants/                      # Hằng số & Từ điển hệ thống
│   │   ├── i18n.constant.js            # Từ điển song ngữ toàn diện (VI/EN) cho toàn bộ UI, form & toast
│   │   ├── roles.constant.js           # Định nghĩa vai trò (SUPER_ADMIN, AGENCY_ADMIN, AGENCY_STAFF, FREELANCE_MUA, CUSTOMER)
│   │   ├── agency.constant.js          # Hằng số ca làm việc, trạng thái nhân viên
│   │   └── super-admin.constant.js     # Tabs taxonomy, trạng thái thẩm định
│   │
│   ├── schemas/                        # Client-side Validation sử dụng Zod
│   │   ├── auth.schema.js              # Validate form đăng nhập, đổi mật khẩu
│   │   ├── agency.schema.js            # Validate thông tin studio, gói dịch vụ, thợ, ca làm, vị trí GPS
│   │   └── super-admin.schema.js       # Validate quy tắc giá động, danh mục, phong cách
│   │
│   ├── utils/                          # Tiện ích định dạng dữ liệu
│   │   └── formatters.js               # Định dạng tiền tệ VND, ngày giờ Việt Nam
│   │
│   ├── App.jsx                         # Component Root nạp AppRoutes & kiểm tra phiên đăng nhập
│   ├── main.jsx                        # Bootstrap React DOM
│   └── index.css                       # Global styles với Tailwind CSS & Luxury Beauty tokens
│
├── index.html                          # HTML root
├── eslint.config.mjs                   # ESLint với quy chuẩn nghiêm ngặt (0 warning, 0 error)
├── tailwind.config.js                  # Cấu hình Tailwind Design Tokens
├── vite.config.js                      # Cấu hình Vite bundler & dev server (Port 3000)
└── package.json                        # React 18, Vite 5, Tailwind 3, Zustand, Zod, Lucide-react
```

---

## III. Cấu trúc Ứng dụng Di động (Mobile App - Expo SDK 57 + Expo Router + TypeScript)

Áp dụng cho ứng dụng di động **Mobile App** phục vụ đúng **3 đối tượng người dùng**:
1. **Khách Hàng (`ROLE_CUSTOMER`)**: Tìm kiếm dịch vụ, đặt lịch hẹn, kích hoạt radar tìm thợ khẩn cấp 30s, theo dõi GPS thợ thời gian thực.
2. **Thợ Make-up Tự Do (`ROLE_FREELANCE_MUA`)**: Bật/tắt trạng thái trực tuyến (GPS Radar ON), nhận ca khẩn cấp 30s, theo dõi lịch hẹn và thu nhập.
3. **Nhân Viên Agency (`ROLE_AGENCY_STAFF`)**: Theo dõi lịch điều phối ca làm việc và trạng thái trực tuyến.
*(Super Admin & Agency Admin sử dụng cổng Web Admin Portal riêng).*

```text
code/app/
├── assets/                             # Tài nguyên đồ họa (Images, Splash, App Icons)
│   └── images/                         # Logo, Icons, Placeholder
│
├── src/
│   ├── app/                            # File-based Routing (Expo Router / Expo SDK 57)
│   │   ├── _layout.tsx                 # Root Layout: Theme, Splash, Auth bootstrap từ SecureStore
│   │   ├── index.tsx                   # Trang chủ hoàn chỉnh: Header GPS, Radar 30s, Top MUA, Bottom Nav
│   │   ├── explore.tsx                 # Màn hình khám phá / tìm kiếm phong cách
│   │   └── (auth)/                     # Phân hệ Xác thực tài khoản
│   │       ├── _layout.tsx             # Auth Stack Layout (slide animation)
│   │       ├── onboarding.tsx          # 3 màn hình Onboarding Carousel giới thiệu giá trị cốt lõi
│   │       ├── login.tsx               # Màn hình Đăng nhập chuẩn 100% Figma Rose Ruby & Deep Slate
│   │       └── register.tsx            # Màn hình Đăng ký tài khoản (Khách hàng & Thợ MUA)
│   │
│   ├── components/                     # UI Components tái sử dụng
│   │   ├── auth/                       # Component phục vụ xác thực
│   │   │   ├── BrandLogo.tsx           # Logo nhận diện thương hiệu MUA MAKEUP ✨
│   │   │   ├── RoleSegmentedControl.tsx# Tab chuyển đổi vai trò (CUSTOMER vs FREELANCER_MUA)
│   │   │   └── QuickTestAccounts.tsx   # Phím tắt chọn nhanh tài khoản test (3 vai trò)
│   │   ├── base/                       # Atomic Base Components
│   │   │   ├── BaseButton.tsx          # Nút bấm Rose Ruby (#E11D48) có mũi tên → & loading spinner
│   │   │   ├── BaseInput.tsx           # Ô nhập liệu có icon, label *, hiển thị lỗi, mắt toggle password
│   │   │   └── BaseModal.tsx           # Hộp thoại modal dùng chung
│   │   ├── customer/                   # Component nghiệp vụ Khách hàng
│   │   │   ├── EmergencyBookingCard.tsx# Thẻ đặt thợ khẩn cấp 30s phát sáng Rose
│   │   │   ├── StyleChipFilter.tsx     # Chip cuộn phong cách (Cô dâu, Dạ tiệc, Douyin...)
│   │   │   ├── MuaArtistCard.tsx       # Thẻ thông tin thợ MUA (Avatar, sao, km, giá, nút Đặt lịch)
│   │   │   └── LiveGpsTrackerView.tsx  # Bản đồ bám đuổi thợ di chuyển thời gian thực
│   │   └── mua/                        # Component nghiệp vụ Thợ MUA & Staff
│   │       ├── WorkstationStatusCard.tsx # Thẻ trạng thái Online/Offline GPS radar & thu nhập
│   │       ├── UrgentJobBroadcastModal.tsx# Modal đĩa quay 30s đếm ngược nhận đơn khẩn cấp
│   │       └── ProofPhotoCapture.tsx   # Chụp ảnh nghiệm thu hoàn tất dịch vụ
│   │
│   ├── constants/                      # Hằng số hệ thống & Bảng màu Design Tokens
│   │   ├── theme.ts                    # BrandColors (Rose Ruby #E11D48, Deep Slate #0F172A), Colors, Spacing
│   │   └── config.ts                   # Cấu hình timeout, hằng số phân trang
│   │
│   ├── services/                       # Tầng giao tiếp REST API & WebSocket
│   │   ├── api.ts                      # Axios Client (LAN IP 192.168.0.229:8080), Bearer Interceptor, Silent Refresh
│   │   ├── auth.service.ts             # Dịch vụ Auth (login, register, getCurrentUser, logout)
│   │   ├── booking.service.ts          # Dịch vụ Đặt lịch & Tính phụ phí
│   │   ├── telemetry.service.ts        # Dịch vụ GPS Telemetry & kết nối STOMP WebSocket (/ws-makeup)
│   │   └── wallet.service.ts           # Dịch vụ Quản lý ví & Cọc Escrow
│   │
│   ├── store/                          # Quản trị State toàn cục (Zustand)
│   │   ├── auth.store.ts               # Quản lý phiên làm việc, User profile, Role, Token
│   │   ├── booking.store.ts            # Quản lý giỏ dịch vụ, địa chỉ trang điểm, voucher
│   │   └── telemetry.store.ts          # Quản lý tọa độ thợ di chuyển & luồng radar 30s
│   │
│   ├── utils/                          # Tiện ích dùng chung
│   │   ├── storage.ts                  # Lưu trữ phần cứng qua expo-secure-store (Keychain / Keystore)
│   │   ├── currency.ts                 # Format tiền tệ VNĐ (ví dụ: 350.000đ)
│   │   ├── distance.ts                 # Tính khoảng cách tọa độ Haversine
│   │   └── dateTime.ts                 # Format ngày giờ đặt lịch
│   │
│   └── hooks/                          # Custom React Hooks
│       ├── useLocation.ts              # Lấy tọa độ GPS thiết bị (expo-location)
│       └── useCountdown.ts             # Bộ đếm ngược 30s nhận đơn khẩn cấp
│
├── app.json                            # Cấu hình Expo Project (Bundle ID, Permissions, Scheme)
├── tsconfig.json                       # Cấu hình TypeScript Strict Mode & Path Aliases (@/*)
├── package.json                        # Dependencies (expo, expo-router, expo-secure-store, axios, zustand)
└── .env.example                        # Mẫu biến môi trường (EXPO_PUBLIC_API_URL, EXPO_PUBLIC_WS_URL)
```

### Nguyên Tắc Kiến Trúc & Thiết Kế Bắt Buộc cho Mobile App:
1. **Lưu trữ & Bảo mật Phần cứng**:
   - Không sử dụng Cookie; lưu trữ JWT Access Token và Refresh Token trong phần cứng bảo mật qua `expo-secure-store` (iOS Keychain và Android Keystore).
   - Tự động gắn Bearer Token qua Axios Request Interceptor và cơ chế Silent Token Refresh khi gặp mã 401.
2. **Mạng cục bộ khi phát triển (Local Area Network)**:
   - Cấu hình `BASE_URL = __DEV__ ? 'http://192.168.0.229:8080/api/v1' : 'https://api.makeup-platform.com/api/v1'` để thiết bị thật hoặc máy ảo kết nối trực tiếp với backend trong cùng mạng Wi-Fi.
3. **Quy chuẩn Nhận diện Figma Rose Ruby & Typography**:
   - **Màu chủ đạo**: **Rose Ruby `#E11D48`** (`rose-600`), hover `#BE123C`, light `#FFE4E6`, viền mềm `#FECDD3`.
   - **Tiêu đề & Nền**: **Deep Slate `#0F172A`** (`slate-900`), Subtitle `#64748B`.
   - **Typography**: **Plus Jakarta Sans / Inter** (Sans-serif hiện đại). Nghiêm cấm sử dụng font có chân Serif (Playfair Display) và màu vàng Champagne cũ.

---

## IV. Backend Java (Layered Architecture Monolith with Domain Sub-packages)

Được thiết kế theo kiến trúc **Layered Architecture Monolith (Kiến trúc phân tầng kết hợp nhóm sub-package theo Domain nghiệp vụ)**. Toàn bộ hệ thống chạy chung một tiến trình Spring Boot (Port `8080`), giao tiếp giữa các module thông qua **Service Interface trực tiếp**, **Spring EventBus (`ApplicationEventPublisher`)** trong cùng JVM, và chuyển đổi dữ liệu thông qua **Tầng Mapper (Spring `@Component` / MapStruct)**:

```text
code/backend/core-api/
├── src/main/java/com/makeup/platform/
│   ├── Application.java                # Class khởi động chính của Spring Boot 3.3.x
│   │
│   ├── common/                         # TẦNG DÙNG CHUNG TOÀN HỆ THỐNG (Cross-cutting Concerns)
│   │   ├── base/                       # Các lớp trừu tượng nền tảng
│   │   │   ├── BaseEntity.java         # @MappedSuperclass chứa id (Long IDENTITY), created_at, updated_at
│   │   │   ├── BaseController.java     # Chuẩn hóa ApiResponse<T> (ok, created, noContent, error)
│   │   │   ├── ApiResponse.java        # Cấu trúc Wrapper response API chuẩn: {success, code, message, data, timestamp}
│   │   │   ├── PageResponse.java       # Chuẩn hóa phân trang: {content, page, size, totalElements, totalPages, last}
│   │   │   ├── BaseService.java        # Interface CRUD Generics <T, ID>
│   │   │   └── BaseServiceImpl.java    # Xử lý CRUD cơ bản dùng chung
│   │   ├── constants/                  # Hằng số hệ thống
│   │   │   ├── ErrorCodes.java         # Bộ mã định danh lỗi toàn hệ thống (ERR_USER_NOT_FOUND, ERR_PACKAGE_NOT_FOUND...)
│   │   │   ├── SecurityConstants.java  # Token prefix (Bearer), Header name, Expiration time
│   │   │   ├── MediaConstants.java     # Giới hạn dung lượng (10MB/5MB), định dạng MIME cho phép (WEBP, JPG, PNG)
│   │   │   ├── PaginationConstants.java# DEFAULT_PAGE_SIZE = 10, MAX_PAGE_SIZE = 50
│   │   │   └── RegexConstants.java     # Regex số điện thoại VN, mật khẩu mạnh
│   │   ├── exception/                  # Xử lý lỗi tập trung toàn hệ thống
│   │   │   ├── GlobalExceptionHandler.java  # @RestControllerAdvice bắt lỗi validation & nghiệp vụ
│   │   │   ├── CustomBusinessException.java # Ngoại lệ nghiệp vụ tùy biến (errorCode, HttpStatus)
│   │   │   ├── ResourceNotFoundException.java # Lỗi không tìm thấy bản ghi (404)
│   │   │   └── MediaUploadException.java    # Lỗi upload CDN Cloudinary/S3
│   │   ├── i18n/                       # Đa ngôn ngữ (Tiếng Việt & Tiếng Anh)
│   │   │   ├── CustomLocaleResolver.java    # Phân giải ngôn ngữ từ Header Accept-Language
│   │   │   └── JsonMessageSource.java       # Nạp file thông báo lỗi từ resources/i18n/
│   │   └── utils/                      # Tiện ích bổ trợ
│   │       ├── JwtUtils.java           # Sinh và giải mã Access Token & Refresh Token
│   │       ├── CookieUtils.java        # Đọc / ghi HttpOnly Cookie cho Refresh Token
│   │       ├── SecurityContextUtils.java# Trích xuất userId, muaId, agencyId từ SecurityContext
│   │       ├── FileValidationUtils.java# Kiểm tra Magic Bytes nhị phân chống upload mã độc
│   │       ├── HolidayUtils.java       # Tra cứu lịch nghỉ lễ quốc gia & Tết Nguyên Đán Việt Nam
│   │       └── DateUtils.java          # Định dạng múi giờ Asia/Ho_Chi_Minh
│   │
│   ├── config/                         # CẤU HÌNH FRAMEWORK & HẠ TẦNG
│   │   ├── SecurityConfig.java         # Spring Security 6, JWT Filter, Method Security, Whitelist URLs
│   │   ├── JwtAuthenticationFilter.java# Bộ lọc kiểm tra JWT Access Token & Redis Token Blacklist
│   │   ├── JwtAuthenticationEntryPoint.java # Xử lý 401 Unauthorized
│   │   ├── CustomAccessDeniedHandler.java   # Xử lý 403 Forbidden
│   │   ├── RedisConfig.java            # Cấu hình RedisTemplate cho Redis GEO, Caching & Token Blacklist
│   │   ├── CloudinaryConfig.java       # Cấu hình CDN Cloudinary SDK
│   │   ├── I18nConfig.java             # Cấu hình MessageSource & LocaleResolver
│   │   ├── WebSocketConfig.java        # Cấu hình Embedded STOMP WebSocket Gateway (/ws-makeup)
│   │   └── RedissonConfig.java         # Cấu hình Redisson Distributed Lock (Redlock)
│   │
│   ├── security/                       # BẢO MẬT & USER PRINCIPAL
│   │   ├── CustomUserDetails.java      # Wrapper UserPrincipal tích hợp roles & permissions
│   │   └── CustomUserDetailsService.java# Tải thông tin người dùng từ Database
│   │
│   ├── mapper/                         # TẦNG CHUYỂN ĐỔI DATA MAPPING (Spring @Component / MapStruct)
│   │   ├── auth/                       # AuthMapper (UserEntity <-> AuthRes, UserInfoRes)
│   │   ├── catalog/                    # MasterTaxonomyMapper, ServicePackageMapper, PackageItemMapper, SurchargeMapper, PortfolioMapper
│   │   ├── mua/                        # MuaProfileMapper, MuaStyleMapper
│   │   ├── agency/                     # AgencyProfileMapper, AgencyStaffMapper, AgencyShiftMapper
│   │   ├── booking/                    # BookingMapper, BookingTimelineMapper, BookingStaffAssignmentMapper
│   │   ├── telemetry/                  # TelemetryMapper (TelemetryLogEntity <-> DTO)
│   │   ├── pricing/                    # PricingMapper (InvoicePreviewRes, SurchargeBreakdownRes)
│   │   └── wallet/                     # WalletMapper, LedgerMapper, TransactionMapper
│   │
│   ├── controller/                     # TẦNG REST CONTROLLERS (Nhóm theo Domain Nghiệp vụ)
│   │   ├── admin/                      # AdminMasterCategoryController, AdminMuaCredentialController
│   │   ├── auth/                       # AuthController (/api/v1/auth)
│   │   ├── customer/                   # CustomerProfileController (/api/v1/customer)
│   │   ├── catalog/                    # ServicePackageController, PackageItemController, SurchargeController, MasterCategoryController
│   │   ├── mua/                        # MuaProfileController, MuaStyleController, MuaPortfolioController
│   │   ├── agency/                     # AgencyProfileController, AgencyStaffController, AgencyShiftController, AgencyDispatchController
│   │   ├── booking/                    # BookingStateController, ScheduledBookingCustomerController, InstantBookingCustomerController
│   │   ├── telemetry/                  # LocationStreamController, TelemetryQueryController
│   │   ├── pricing/                    # DynamicPricingController, SurgeRuleAdminController
│   │   ├── wallet/                     # WalletController, PayoutController (/api/v1/wallets)
│   │   └── review/                     # ReviewController, DisputeTicketController (/api/v1/reviews)
│   │
│   ├── dto/                            # DATA TRANSFER OBJECTS (Request & Response theo Domain)
│   │   ├── request/
│   │   │   ├── admin/                  # AdminCategoryReq, AdminApproveMuaReq
│   │   │   ├── auth/                   # RegisterReq, LoginReq, RefreshTokenReq, ChangePasswordReq, UpdateProfileReq
│   │   │   ├── catalog/                # CreatePackageReq, UpdatePackageReq, CreatePackageItemReq, ConfigureSurchargeReq
│   │   │   ├── mua/                    # UpdateMuaProfileReq, AssignMuaStylesReq, CreatePortfolioReq
│   │   │   ├── agency/                 # UpdateAgencyProfileReq, AssignStaffToBookingReq, CreateShiftReq
│   │   │   ├── booking/                # CreateInstantBookingReq, CreateScheduledBookingReq, TransitionBookingStateReq
│   │   │   ├── telemetry/              # LocationStreamReq, ToggleAvailabilityReq, NearbyProvidersReq
│   │   │   ├── pricing/                # PreviewInvoiceReq, CalculateDistanceReq, ConfigureSurgeRuleReq
│   │   │   └── wallet/                 # TopUpWalletReq, WithdrawalReq
│   │   └── response/
│   │       ├── auth/                   # AuthRes, UserInfoRes, UserRegisterRes
│   │       ├── catalog/                # PackageDetailRes, PackageSummaryRes, PackageItemRes, SurchargeDetailRes
│   │       ├── media/                  # MediaUploadRes (url, publicId, width, height, format, bytes)
│   │       ├── mua/                    # MuaProfileRes, MuaStyleRes, PortfolioShowcaseRes
│   │       ├── agency/                 # AgencyProfileRes, AgencyStaffRes, StaffAvailabilityMatrixRes
│   │       ├── booking/                # BookingDetailRes, InstantBookingCreatedRes, ScheduledBookingCreatedRes
│   │       ├── telemetry/              # NearbyProviderRes, LiveTrackingRes, TelemetryLogRes
│   │       ├── pricing/                # InvoicePreviewRes, DistanceMatrixRes
│   │       └── wallet/                 # WalletBalanceRes, TransactionHistoryRes
│   │
│   ├── entity/                         # JPA ENTITIES (Phân bổ theo PostgreSQL Schemas)
│   │   ├── auth/                       # UserEntity, RoleEntity, RolePermissionEntity (auth_schema)
│   │   ├── agency/                     # AgencyProfileEntity, AgencyStaffEntity, WorkShiftEntity (agency_schema)
│   │   ├── mua/                        # MuaProfileEntity, MuaStyleEntity, MuaCertificateEntity, PortfolioShowcaseEntity (mua_schema)
│   │   ├── catalog/                    # MasterCategoryEntity, MakeupStyleEntity, ServicePackageEntity, PackageItemEntity, SurchargeEntity (catalog_schema)
│   │   ├── booking/                    # BookingEntity, BookingItemEntity, BookingHistoryEntity, MUACalendarEntity, BookingStaffAssignmentEntity (booking_schema)
│   │   ├── telemetry/                  # TelemetryLogEntity (telemetry_schema PostGIS Point)
│   │   ├── pricing/                    # SurgePricingRuleEntity, DistanceTierConfigEntity (pricing_schema)
│   │   └── wallet/                     # WalletEntity, TransactionEntity, LedgerEntryEntity, PayoutEntity (wallet_schema)
│   │
│   ├── repository/                     # SPRING DATA JPA REPOSITORIES (Nhóm theo Domain)
│   │   ├── UserRepository.java, RoleRepository.java, RolePermissionRepository.java
│   │   ├── AgencyProfileRepository.java, MuaProfileRepository.java
│   │   ├── catalog/                    # MasterCategoryRepository, MakeupStyleRepository, ServicePackageRepository, PackageItemRepository, SurchargeRepository
│   │   ├── mua/                        # MuaCertificateRepository, PortfolioShowcaseRepository, MuaStyleRepository
│   │   ├── agency/                     # AgencyStaffRepository, AgencyStaffServiceRepository, AgencyStaffStyleRepository, WorkShiftRepository
│   │   ├── booking/                    # BookingRepository, BookingItemRepository, BookingHistoryRepository, MUACalendarRepository, BookingStaffAssignmentRepository
│   │   ├── telemetry/                  # TelemetryLogRepository (PostGIS ST_DistanceSphere)
│   │   ├── pricing/                    # SurgePricingRuleRepository
│   │   └── wallet/                     # WalletRepository, LedgerEntryRepository, TransactionRepository
│   │
│   └── service/                        # TẦNG BUSINESS LOGIC (Nhóm sub-package theo Domain Nghiệp vụ)
│       ├── auth/                       # Nghiệp vụ Xác thực, Quản lý tài khoản & Token
│       │   ├── AuthService.java, UserService.java, RedisTokenService.java
│       │   └── impl/ (AuthServiceImpl, UserServiceImpl, RedisTokenServiceImpl)
│       ├── media/                      # Nghiệp vụ Quản lý Media & Upload CDN Cloudinary
│       │   ├── MediaService.java
│       │   └── impl/MediaServiceImpl.java
│       ├── catalog/                    # Nghiệp vụ Danh mục Gói dịch vụ & Bộ tính Phụ phí
│       │   ├── MasterTaxonomyService.java, ServicePackageService.java, PackageItemService.java, SurchargeService.java
│       │   ├── helper/CatalogOwnerHelper.java (Ngăn chặn IDOR)
│       │   └── impl/
│       ├── mua/                        # Nghiệp vụ Hồ sơ Thợ, Phong cách & Portfolio ảnh
│       │   ├── MuaProfileService.java, MuaStyleService.java, PortfolioService.java
│       │   └── impl/
│       ├── agency/                     # Nghiệp vụ Studio, Duyệt thợ, Xếp ca & Điều phối
│       │   ├── AgencyProfileService.java, AgencyStaffService.java, AgencyShiftService.java, AgencyDispatchService.java
│       │   └── impl/
│       ├── booking/                    # Nghiệp vụ Booking State Machine, Instant & Scheduled Booking
│       │   ├── BookingStateMachineService.java, InstantBookingService.java, ScheduledBookingService.java, MUACalendarService.java
│       │   └── impl/
│       ├── telemetry/                  # Nghiệp vụ GPS Telemetry, Redis GEO & PostGIS Tracking
│       │   ├── RedisGeoService.java, TelemetryStreamService.java, TelemetryQueryService.java
│       │   └── impl/
│       ├── pricing/                    # Động cơ Tính giá động, Maps API & Preview Hóa đơn
│       │   ├── DynamicPricingService.java, MapsClientService.java, DistanceFeeService.java, SurgePricingService.java
│       │   └── impl/
│       ├── wallet/                     # Nghiệp vụ Ví điện tử & Sổ cái kế toán đúp (Double-entry)
│       │   ├── WalletService.java, LedgerService.java, EscrowService.java, PaymentGatewayService.java
│       │   └── impl/
│       └── notification/               # Nghiệp vụ Realtime STOMP & Push Notification
│           ├── NotificationService.java, WebSocketBroadcastService.java
│           └── impl/
│
├── src/test/java/com/makeup/platform/  # BỘ MÃ KIỂM THỬ TỰ ĐỘNG (Unit Tests & Integration Tests)
│   ├── config/JwtAuthenticationFilterTest.java
│   └── service/
│       ├── AuthServiceTest.java
│       ├── ServicePackageServiceImplTest.java
│       └── SurchargeServiceImplTest.java

│
├── Dockerfile                          # Multi-stage build Dockerfile (Eclipse Temurin 21 Alpine JRE)
├── .dockerignore
├── build.gradle                        # Quản lý dependencies (Spring Boot 3.3.x, Flyway, Postgres, Redis)
└── src/main/resources/
    ├── application.yaml                # Cấu hình chính (Datasource, Redis, JWT Secrets, Business Tiers)
    ├── application-dev.yaml            # Cấu hình môi trường Local/Development
    ├── application-prod.yaml           # Cấu hình môi trường Production
    └── db/migration/                   # Phiên bản hóa CSDL tự động bằng Flyway
        ├── V1__Create_Schemas_And_Extensions.sql
        ├── V2__Init_Auth_And_Profiles.sql
        └── V3__Init_Catalog_And_Surcharges.sql
```

---

## IV. Tóm tắt các điểm cải tiến cốt lõi đã điều chỉnh:

1. **Khớp đúng bài toán Makeup Platform**: 
   - Đã thay đổi toàn bộ tên ví dụ sinh viên/trường học thành đúng bài toán trang điểm: `admin/` và `agency/`, `freelancer/`, `customer/`.
   - Gói dịch vụ, danh mục (`catalog/`), thợ đại lý & thợ tự do (`agency/`, `staff/`), đặt lịch khẩn cấp & lịch hẹn (`booking/`), GPS PostGIS/Redis GEO (`telemetry/`), ví kế toán đúp (`wallet/`).

2. **Chuẩn hóa Kiến trúc Modular Monolith**:
   - Chuyển `api-gateway` thành `core-api`, gom 10 module độc lập theo Bounded Contexts. Mỗi module có cấu trúc Layered chuẩn mực (`controller`, `dto`, `entity`, `repository`, `service/impl`).
   - Tích hợp **In-Memory EventBus** (`event/`, `listener/`) và **Redisson Distributed Lock** để giải quyết triệt để tranh chấp nhận đơn booking (Race condition) giữa nhiều thợ cùng lúc.

3. **Frontend React Vite hoàn chỉnh**:
   - Bổ sung cấu hình routing theo RBAC (`RoleBasedRoute`), trang quản lý điều phối theo lịch trình, bản đồ Live Tracking, và popup đếm ngược nhận ca khẩn cấp 30s qua STOMP WebSocket.
   - Định dạng chuẩn thư mục quản lý State (Zustand), Validation (Zod), Linter (ESLint) và Formatter (Prettier).

4. **CSDL & Quản trị Di chuyển (Migrations)**:
   - Tích hợp thư mục `db/migration/` với các file Flyway SQL đồng bộ 100% với DDL `schema.sql` (PostgreSQL 16 + PostGIS 3.4).
