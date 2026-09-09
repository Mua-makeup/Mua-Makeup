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
│   └── UI/UX style guideline/          # Bộ quy chuẩn giao diện thiết kế
│       ├── design-tokens.json          # Bảng mã màu chủ đạo, typography, spacing
│       └── design-system.md            # Hướng dẫn component UI, Responsive guideline
│
├── code/                               # Mã nguồn thực thi của toàn bộ hệ thống
│   ├── frontend/                       # Ứng dụng Web Client (React JS + Vite)
│   └── backend/                        # Ứng dụng Backend Spring Boot (Modular Monolith)
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

## II. Cấu trúc Frontend (React JS + Vite)

Áp dụng cho ứng dụng **Web Agency Management Portal & Web Admin**.

```text
code/frontend/
├── .husky/                             # Git pre-commit hooks chặn commit lỗi
│   └── pre-commit                      # Script chạy linter và type check trước khi commit
│
├── public/                             # Tài nguyên tĩnh độc lập không qua build pipeline
│   ├── favicon.ico
│   ├── robots.txt
│   └── locales/                        # Đa ngôn ngữ i18n (vi.json, en.json)
│
├── src/
│   ├── assets/                         # Tài nguyên được Vite xử lý, tối ưu hóa
│   │   ├── images/                     # Ảnh logo, placeholder thợ, banner
│   │   ├── icons/                      # SVG icons tự custom
│   │   └── fonts/                      # Font chữ typography nội bộ
│   │
│   ├── pages/                          # Các màn hình phân theo phân hệ & vai trò
│   │   ├── auth/                       # Trang Đăng nhập, Đăng ký (Agency/Freelancer), Quên mật khẩu
│   │   │   ├── LoginPage.jsx
│   │   │   └── RegisterPage.jsx
│   │   ├── admin/                      # Nhóm màn hình Quản trị viên (Super Admin)
│   │   │   ├── DashboardPage.jsx       # Báo cáo tổng thể doanh thu, GMV, đơn booking
│   │   │   ├── UserManagementPage.jsx  # Quản lý tài khoản và khóa thợ/đại lý
│   │   │   └── DisputeResolutionPage.jsx # Giải quyết khiếu nại, hoàn tiền cọc
│   │   ├── agency/                     # Nhóm màn hình dành cho Chủ Studio / Quản lý Đại lý
│   │   │   ├── StaffManagementPage.jsx # Quản lý thợ nội bộ, gán style & ma trận xếp ca
│   │   │   ├── DispatchBoardPage.jsx   # Bảng điều phối đơn ca khẩn cấp & lịch hẹn
│   │   │   └── InternalRevenuePage.jsx # Doanh thu & bảng chia hoa hồng thợ
│   │   ├── catalog/                    # Quản lý danh mục gói dịch vụ & cấu hình phụ phí
│   │   │   ├── ServiceCatalogPage.jsx  # CRUD Gói dịch vụ & upload ảnh Portfolio
│   │   │   └── SurchargeConfigPage.jsx # Cấu hình phụ phí di chuyển, phụ phí sáng sớm
│   │   └── wallet/                     # Quản lý số dư, lịch sử giao dịch và rút tiền
│   │       ├── WalletPage.jsx
│   │       └── WithdrawalRequestPage.jsx
│   │
│   ├── components/                     # Hệ thống Component giao diện tái sử dụng
│   │   ├── base/                       # Component UI nguyên tử cơ bản (Shadcn UI / Custom)
│   │   │   ├── BaseButton.jsx
│   │   │   ├── BaseInput.jsx
│   │   │   ├── BaseModal.jsx
│   │   │   ├── BaseTable.jsx           # Bảng dữ liệu có phân trang, search, sorting
│   │   │   └── BaseBadge.jsx           # Badge trạng thái đơn đặt lịch
│   │   └── features/                   # Component gắn liền với logic nghiệp vụ
│   │       ├── auth/                   # Form đăng nhập, bộ chọn vai trò
│   │       ├── booking/                # Popup đếm ngược nhận đơn (Countdown 30s)
│   │       ├── catalog/                # Thẻ hiển thị gói dịch vụ, gallery ảnh portfolio
│   │       ├── map/                    # Bản đồ radar theo dõi vị trí thợ realtime (Leaflet/Google Map)
│   │       └── dispatch/               # Ma trận ca làm việc nhân viên studio
│   │
│   ├── routes/                         # Cấu hình điều hướng (React Router DOM v6+)
│   │   ├── index.jsx                   # Khai báo tuyến đường tổng hợp
│   │   ├── ProtectedRoute.jsx          # Kiểm tra JWT Token & phiên đăng nhập
│   │   └── RoleBasedRoute.jsx          # Phân quyền truy cập theo RBAC (ADMIN, AGENCY_OWNER...)
│   │
│   ├── layouts/                        # Bộ khung giao diện chuẩn
│   │   ├── MainLayout.jsx              # Khung Dashboard có Sidebar điều hướng, Header, Thông báo
│   │   ├── AuthLayout.jsx              # Khung đơn giản căn giữa cho trang Login/Register
│   │   └── components/                 # Thành phần con của layout (Header, Sidebar, UserMenu)
│   │
│   ├── lib/                            # Cấu hình các thư viện bên ngoài
│   │   ├── axios.js                    # Axios instance gắn Bearer Token & Refresh Token Interceptor
│   │   ├── stomp-client.js             # Cấu hình kết nối WebSocket STOMP (WSS)
│   │   └── utils.js                    # Format tiền tệ VND, định dạng ngày giờ Việt Nam
│   │
│   ├── hooks/                          # Custom React Hooks
│   │   ├── useAuth.js                  # Hook lấy thông tin phiên người dùng và quyền hạn
│   │   ├── useWebSocket.js             # Hook lắng nghe kênh tin nhắn WebSocket
│   │   └── useDebounce.js              # Hook tối ưu tìm kiếm gói dịch vụ/địa điểm
│   │
│   ├── store/                          # Quản lý State toàn cục bằng Zustand
│   │   ├── useAuthStore.js             # Lưu trữ User profile, Access Token, Permissions
│   │   ├── useBookingAlertStore.js     # Lưu trạng thái popup nhận ca khẩn cấp realtime
│   │   └── useThemeStore.js            # Quản lý Dark/Light theme
│   │
│   ├── styles/                         # Cấu hình CSS
│   │   ├── index.css                   # Global CSS & Tailwind Directives (@tailwind)
│   │   └── variables.css               # Biến màu sắc theo chuẩn UI/UX Style Guideline
│   │
│   ├── providers/                      # Bộ bọc Provider (React Query, Theme, Toast Provider)
│   │   ├── QueryClientProvider.jsx
│   │   └── ToastProvider.jsx
│   │
│   ├── schemas/                        # Client-side Validation sử dụng Zod
│   │   ├── auth.schema.js              # Validate số điện thoại, mật khẩu, CCCD/Mã số thuế
│   │   ├── catalog.schema.js           # Validate giá gói dịch vụ, thời gian thực hiện
│   │   └── surcharge.schema.js         # Validate mốc km, khung giờ sáng sớm
│   │
│   ├── services/                       # Tầng gọi API Backend (gắn với Axios)
│   │   ├── authService.js
│   │   ├── catalogService.js
│   │   ├── bookingService.js
│   │   ├── agencyService.js
│   │   └── walletService.js
│   │
│   ├── constants/                      # Hằng số giao diện và cấu hình
│   │   ├── api-endpoints.js            # Danh sách URL API Backend
│   │   ├── roles.js                    # Danh sách vai trò (CUSTOMER, FREELANCER, AGENCY, ADMIN)
│   │   └── booking-status.js           # Enum trạng thái đơn đặt lịch
│   │
│   ├── App.jsx                         # Component Root kết nối Router & Providers
│   └── main.jsx                        # Điểm khởi chạy chính gắn vào file index.html
│
├── index.html                          # Trang HTML chính chứa thẻ div #root
├── eslint.config.mjs                   # Cấu hình ESLint (cấm unused-vars, ép kebab-case file name)
├── .prettierrc                         # Định dạng mã nguồn (tabWidth 2, singleQuote true, semi true)
├── tailwind.config.js                  # Khai báo bảng màu Pastel, khoảng cách, font chữ hệ thống
├── vite.config.js                      # Cấu hình Vite (Alias `@/`, proxy API local `/api`)
├── Dockerfile                          # Build Nginx Alpine phục vụ static files trên production
├── .dockerignore
├── package.json                        # Khai báo React 18, Vite, Tailwind, Zustand, Zod, Lucide-react
├── .gitignore
└── .env.example                        # Mẫu cấu hình môi trường (VITE_API_BASE_URL, VITE_WS_URL)
```

