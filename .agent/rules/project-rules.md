---
trigger: always_on
---

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
├── controller/                        # TẦNG API (Thin Controller - CHỈ GỌI SERVICE, KHÔNG CHỨA LOGIC NGHIỆP VỤ):
│   ├── auth/                          # AuthController (/api/v1/auth)
│   ├── customer/                      # CustomerBookingController, CustomerWalletController
│   ├── agency/                        # AgencyStaffController, AgencyDispatchController
│   ├── freelancer/                    # FreelancerJobController, FreelancerPortfolioController
│   └── admin/                         # AdminUserController, AdminDisputeController
├── dto/                               # DATA TRANSFER OBJECT:
│   ├── request/                       # Dữ liệu Client gửi lên (@Valid, @NotBlank...) theo nhóm nghiệp vụ
│   └── response/                      # Dữ liệu trả về (AuthRes, BookingDetailRes, PaginatedRes<T>)
├── entity/                            # TẦNG JPA: Map với CSDL, kế thừa BaseEntity, chỉ định rõ schema
├── mapper/                            # TẦNG CHUYỂN ĐỔI DỮ LIỆU (MANUAL MAPPER @Component):
│   ├── auth/                          # AuthMapper (UserEntity <-> DTO)
│   ├── catalog/                       # ServicePackageMapper, SurchargeMapper, PortfolioMapper...
│   └── mua/                           # MuaProfileMapper, MuaStyleMapper...
├── repository/                        # TẦNG TRUY VẤN: JpaRepository và repository/custom/ (Native SQL, Stored Proc, PostGIS)
└── service/                           # TẦNG NGHIỆP VỤ LÕI (CHỨA 100% BUSINESS LOGIC):
    ├── impl/                          # THƯ MỤC BẮT BUỘC CHỨA CODE THỰC THI THẬT
    └── <Domain>Service.java           # INTERFACE ĐỊNH NGHĨA HỢP ĐỒNG HÀNH ĐỘNG
