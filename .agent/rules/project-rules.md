# System-Wide Architecture & Engineering Rules: Makeup Booking Platform

## 1. Triết lý Kiến trúc Toàn Hệ thống (System Architecture)
Hệ thống Nền tảng Đặt lịch Make-up (**Makeup Booking Platform**) được xây dựng theo kiến trúc **Event-Driven Microservices** kết hợp **Single Page Application (SPA)** Frontend theo tiêu chuẩn ISO/IEC/IEEE 29148:

- **Backend (Spring Boot 3 Ecosystem & Event Broker)**:
  - 8 Microservices chuyên sâu:
    1. `api-gateway`: Spring Cloud Gateway + Netty WebSocket Persistent Gateway, JWT Verification, Rate Limiting.
    2. `user-agency-mua-profile-service`: Quản lý tài khoản, RBAC, hồ sơ thợ (Portfolio, bằng cấp, chứng chỉ).
    3. `agency-operations-service`: Quản lý nghiệp vụ Đại lý/Studio, mời thợ, xếp ca làm việc, cấu hình hoa hồng nội bộ.
    4. `catalog-media-service`: Quản lý gói dịch vụ Đại lý & Freelancer, upload/nén ảnh/video Before-After (Cloudinary/S3).
    5. `location-service`: High-throughput GPS Telemetry streaming, Redis GEO, PostGIS tracking.
    6. `booking-service`: State Machine quản lý đơn hàng, điều phối 2 luồng (Realtime vs Scheduled), chống tranh chấp ca làm qua Redlock.
    7. `pricing-service`: Tính cước phí di chuyển thực tế (Google/Goong Maps API), phụ phí đêm/sáng sớm 3h-5h, Surge Pricing.
    8. `payment-service`: Quản lý Ví điện tử 3 tầng (Khách, Thợ, Đại lý, Sàn), ký quỹ Escrow, thanh toán MoMo/VNPay/Stripe.
  - **Asynchronous Event Bus**: Apache Kafka làm message broker trung tâm truyền tin bất đồng bộ giữa các service.

- **Frontend (React + Vite + JavaScript/JSX)**:
  - Ứng dụng giao diện modularized, chia tách ranh giới rõ ràng qua `eslint-plugin-boundaries`.
  - Design system cao cấp (Luxury Beauty / Glamour aesthetic) với TailwindCSS ghi đè semantic tokens (`brand-*`, `surface-*`).
  - Validation chặt chẽ qua **Zod** schema tại `src/schemas/`.
  - Giám sát lỗi realtime qua **Sentry**.

---

## 2. Quy chuẩn Bắt buộc cho Backend Microservices (Layered Architecture)

Mọi Microservice trong `code/backend/<service-name>/` bắt buộc tuân thủ cấu trúc phân tầng:
```text
src/main/java/com/trung/<service_name>/
├── Application.java                   # Class bootstrap Spring Boot
├── common/
│   ├── base/                          # BaseEntity (@MappedSuperclass id, created_at, updated_at), BaseController, BaseService, BaseServiceImpl
│   ├── constants/                     # ErrorCodes, SystemConstants, RegexConstants
│   ├── exception/                     # GlobalExceptionHandler (@RestControllerAdvice), CustomBusinessException
│   └── utils/                         # Helpers (JwtUtils, DateUtils, PasswordEncoder)
├── config/                            # SecurityConfig, OpenApiConfig, DatabaseConfig, KafkaConfig, RedisConfig
├── controller/                        # TẦNG API: admin/, customer/, agency/, freelancer/
├── dto/                               # DATA TRANSFER OBJECT: request/ (@Valid), response/ (PaginatedRes<T>)
├── entity/                            # TẦNG JPA: Map với CSDL, kế thừa BaseEntity
├── repository/                        # TẦNG TRUY VẤN: JpaRepository và repository/custom/ (Native SQL, Stored Proc)
└── service/                           # TẦNG NGHIỆP VỤ: Interface (service/) và Implementation (service/impl/)
```

