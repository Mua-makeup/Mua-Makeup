# System-Wide Architecture & Engineering Rules: Makeup Booking Platform

## 1. Triết lý Kiến trúc Toàn Hệ thống (System Architecture)
Hệ thống Nền tảng Đặt lịch Make-up (**Makeup Booking Platform**) được xây dựng theo kiến trúc **Modular Monolith kết hợp Layered Architecture (Kiến trúc phân tầng)** và **Single Page Application (SPA)** Frontend theo tiêu chuẩn ISO/IEC/IEEE 29148:

- **Backend Duy Nhất (Spring Boot Core API)**:
  - Dự án gom toàn bộ các phân hệ về **1 ứng dụng Spring Boot duy nhất (`code/backend/core-api`)** chạy trên Port `8080`.
  - Giao tiếp giữa các module nội bộ diễn ra trực tiếp qua **Service Interface** hoặc **Spring In-Memory EventBus (`ApplicationEventPublisher`)** (độ trễ <5ms), loại bỏ hoàn toàn network overhead.
  - Tích hợp **Embedded WebSocket STOMP WSS** tại endpoint `/ws-makeup` để phục vụ realtime (đặt đơn khẩn cấp 30s, live tracking GPS, chat).
  - Tích hợp **Redisson Distributed Lock** trên Redis chống race-condition khi nhiều thợ cùng tranh chấp nhận ca khẩn cấp.

- **Cơ sở Dữ liệu Tập trung (1 Database + 8 PostgreSQL Schemas)**:
  - 1 CSDL duy nhất: `makeup_platform_db` (PostgreSQL 16 + PostGIS extension).
  - Quản lý phân vùng dữ liệu độc lập theo 8 PostgreSQL Schemas:
    1. `auth_schema`: `users`, `roles`, `user_roles`, `role_permissions`.
    2. `agency_schema`: `agency_profiles`, `agency_staff`, `agency_staff_services`, `agency_staff_styles`.
    3. `mua_schema`: `mua_profiles`, `mua_styles`, `mua_calendars`.
    4. `catalog_schema`: `master_service_categories`, `makeup_styles`, `service_packages`, `package_items`, `package_styles`, `portfolio_showcases`, `surcharges`.
    5. `booking_schema`: `bookings`, `booking_items`, `booking_history`.
    6. `telemetry_schema`: `telemetry_logs` (PostGIS Geometry Point 4326).
    7. `wallet_schema`: `wallets`, `user_bank_accounts`, `withdrawal_requests`, `payment_transactions`, `transactions`, `wallet_transactions`, `ledger_entries` (Sổ cái kế toán đúp).
    8. `interaction_schema`: `in_app_notifications`, `reviews`, `disputes`.
  - Hỗ trợ giao dịch **ACID trọn vẹn** trong 1 `@Transactional` duy nhất.

- **Frontend (React + Vite + JavaScript/JSX)**:
  - Ứng dụng giao diện modularized, kết nối tập trung về `http://localhost:8080/api/v1/*` và WebSocket `ws://localhost:8080/ws-makeup`.
  - Design system cao cấp (**Luxury Beauty / Glamour Aesthetic**) với TailwindCSS tokens.
  - Validation 100% qua **Zod** schema tại `src/schemas/`.

---

## 2. Quy chuẩn Bắt buộc cho Backend Layered Architecture

Mã nguồn tại `code/backend/core-api/` bắt buộc tuân thủ cấu trúc phân tầng:
```text
src/main/java/com/makeup/platform/
├── Application.java                   # Class bootstrap Spring Boot
├── common/
│   ├── base/                          # BaseEntity (@MappedSuperclass id, created_at, updated_at), BaseController, BaseService, BaseServiceImpl
│   ├── constants/                     # ErrorCodes, SecurityConstants, RegexConstants
│   ├── exception/                     # GlobalExceptionHandler (@RestControllerAdvice), CustomBusinessException
│   └── utils/                         # Helpers (JwtUtils, DateUtils, GeoSpatialUtils)
├── config/                            # SecurityConfig, OpenApiConfig, DatabaseConfig, RedisConfig, RedissonConfig, WebSocketConfig
├── controller/                        # TẦNG API (Phân chia theo Actors/Roles):
│   ├── auth/                          # AuthController (/api/v1/auth)
│   ├── customer/                      # CustomerBookingController, CustomerWalletController
│   ├── agency/                        # AgencyStaffController, AgencyDispatchController
│   ├── freelancer/                    # FreelancerJobController, FreelancerPortfolioController
│   └── admin/                         # AdminUserController, AdminDisputeController
├── dto/                               # DATA TRANSFER OBJECT:
│   ├── request/                       # Dữ liệu Client gửi lên (@Valid, @NotBlank...) theo nhóm nghiệp vụ
│   └── response/                      # Dữ liệu trả về (AuthRes, BookingDetailRes, PaginatedRes<T>)
├── entity/                            # TẦNG JPA: Map với CSDL, kế thừa BaseEntity, chỉ định rõ schema
├── repository/                        # TẦNG TRUY VẤN: JpaRepository và repository/custom/ (Native SQL, Stored Proc, PostGIS)
└── service/                           # TẦNG NGHIỆP VỤ LÕI:
    ├── impl/                          # THƯ MỤC BẮT BUỘC CHỨA CODE THỰC THI THẬT
    └── <Domain>Service.java           # INTERFACE ĐỊNH NGHĨA HỢP ĐỒNG HÀNH ĐỘNG
```

