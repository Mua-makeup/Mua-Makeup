# System-Wide Architecture & Engineering Rules: Makeup Booking Platform

## 1. Triết lý Kiến trúc Toàn Hệ thống (System Architecture)
Hệ thống Nền tảng Đặt lịch Make-up (**Makeup Booking Platform**) được xây dựng theo kiến trúc **Event-Driven Microservices** kết hợp **Single Page Application (SPA)** Frontend theo tiêu chuẩn ISO/IEC/IEEE 29148:

- **Backend (9 Spring Boot Microservices)**:
  1. `api-gateway` (Port: 8080): Stateless HTTP Reverse Proxy, JWT Verification, Rate Limiting (Redis DB 0).
  2. `websocket-service` (Port: 8088): Stateful Connection Hub, quản lý WebSocket STOMP, Redis Pub/Sub (Redis DB 1), Kafka bridge.
  3. `user-agency-mua-profile-service` (Port: 8081): Quản lý Users, phân quyền RBAC, hồ sơ thợ (Portfolio, bằng cấp, chứng chỉ) $\rightarrow$ DB: `user_profile_db`.
  4. `agency-operations-service` (Port: 8082): Quản lý nhân sự Studio, mời thợ (Email/Mã giới thiệu), phân quyền nội bộ, chia sẻ hoa hồng $\rightarrow$ DB: `agency_operations_db`.
  5. `catalog-media-service` (Port: 8083): Danh mục gói dịch vụ, giá niêm yết, Album ảnh Trước/Sau (Before-After), Cloudinary CDN $\rightarrow$ DB: `catalog_media_db`.
  6. `location-service` (Port: 8084): High-throughput GPS Telemetry streaming, Redis GEO (Redis DB 2), lưu vết di chuyển PostGIS $\rightarrow$ DB: `location_tracking_db`.
  7. `booking-service` (Port: 8085): State Machine quản lý đơn hàng, điều phối 2 luồng (Realtime vs Scheduled), Redlock chống tranh chấp đơn (Redis DB 3) $\rightarrow$ DB: `booking_dispatch_db`.
  8. `pricing-service` (Port: 8086): Dynamic Pricing, tính cước di chuyển thực tế (Google/Goong Maps API), phụ phí đêm/sớm 3h-5h, Surge pricing, Cache cước (Redis DB 4).
  9. `payment-service` (Port: 8087): Quản lý Ví điện tử 3 tầng (Khách, Thợ, Đại lý, Sàn), ký quỹ Escrow, thanh toán MoMo/VNPay $\rightarrow$ DB: `payment_wallet_db`.

- **Asynchronous Event Broker (Apache Kafka & Zookeeper)**:
  - Kafka Broker (Port: 9092) làm trung tâm truyền tin sự kiện phân tán giữa các service (VD: `driver-location-stream`, `booking-broadcast`, `BOOKING_COMPLETED`).

- **Frontend (React + Vite + JavaScript/JSX)**:
  - Ứng dụng giao diện modularized, chia tách ranh giới rõ ràng qua `eslint-plugin-boundaries`.
  - Design system cao cấp (**Luxury Beauty / Glamour Aesthetic**) với TailwindCSS tokens (`brand-*`, `surface-*`).
  - Validation 100% qua **Zod** schema tại `src/schemas/`.
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
2. **Bắt buộc Bean Validation**: Mọi Request DTO phải chứa `@NotBlank`, `@NotNull`, `@Min`, `@Max`, `@Email`, `@Pattern`, `@Future`. Controller phải có `@Valid @RequestBody`.
3. **Kế thừa Base Components**: Mọi JPA Entity phải kế thừa `BaseEntity`. Mọi Controller kế thừa `BaseController`. Mọi CRUD service cơ bản kế thừa `BaseService` & `BaseServiceImpl`.
4. **Quản lý Ngoại lệ & i18n**: Không hardcode thông báo lỗi tiếng Việt/Anh trong code Java. Ném `CustomBusinessException` và định nghĩa thông điệp qua ResourceBundle tại `resources/text/messages.properties`.
5. **Database Migration với Flyway**: Mọi thay đổi bảng phải viết script Flyway tại `resources/db/migration/V<N>__<Mo_ta>.sql`. Nghiêm cấm bật `ddl-auto: create/update` trên môi trường production.
6. **Bảo mật & Biến môi trường**: Tuyệt đối không hardcode mật khẩu hay secret key vào code; toàn bộ đọc qua `.env` và `application.yaml` (`${DB_PASSWORD:123456}`).