### 2.1. Quy tắc Code & Data Flow Backend
1. **Tuyệt đối không expose Entity ra ngoài Controller**: Luôn sử dụng Request DTO (`dto/request/*Req.java`) và Response DTO (`dto/response/*Res.java`).
2. **Bắt buộc Validation**: Mọi Request DTO phải chứa Bean Validation (`@NotBlank`, `@NotNull`, `@Min`, `@Max`, `@Email`, `@Pattern`, `@Future`). Controller phải có `@Valid @RequestBody`.
3. **Kế thừa Base Components**: Mọi Entity phải kế thừa `BaseEntity`. Mọi Controller kế thừa `BaseController`. Mọi CRUD service cơ bản kế thừa `BaseService` & `BaseServiceImpl`.
4. **Quản lý Ngoại lệ & i18n**: Không hardcode thông báo lỗi tiếng Việt/Anh trong code Java. Ném `CustomBusinessException` và định nghĩa thông điệp qua ResourceBundle tại `resources/text/messages.properties`.
5. **Database Migration với Flyway**: Mọi thay đổi bảng phải viết script Flyway tại `resources/db/migration/V<N>__<Mo_ta>.sql`. Nghiêm cấm bật `ddl-auto: create/update` trên môi trường production.
6. **Kiểm soát chất lượng**: Thư mục `unitest/` và `sonarLint/` quản lý unit test và bộ rule chất lượng code.

---

## 3. Quy chuẩn Bắt buộc cho Frontend (React + Vite + JavaScript/JSX)

Mọi module trong `code/frontend/` bắt buộc tuân thủ cấu trúc:
```text
code/frontend/
├── src/
│   ├── schemas/                       # Zod schemas validation form & payload API
│   ├── services/                      # Axios HTTP client tương tác backend
│   ├── constants/                     # Định nghĩa hằng số hệ thống (tránh Magic Numbers)
│   ├── utils/                         # Hàm dùng chung (format tiền tệ, ngày giờ, geolocation)
│   ├── hooks/                         # Custom React hooks (useBooking, useLocationTracking, useAuth)
│   ├── store/                         # Zustand global state (authStore, bookingStore, cartStore)
│   ├── components/
│   │   ├── base/                      # Atomic UI (BaseButton, BaseInput, BaseModal, BaseTable)
│   │   └── features/                  # UI theo nghiệp vụ (features/booking/, features/agency/...)
│   ├── layouts/                       # MainLayout, AuthLayout, AgencyLayout, CustomerLayout
│   ├── pages/                         # Màn hình tổng hợp
│   └── routes/                        # Cấu hình react-router-dom
├── eslint.config.mjs                  # Linter khắt khe: boundaries, kebab-case, no magic numbers, no hardcode colors
├── tailwind.config.js                 # Design system ghi đè mã màu
├── sentry/                            # Giám sát và ghi nhận crash bug
└── Dockerfile, docker-compose.yml
```

### 3.1. Quy tắc Code Frontend
1. **Ranh giới Module (Module Boundaries)**: `schemas/`, `utils/`, `constants/` tuyệt đối không được import ngược từ `components/`, `pages/`, `services/`.
2. **Form Validation**: 100% form và API payload phải được kiểm tra qua **Zod** schema tại `src/schemas/`.
3. **Cấm Magic Numbers & Hard-coded Colors**: Mọi mã màu phải lấy từ semantic color palette của `tailwind.config.js` (`brand-rose`, `brand-gold`, `surface-dark`, `surface-light`), mọi con số (timeout, pagination limit) phải đưa vào `src/constants/`.
4. **Quy ước đặt tên**:
   - React Components: `PascalCase.jsx` (`BookingCard.jsx`, `CountdownModal.jsx`).
   - Helpers, Schemas, Services: `kebab-case.js` (`booking-service.js`, `agency.schema.js`).
   - Custom Hooks: `use<Name>.js` (`useGpsTracker.js`).

---

## 4. Quy chuẩn Event-Driven & Realtime Streaming
1. **Realtime GPS Telemetry**: Stream tọa độ thợ di chuyển gửi qua WebSocket theo chu kỳ 5–10s, đẩy qua Kafka topic `driver-location-stream` vào Redis GEO.
2. **Realtime Instant Booking**: Khi khách đặt ca gấp 30-60 phút, hệ thống quét thợ rảnh qua Redis GEO $\rightarrow$ Broadcast qua WebSocket kèm đồng hồ đếm ngược 30-45s $\rightarrow$ Thợ nhận đơn được bảo vệ chống race condition bằng **Redlock**.
3. **Ví & Escrow**: Khi đơn hoàn thành (`BOOKING_COMPLETED`), Booking Service phát Kafka Event $\rightarrow$ Payment Service tự động giải ngân từ quỹ cọc Escrow vào Ví Đại lý và Ví Thợ.