### 2.1. Quy tắc Code & Data Flow Backend
1. **Tuyệt đối không expose Entity ra ngoài Controller**: Luôn sử dụng Request DTO (`dto/request/`) và Response DTO (`dto/response/`). Controller luôn trả về `ResponseEntity<ApiResponse<T>>`.
2. **Bắt buộc Bean Validation**: Mọi Request DTO phải chứa `@NotBlank`, `@NotNull`, `@Min`, `@Max`, `@Email`, `@Pattern`, `@Future`. Controller phải có `@Valid @RequestBody`.
3. **Kế thừa Base Components**: Mọi JPA Entity phải kế thừa `BaseEntity`. Mọi Controller kế thừa `BaseController`. Mọi CRUD service cơ bản kế thừa `BaseService` & `BaseServiceImpl`.
4. **Tách biệt Interface và Implementation**: Thư mục `service/` chỉ chứa Interface. Toàn bộ code thực thi logic nghiệp vụ nằm trong `service/impl/`.
5. **Quản lý Ngoại lệ & i18n**: Không hardcode thông báo lỗi tiếng Việt/Anh trong code Java. Ném `CustomBusinessException` và định nghĩa thông điệp qua ResourceBundle tại `resources/text/messages.properties`.
6. **Database Migration với Flyway**: Mọi thay đổi bảng phải viết script Flyway tập trung tại `resources/db/migration/V<N>__<Mo_ta>.sql`.
7. **Bảo mật & Biến môi trường**: Không hardcode mật khẩu hay secret key vào code; toàn bộ đọc qua `.env` và `application.yaml` (`${DB_PASSWORD:123456}`).
8. **1 Tài khoản - 1 Vai trò (Single Role per Account)**: Mỗi tài khoản chỉ gán 1 vai trò duy nhất (`ROLE_CUSTOMER`, `ROLE_FREELANCE_MUA`, `ROLE_AGENCY_ADMIN`, `ROLE_AGENCY_STAFF`, `ROLE_SUPER_ADMIN`).
9. **Quản lý Token trên Redis**: Refresh Token lưu trên Redis (`rt:{token}` $\rightarrow$ `userId`), Blacklist Access Token khi logout (`jwt:blacklist:{token}`).

---

## 3. Quy chuẩn Bắt buộc cho Frontend (React + Vite + JavaScript/JSX)

```text
code/frontend/
├── src/
│   ├── schemas/                       # Zod schemas validation form & payload API
│   ├── services/                      # Axios HTTP client tương tác backend (http://localhost:8080/api/v1)
│   ├── constants/                     # Định nghĩa hằng số hệ thống (tránh Magic Numbers)
│   ├── utils/                         # Hàm dùng chung (format tiền tệ, ngày giờ, geolocation)
│   ├── hooks/                         # Custom React hooks (useBooking, useGpsTracker, useAuth)
│   ├── store/                         # Zustand global state (authStore, bookingStore)
│   ├── components/
│   │   ├── base/                      # Atomic UI (BaseButton, BaseInput, BaseModal, BaseTable)
│   │   └── features/                  # UI theo nghiệp vụ (booking, agency, catalog...)
│   ├── layouts/                       # MainLayout, AuthLayout
│   ├── pages/                         # Màn hình theo phân hệ (auth, agency, admin, catalog, wallet)
│   └── routes/                        # Cấu hình react-router-dom với RoleBasedRoute
├── eslint.config.mjs                  # Linter: boundaries, kebab-case, no magic numbers
└── tailwind.config.js                 # Design system Luxury Beauty tokens
```

---

## 4. Quy chuẩn Realtime & Concurrency Control
1. **GPS Telemetry**: Stream tọa độ thợ gửi qua Embedded WebSocket `/ws-makeup` theo chu kỳ 5–10s, lưu vị trí tức thời vào Redis GEO và phát tới khách hàng qua `/topic/gps-stream/{bookingId}`.
2. **Instant Booking Broadcast**: Khi khách đặt ca gấp 30-60 phút, hệ thống quét thợ rảnh qua Redis GEO $\rightarrow$ Broadcast qua STOMP `/topic/booking-broadcast` kèm đồng hồ đếm ngược 30-45s $\rightarrow$ Thợ nhận ca đầu tiên được bảo vệ chống race condition bằng **Redlock (Redisson)**.
3. **Ví & Escrow**: Khi đơn hoàn thành, Spring EventBus kích hoạt `DoubleEntryLedgerService` tự động giải ngân từ quỹ cọc Escrow vào Ví Đại lý và Ví Thợ trong cùng 1 database transaction ACID.