---

## 3. Quy chuẩn Bắt buộc cho Frontend (React + Vite + JavaScript/JSX)

```text
code/frontend/
├── src/
│   ├── schemas/                       # Zod schemas validation form & payload API
│   ├── services/                      # Axios HTTP client tương tác backend
│   ├── constants/                     # Định nghĩa hằng số hệ thống (tránh Magic Numbers)
│   ├── utils/                         # Hàm dùng chung (format tiền tệ, ngày giờ, geolocation)
│   ├── hooks/                         # Custom React hooks (useBooking, useGpsTracker, useAuth)
│   ├── store/                         # Zustand global state (authStore, bookingStore)
│   ├── components/
│   │   ├── base/                      # Atomic UI (BaseButton, BaseInput, BaseModal, BaseTable)
│   │   └── features/                  # UI theo nghiệp vụ (features/booking/, features/agency/...)
│   ├── layouts/                       # MainLayout, AuthLayout, AgencyLayout, CustomerLayout
│   ├── pages/                         # Màn hình tổng hợp
│   └── routes/                        # Cấu hình react-router-dom
├── eslint.config.mjs                  # Linter khắt khe: boundaries, kebab-case, no magic numbers, no hardcode colors
├── tailwind.config.js                 # Design system ghi đè mã màu Luxury Beauty
└── sentry/                            # Giám sát và ghi nhận crash bug
```

### 3.1. Quy tắc Code Frontend
1. **Ranh giới Module (Module Boundaries)**: `schemas/`, `utils/`, `constants/` tuyệt đối không import ngược từ `components/`, `pages/`, `services/`.
2. **Form Validation**: 100% form và API payload phải được kiểm tra qua **Zod** schema tại `src/schemas/`.
3. **Cấm Magic Numbers & Hard-coded Colors**: Mọi mã màu phải lấy từ semantic color palette của `tailwind.config.js` (`brand-primary`, `brand-rose`, `brand-dark`, `surface-card`), mọi con số (timeout, countdown 30s) phải đưa vào `src/constants/`.
4. **Quy ước đặt tên**:
   - React Components: `PascalCase.jsx` (`BookingCard.jsx`, `InstantCountdownModal.jsx`).
   - Helpers, Schemas, Services: `kebab-case.js` (`booking-service.js`, `agency.schema.js`).
   - Custom Hooks: `use<Name>.js` (`useWebSocket.js`, `useGpsTracker.js`).

---

## 4. Quy chuẩn Realtime & Concurrency Control
1. **GPS Telemetry**: Stream tọa độ thợ gửi qua WebSocket `websocket-service` theo chu kỳ 5–10s, đẩy qua Kafka topic `driver-location-stream` vào `location-service` (Redis GEO & PostGIS).
2. **Instant Booking Broadcast**: Khi khách đặt ca gấp 30-60 phút, hệ thống quét thợ rảnh qua Redis GEO $\rightarrow$ Broadcast qua WebSocket kèm đồng hồ đếm ngược 30-45s $\rightarrow$ Thợ nhận ca đầu tiên được bảo vệ chống race condition bằng **Redlock (Redisson)**.
3. **Ví & Escrow**: Khi đơn hoàn thành (`BOOKING_COMPLETED`), `booking-service` phát Kafka Event $\rightarrow$ `payment-service` tự động giải ngân từ quỹ cọc Escrow vào Ví Đại lý và Ví Thợ.