```

### 2.1. Quy tắc Code & Data Flow Backend
1. **Chỉ thực hiện Logic ở Tầng Service (Pure Service Logic)**: Toàn bộ quy tắc nghiệp vụ, kiểm tra ràng buộc (business validation), phân quyền dữ liệu, chuyển đổi trạng thái, quản lý giao dịch (`@Transactional`), bắn sự kiện (`ApplicationEventPublisher`) và xử lý cache (`@Cacheable`/`@CacheEvict`) BẮT BUỘC nằm 100% tại Service (`service/impl/`).
2. **Tầng Controller mỏng (Thin Controller) - Chỉ chuyển tiếp tới Service**: Controller TUYỆT ĐỐI KHÔNG chứa business logic, không rẽ nhánh tính toán nghiệp vụ, không gọi Repository hoặc dịch vụ bên ngoài, không tự chuyển đổi/map Entity phức tạp. Controller chỉ nhận HTTP request, kích hoạt validation (`@Valid`), trích xuất thông tin người dùng (`@AuthenticationPrincipal`), ủy quyền hoàn toàn cho Service tương ứng và bọc kết quả trả về `ResponseEntity<ApiResponse<T>>`.
3. **Chuyển đổi Dữ liệu tập trung qua Tầng Mapper (Manual Mapper @Component)**:
   - Toàn bộ việc chuyển đổi dữ liệu giữa Entity $\leftrightarrow$ DTO (Entity sang Response DTO, Request DTO sang Entity) BẮT BUỘC phải tạo class riêng tại package `com.makeup.platform.mapper.<domain>.*Mapper`.
   - BẮT BUỘC sử dụng **Manual Mapper** đánh dấu là Spring `@Component`, viết mã Java tường minh bằng Builder Pattern hoặc Getter/Setter.
   - TUYỆT ĐỐI KHÔNG dùng thư viện mapping ẩn/reflection/code-gen như MapStruct hay ModelMapper. Lý do: Manual Mapper đảm bảo minh bạch 100%, kiểm soát null-safety tuyệt đối, loại bỏ rủi ro reflection runtime overhead hoặc lỗi annotation-processor, dễ debug step-by-step và viết Unit Test độc lập.
   - Tầng Service inject các Mapper bean này qua Dependency Injection (`@RequiredArgsConstructor`) để map dữ liệu.
4. **Tuyệt đối không expose Entity ra ngoài Controller**: Luôn sử dụng Request DTO (`dto/request/`) và Response DTO (`dto/response/`). Controller luôn trả về `ResponseEntity<ApiResponse<T>>`.
5. **Bắt buộc Bean Validation**: Mọi Request DTO phải chứa `@NotBlank`, `@NotNull`, `@Min`, `@Max`, `@Email`, `@Pattern`, `@Future`. Controller phải có `@Valid @RequestBody`.
6. **Kế thừa Base Components**: Mọi JPA Entity phải kế thừa `BaseEntity`. Mọi Controller kế thừa `BaseController`. Mọi CRUD service cơ bản kế thừa `BaseService` & `BaseServiceImpl`.
7. **Tách biệt Interface và Implementation**: Thư mục `service/` chỉ chứa Interface. Toàn bộ code thực thi logic nghiệp vụ nằm trong `service/impl/`.
9. **Database Migration với Flyway (Teamwork Standard - Timestamp Versioning)**:
   - **Quy tắc đặt tên bắt buộc**: Mọi script migration mới BẮT BUỘC đặt tên theo chuẩn Timestamp: `resources/db/migration/V<YYYYMMDDHHmmss>__<Mo_ta>.sql` (Ví dụ: `V20260914210900__Init_Location_Telemetry_Module.sql`).
   - **Tuyệt đối KHÔNG dùng số tuần tự `V<N>` (V7, V8, V9...)**: Vì khi 4+ thành viên làm việc song song trên nhiều nhánh Git khác nhau, số tuần tự sẽ dẫn đến xung đột phiên bản và lỗi `checksum mismatch` hoặc `applied migration not resolved locally`.
   - **Cấu hình Spring Boot Flyway**: Bắt buộc kích hoạt `spring.flyway.out-of-order=true` và `spring.flyway.ignore-migration-patterns=["*:missing"]` trong `application.yaml` để đảm bảo các nhánh merge lệch thời gian hoặc chuyển nhánh không gây sập ứng dụng.
   - **Tính bất biến (Immutability)**: Tuyệt đối KHÔNG sửa nội dung hay định dạng các file migration đã commit/apply. Mọi thay đổi DDL/DML mới phải tạo file Timestamp mới tiếp theo.
10. **Bảo mật & Biến môi trường**: Không hardcode mật khẩu hay secret key vào code; toàn bộ đọc qua `.env` và `application.yaml` (`${DB_PASSWORD:123456}`).
11. **1 Tài khoản - 1 Vai trò (Single Role per Account)**: Mỗi tài khoản chỉ gán 1 vai trò duy nhất (`ROLE_CUSTOMER`, `ROLE_FREELANCE_MUA`, `ROLE_AGENCY_ADMIN`, `ROLE_AGENCY_STAFF`, `ROLE_SUPER_ADMIN`).
12. **Quản lý Token trên Redis**: Refresh Token lưu trên Redis (`rt:{token}` $\rightarrow$ `userId`), Blacklist Access Token khi logout (`jwt:blacklist:{token}`).

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

---

## 5. Quy chuẩn Bắt buộc về Đa ngôn ngữ (System-Wide Internationalization - i18n)

Hệ thống bắt buộc tuân thủ chuẩn đa ngôn ngữ song song trên cả hai tầng **Backend (Spring Boot)** và **Frontend (React + Vite)**:

### 5.1. Quy chuẩn Đa ngôn ngữ cho Backend (Core API)
1. **Tuyệt đối KHÔNG hardcode chuỗi thông báo** bằng tiếng Việt hoặc tiếng Anh trong Controller, Service, Validator hay Exception handler.
2. **Cấu trúc File i18n JSON**:
   - Tất cả chuỗi hiển thị thành công và thông báo lỗi phải được khai báo đồng thời tại cả 2 file:
     - `src/main/resources/i18n/messages_en.json` (Tiếng Anh - Mặc định)
     - `src/main/resources/i18n/messages_vi.json` (Tiếng Việt)
   - Đặt key theo dạng phân cấp hoặc tiền tố module: ví dụ `mua.profile_update_success`, `booking.cancel_success`, hoặc theo mã lỗi `ErrorCodes`.
3. **Cơ chế xác định ngôn ngữ (Locale Resolution)**:
   - Hệ thống tự động nhận diện ngôn ngữ theo thứ tự ưu tiên:
     1. Header `Accept-Language` trên HTTP Request (`vi`, `vi-VN`, `en`, `en-US`).
     2. Cài đặt ngôn ngữ của User đăng nhập (`language` trong JWT Token & trường `language` của bảng `auth_schema.users`).
     3. Fallback mặc định: `en` (Tiếng Anh).
4. **Ném ngoại lệ & Phản hồi API**:
   - Ném ngoại lệ bằng message key: `throw new CustomBusinessException(ErrorCodes.XXX, "module.error_key", args...)`.
   - Trả về response bằng message key: `return ok(res, "module.success_key")` hoặc `created(res, "module.created_key")`. `BaseController` và `GlobalExceptionHandler` sẽ tự động tra cứu file JSON và trả về thông điệp bản địa hóa chuẩn xác.

### 5.2. Quy chuẩn Bắt buộc Đa ngôn ngữ cho Frontend (React SPA)
1. **Tuyệt đối KHÔNG hardcode văn bản UI trong JSX**:
   - Mọi chuỗi hiển thị giao diện (tiêu đề trang, menu điều hướng, nhãn form, nút bấm, placeholder, thẻ trạng thái, hộp thoại xác nhận modal, tooltip) BẮT BUỘC phải gọi qua hook `useI18nStore` (`const { t } = useI18nStore(); {t('key')}`).
   - Nghiêm cấm hiển thị pha trộn ngôn ngữ ("chỗ tiếng Việt, chỗ tiếng Anh").
2. **Đồng bộ song ngữ 100% tại `src/constants/i18n.constant.js`**:
   - Mọi key mới được khai báo trong `TRANSLATIONS.vi` BẮT BUỘC phải có bản dịch chuẩn nghĩa tiếng Anh trong `TRANSLATIONS.en`.
   - Tổ chức key theo tiền tố module rõ ràng: `nav_*`, `btn_*`, `field_*`, `status_*`, `agency_*`, `admin_*`, `modal_*`.
3. **Trích xuất thông báo lỗi & Toast từ Backend**:
   - Khi thực hiện các hành động gọi API (thêm, sửa, xóa, duyệt, từ chối...), thông báo Toast thành công hoặc lỗi BẮT BUỘC phải trích xuất trực tiếp thông điệp đã bản địa hóa từ Backend (`err.response?.data?.message || err.message` hoặc `res.message`).
   - Tầng Axios HTTP client (`api-client.js`) luôn tự động đính kèm header `Accept-Language: vi` (hoặc `en`) theo ngôn ngữ hiện tại trong `localStorage`.
   - Khi Backend trả về lỗi validation trường dữ liệu (`err.response?.data?.data`), Frontend map trực tiếp các thông điệp này vào form helper error.
4. **Chuyển đổi ngôn ngữ tức thời (Instant Switching)**:
   - Khi người dùng bấm nút chuyển ngữ trên thanh Header, Zustand store cập nhật `language`, lưu `localStorage`, đồng bộ `apiClient`, và kích hoạt re-render toàn bộ giao diện mà không cần reload trang.

---

## 6. Quy chuẩn Quyền hạn & Giới hạn Tác vụ của AI (AI Boundaries & User Authority)

Nhằm đảm bảo tính toàn vẹn của mã nguồn, quyền kiểm soát tối cao của người dùng và tính nhất quán với mục tiêu dự án, AI BẮT BUỘC tuân thủ nghiêm ngặt các nguyên tắc sau:

1. **Người Dùng Là Người "Commit" (Xác Nhận & Chốt Code) Cuối Cùng**:
   - **User chính là người DUY NHẤT có quyền "commit" cuối cùng** — được hiểu theo nghĩa là **nghiệm thu, xác nhận và chốt mã nguồn tối hậu** (chứ không chỉ bó hẹp ở lệnh `git commit`).
   - Mọi câu trả lời, đoạn code hay giải pháp do AI đưa ra chỉ mang tính đề xuất để người dùng đánh giá. AI TUYỆT ĐỐI KHÔNG được tự ý xem một thay đổi là đã hoàn thành hay tự quyết định chốt code khi người dùng chưa chính thức xác nhận.
   - Toàn quyền quyết định lưu trữ, chốt phiên bản và đồng bộ mã nguồn thuộc về người dùng.

2. **AI Không Được Phép Tự Ý Thay Đổi Yêu Cầu Khi Người Dùng Chưa Chấp Thuận (Strict Requirement Freezing)**:
   - AI TUYỆT ĐỐI KHÔNG được tự ý thay đổi, cắt giảm, biến tướng hoặc tự suy diễn mở rộng yêu cầu ban đầu của người dùng khi chưa có sự đồng ý rõ ràng.
   - Nếu phát hiện vấn đề kỹ thuật hoặc có giải pháp tối ưu hơn, AI CHỈ ĐƯỢC đề xuất phương án và giải thích lý do; KHÔNG ĐƯỢC tự ý áp dụng cho đến khi người dùng rõ ràng đồng ý ("Accept").

3. **Mọi Câu Trả Lời Sửa Code Đều Phải Do Người Dùng Accept (Mandatory User Acceptance)**:
   - Toàn bộ các câu trả lời sửa code, tái cấu trúc file hoặc thêm chức năng BẮT BUỘC phải được trình bày minh bạch để người dùng trực tiếp kiểm duyệt và bấm **Accept / Chấp thuận**.
   - Mọi chỉnh sửa chỉ có hiệu lực và được coi là hoàn tất khi người dùng đã Accept. Nếu người dùng chưa Accept, từ chối hoặc yêu cầu điều chỉnh, AI phải tuân thủ nghiêm túc chỉ đạo của người dùng để chỉnh sửa lại cho đến khi đạt yêu cầu.

4. **Tuyệt Đối Không Tự Ý Viết Unit / Integration Test (No Unit Tests Required)**:
   - AI TUYỆT ĐỐI KHÔNG tự ý viết mới, thêm mới, sửa đổi hoặc sinh code các file kiểm thử (Unit Test, Integration Test, Mockito/JUnit test suites).
   - Tuyệt đối không tạo hoặc can thiệp vào thư mục `src/test/` trừ khi người dùng có chỉ đạo hoặc yêu cầu trực tiếp rõ ràng.
   - Việc xác thực chất lượng code tập trung vào việc kiểm tra cú pháp, hợp đồng kiểu dữ liệu và biên dịch thành công qua Gradle (`compileJava`).