---

## III. Backend Java (Modular Monolith - Layered Architecture)

Được thiết kế theo kiến trúc **Modular Monolith kết hợp Layered Architecture (Kiến trúc phân tầng)**. Toàn bộ hệ thống chạy chung một tiến trình Spring Boot (Port `8080`), giao tiếp giữa các module thông qua **Spring EventBus (`ApplicationEventPublisher`)** và **Service Interface** trực tiếp, không qua độ trễ mạng:

```text
code/backend/core-api/
├── src/main/java/com/makeup/platform/
│   ├── MakeupPlatformApplication.java  # Class khởi động chính của Spring Boot 3.3.x
│   │
│   ├── common/                         # TẦNG DÙNG CHUNG TOÀN HỆ THỐNG (Cross-cutting Concerns)
│   │   ├── base/                       # Các lớp trừu tượng nền tảng
│   │   │   ├── BaseEntity.java         # @MappedSuperclass chứa id (UUID), created_at, updated_at
│   │   │   ├── BaseController.java     # Chuẩn hóa ResponseWrapper<T> (code, message, data, timestamp)
│   │   │   ├── BaseService.java        # Interface CRUD Generics <T, ID>
│   │   │   └── BaseServiceImpl.java    # Xử lý CRUD cơ bản dùng chung
│   │   ├── constants/                  # Hằng số hệ thống
│   │   │   ├── SecurityConstants.java  # Token prefix, Header name, Expiration time
│   │   │   ├── ErrorCode.java          # Bộ mã lỗi (USER_NOT_FOUND, BOOKING_RACE_CONDITION...)
│   │   │   └── RegexConstants.java     # Biểu thức chính quy cho Số điện thoại VN, Email, CCCD
│   │   ├── exception/                  # Xử lý lỗi tập trung toàn hệ thống
│   │   │   ├── GlobalExceptionHandler.java  # @RestControllerAdvice bắt lỗi validation & nghiệp vụ
│   │   │   ├── BusinessException.java  # Lỗi vi phạm logic nghiệp vụ trả về HTTP 400/409
│   │   │   ├── ResourceNotFoundException.java # Trả về HTTP 404
│   │   │   └── UnauthorizedException.java   # Trả về HTTP 401/403
│   │   └── utils/                      # Tiện ích bổ trợ
│   │       ├── JwtUtils.java           # Sinh và giải mã Access Token & Refresh Token
│   │       ├── GeoSpatialUtils.java    # Tính khoảng cách phẳng Harversine dự phòng
│   │       └── DateUtils.java          # Định dạng múi giờ Asia/Ho_Chi_Minh
│   │
│   ├── config/                         # CẤU HÌNH FRAMEWORK & HẠ TẦNG
│   │   ├── SecurityConfig.java         # Spring Security 6, JWT Filter, CORS config, Whitelist URLs
│   │   ├── OpenApiConfig.java          # Cấu hình Swagger/OpenAPI v3 docs tại /swagger-ui.html
│   │   ├── DatabaseConfig.java         # HikariCP Pool kết nối PostgreSQL 16 & PostGIS Extension
│   │   ├── RedisConfig.java            # Cấu hình RedisTemplate cho Redis GEO và TTL Caching
│   │   ├── RedissonConfig.java         # Cấu hình Redisson Client xử lý Khóa phân tán (Distributed Lock)
│   │   └── WebSocketConfig.java        # Đăng ký STOMP Endpoint WSS `/ws-makeup` và MessageBroker
│   │
│   └── modules/                        # TỔ CHỨC CÁC BOUNDED CONTEXTS THEO LAYERED ARCHITECTURE
│       │
│       ├── auth/                       # MODULE 1: AUTHENTICATION, USERS & PHÂN QUYỀN RBAC (4 Bảng)
│       │   ├── controller/             # AuthController (/api/v1/auth), UserController, RoleController
│       │   ├── dto/                    # LoginReq, RegisterReq, TokenRes, UserProfileRes
│       │   ├── entity/                 # UserEntity, RoleEntity, UserRoleEntity, RolePermissionEntity
│       │   ├── repository/             # UserRepository, RoleRepository, PermissionRepository
│       │   └── service/                # AuthService (Interface), UserServiceImpl, RbacServiceImpl
│       │
│       ├── agency/                     # MODULE 2: AGENCY OPERATIONS & QUẢN LÝ THỢ STUDIO
│       │   ├── controller/             # AgencyStaffController, WorkShiftController
│       │   ├── dto/                    # InviteStaffReq, AssignStyleReq, ShiftScheduleReq
│       │   ├── entity/                 # AgencyProfileEntity, AgencyStaffEntity, WorkShiftEntity
│       │   ├── repository/             # AgencyStaffRepository, WorkShiftRepository
│       │   └── service/                # AgencyStaffServiceImpl, ShiftSchedulingServiceImpl
│       │
│       ├── catalog/                    # MODULE 3: SERVICE CATALOG, STYLES & ALBUM PORTFOLIO
│       │   ├── controller/             # PackageController, StyleCategoryController, PortfolioController
│       │   ├── dto/                    # CreatePackageReq, SurchargeConfigReq, PortfolioUploadReq
│       │   ├── entity/                 # ServicePackageEntity, StyleEntity, PortfolioShowcaseEntity
│       │   ├── repository/             # ServicePackageRepository, PortfolioRepository
│       │   └── service/                # CatalogServiceImpl, PortfolioServiceImpl
│       │
│       ├── booking/                    # MODULE 4: BOOKING ENGINE & DISPATCHING (State Machine + Redlock)
│       │   ├── controller/             # BookingController (/api/v1/bookings), DispatchController
│       │   ├── dto/                    # CreateBookingReq, AcceptBookingReq, BookingDetailRes
│       │   ├── entity/                 # BookingOrderEntity, BookingTimelineEntity, BookingAssignmentEntity
│       │   ├── event/                  # BookingCreatedEvent, BookingMatchedEvent, BookingCancelledEvent
│       │   ├── repository/             # BookingOrderRepository, BookingTimelineRepository
│       │   └── service/                # BookingStateMachineService, DispatchingServiceImpl
│       │
│       ├── telemetry/                  # MODULE 5: GPS TELEMETRY & REDIS GEO INDEX
│       │   ├── controller/             # LocationStreamController (/api/v1/telemetry/location)
│       │   ├── dto/                    # LocationUpdateReq (lat, lng, bearing, speed, status)
│       │   ├── repository/             # RedisGeoRepository (GEOADD thợ rảnh vào key 'mua:geo:active')
│       │   └── service/                # LocationTrackingServiceImpl, GeoQueryServiceImpl
│       │
│       ├── pricing/                    # MODULE 6: DYNAMIC PRICING ENGINE & TÍNH PHỤ PHÍ
│       │   ├── controller/             # PricingEstimateController (/api/v1/pricing/estimate)
│       │   ├── dto/                    # PriceEstimateReq, InvoicePreviewRes (Chi tiết phụ phí + km)
│       │   ├── entity/                 # SurchargeRuleEntity, DistancePricingTierEntity
│       │   └── service/                # DynamicPricingCalculatorService, SurchargeEngineServiceImpl
│       │
│       ├── wallet/                     # MODULE 7: VÍ ĐIỆN TỬ & SỔ CÁI KẾ TOÁN ĐÚP (7 Bảng Double-entry)
│       │   ├── controller/             # WalletController, PayoutController, PaymentWebhookController
│       │   ├── dto/                    # TopUpWalletReq, WithdrawalReq, EscrowReleaseReq
│       │   ├── entity/                 # WalletEntity, TransactionEntity, LedgerEntryEntity, PayoutEntity
│       │   ├── repository/             # WalletRepository, LedgerEntryRepository
│       │   └── service/                # DoubleEntryLedgerService, EscrowServiceImpl, PayoutServiceImpl
│       │
│       ├── notification/               # MODULE 8: IN-APP REALTIME TOAST & PUSH NOTIFICATION
│       │   ├── listener/               # BookingEventListener (@EventListener bắt sự kiện in-memory)
│       │   ├── dto/                    # NotificationPayloadDto, PushNotificationReq
│       │   └── service/                # InAppNotificationService, FcmPushNotificationServiceImpl
│       │
│       ├── websocket/                  # MODULE 9: EMBEDDED WSS GATEWAY CONNECTION HANDLER
│       │   ├── handler/                # StompChannelInterceptor (Bảo mật JWT trên handshake STOMP)
│       │   ├── controller/             # ChatSocketController, LocationSocketController
│       │   └── service/                # WebSocketBroadcastService (Bắn countdown 30s đến thợ)
│       │
│       └── review/                     # MODULE 10: RATINGS, REVIEWS, TIPS & KHIẾU NẠI (Disputes)
│           ├── controller/             # ReviewController, TipController, DisputeTicketController
│           ├── dto/                    # SubmitReviewReq, CreateTipReq, OpenDisputeReq
│           ├── entity/                 # ReviewEntity, TipEntity, DisputeTicketEntity
│           ├── repository/             # ReviewRepository, DisputeTicketRepository
│           └── service/                # ReviewServiceImpl, DisputeResolutionServiceImpl
│
├── unitest/                            # Bộ mã kiểm thử tự động (Unit Tests & Integration Tests)
│   ├── java/com/makeup/platform/
│   │   ├── auth/AuthServiceTest.java
│   │   ├── booking/BookingRaceConditionTest.java # Kiểm thử tranh chấp đơn ca khẩn bằng Redisson
│   │   └── wallet/DoubleEntryLedgerTest.java     # Kiểm tra tính toàn vẹn số dư Nợ/Có (Debit = Credit)
│
├── sonarLint/                          # Bộ quy tắc quản lý nợ kỹ thuật và phân tích tĩnh SonarQube
│   └── sonar-rules.xml
│
├── Dockerfile                          # Multi-stage build Dockerfile (Eclipse Temurin 21 Alpine JRE)
├── .dockerignore
├── build.gradle                        # Quản lý dependencies (Spring Boot 3.3.x, Flyway, Postgres, Redisson)
└── src/main/resources/
    ├── application.yaml                # Cấu hình chính (Datasource, Redis, JWT Secrets, Business Tiers)
    ├── application-dev.yaml            # Cấu hình môi trường Local/Development
    ├── application-prod.yaml           # Cấu hình môi trường Production
    ├── text/                           # Thư mục i18n ResourceBundle (Không hardcode text tiếng Việt)
    │   ├── messages_vi.properties      # Thông báo lỗi tiếng Việt thân thiện người dùng
    │   └── messages_en.properties      # Thông báo tiếng Anh chuẩn hóa
    └── db/migration/                   # Phiên bản hóa CSDL tự động bằng Flyway
        ├── V1__Init_Tables_Auth_RBAC.sql
        ├── V2__Init_Agency_And_Catalog.sql
        ├── V3__Init_Booking_And_Location_PostGIS.sql
        └── V4__Init_Wallet_7_Tables_Double_Entry.sql
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
