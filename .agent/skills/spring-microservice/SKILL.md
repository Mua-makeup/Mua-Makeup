---
name: spring-microservice
description: Universal engineering standards and patterns for developing any Spring Boot 3 Microservice in the Makeup Booking Platform ecosystem (Gateway, Profile, Agency, Catalog, Location, Booking, Pricing, Payment).
version: 2.1.0
tags: [backend, java, spring-boot, microservices, layered-architecture, event-driven, kafka, redis, system-wide]
---

# Universal Spring Boot 3 Microservice Engineering Skill

## 1. Phạm vi & Mục đích
Skill này áp dụng cho toàn bộ **8 Backend Microservices** trong nền tảng Đặt lịch Make-up (`code/backend/<service-name>/`):
1. `api-gateway`: Spring Cloud Gateway + Netty WebSocket, JWT Verification, Rate Limiting.
2. `user-agency-mua-profile-service`: Profile, bằng cấp, chứng chỉ, xác thực.
3. `agency-operations-service`: Nghiệp vụ Đại lý/Studio, mời thợ, chia sẻ hoa hồng.
4. `catalog-media-service`: Bảng giá, Album Before-After, tích hợp S3/Cloudinary.
5. `location-service`: GPS Telemetry, Redis GEO, PostGIS.
6. `booking-service`: State Machine đơn hàng, Realtime vs Scheduled, Redlock.
7. `pricing-service`: Dynamic pricing, tính khoảng cách Maps API, phụ phí đêm/sớm.
8. `payment-service`: Ví 3 tầng, ký quỹ Escrow, VNPay/MoMo/Stripe.

---

## 2. Cấu trúc Thư mục Phân tầng Bắt buộc (Layered Architecture)

Mọi service phải tuân thủ nghiêm ngặt cấu trúc package:
```text
code/backend/<service-name>/
├── src/main/java/com/trung/<service_name>/
│   ├── Application.java                   # Class bootstrap Spring Boot
│   │
│   ├── common/                            # Tiện ích và core classes dùng chung
│   │   ├── base/
│   │   │   ├── BaseEntity.java            # @MappedSuperclass chứa id, created_at, updated_at
│   │   │   ├── BaseController.java        # Định nghĩa hàm phản hồi HTTP chuẩn (ok, created, badRequest)
│   │   │   ├── BaseService.java           # Interface CRUD dùng Generics <T, ID>
│   │   │   └── BaseServiceImpl.java       # Code thực thi CRUD dùng chung
│   │   ├── constants/                     # ErrorCodes, SystemConstants, RegexConstants
│   │   ├── exception/
│   │   │   ├── GlobalExceptionHandler.java # @RestControllerAdvice bắt lỗi tập trung
│   │   │   └── CustomBusinessException.java# Định nghĩa lỗi nghiệp vụ riêng
│   │   └── utils/                         # JwtUtils, DateUtils, PasswordEncoder, SecurityUtils
│   │
│   ├── config/                            # Cấu hình Framework (Security, OpenAPI, Database, Kafka, Redis)
│   ├── controller/                        # TẦNG GIAO TIẾP HTTP (admin/, customer/, agency/, freelancer/)
│   ├── dto/                               # DATA TRANSFER OBJECT (request/ với @Valid, response/)
│   ├── entity/                            # TẦNG MAP DATABASE (JPA Entity kế thừa BaseEntity)
│   ├── repository/                        # TẦNG TRUY VẤN DỮ LIỆU
│   │   ├── custom/                        # Interface gọi Native SQL / Stored Procedure phức tạp
│   │   └── <Domain>Repository.java        # Kế thừa JpaRepository cho truy vấn cơ bản
│   └── service/                           # TẦNG NGHIỆP VỤ LÕI
│       ├── impl/                          # Code thực thi logic nghiệp vụ thực tế
│       └── <Domain>Service.java           # Interface định nghĩa hợp đồng hành động
│
├── src/main/resources/
│   ├── application.yaml                   # Cấu hình port, database credentials, Eureka, Kafka
│   ├── text/
│   │   └── messages.properties            # ResourceBundle lưu trữ text, không hardcode text vào code
│   └── db/migration/
│       └── V1__Init_Tables.sql            # Script Flyway tạo bảng CSDL
├── unitest/                               # Thư mục quản lý test case kiểm thử
├── sonarLint/                             # Cấu hình sonarlint quản lý chất lượng mã nguồn
├── Dockerfile                             # Dockerfile build backend
├── .dockerignore
└── build.gradle                           # Cấu hình dependencies (Spring Boot, Postgres, Flyway, Validation)
```

---

## 3. Quy chuẩn Kỹ thuật Bắt buộc

### 3.1. Kế thừa Base Components
- **`BaseEntity`**:
  ```java
  @MappedSuperclass
  @Getter
  @Setter
  public abstract class BaseEntity {
      @Id
      @GeneratedValue(strategy = GenerationType.IDENTITY)
      private Long id;

      @CreationTimestamp
      @Column(name = "created_at", updatable = false)
      private LocalDateTime createdAt;

      @UpdateTimestamp
      @Column(name = "updated_at")
      private LocalDateTime updatedAt;
  }
  ```
- **`BaseController`**: Chuẩn hóa cấu trúc ApiResponse `<T>` đồng nhất cho toàn hệ thống.
- **`BaseService<T, ID>` & `BaseServiceImpl<T, ID, R>`**: Đảm bảo tái sử dụng logic CRUD cơ bản.

### 3.2. Data Transfer Objects (DTO) & Bean Validation
- **Cấm expose JPA Entity ra Controller**. Mọi payload gửi lên / trả về phải dùng DTO.
- Mọi Request DTO bắt buộc có Bean Validation:
  ```java
  public class CreateBookingReq {
      @NotNull(message = "{booking.service_id.not_null}")
      private Long serviceId;

      @NotNull(message = "{booking.start_time.not_null}")
      @Future(message = "{booking.start_time.must_be_future}")
      private LocalDateTime startTime;
  }
  ```
- Controller phải đặt `@Valid @RequestBody <DTO> request`.

### 3.3. Xử lý Lỗi & Không Hard-code Text (ResourceBundle)
- Ném lỗi nghiệp vụ qua `CustomBusinessException(ErrorCode, args)`.
- Mọi chuỗi thông báo lỗi được định nghĩa trong `src/main/resources/text/messages.properties`.
- `GlobalExceptionHandler` `@RestControllerAdvice` bắt và map HTTP status code chính xác (400, 401, 403, 404, 409, 500).

### 3.4. Event-Driven Messaging (Kafka) & Distributed Locking (Redlock)
- Khi xử lý giao dịch phân tán (đổi trạng thái đơn hàng, giải ngân tiền vào ví), publish event qua Kafka Producer.
- Tại `booking-service`, khi điều phối đơn realtime đếm ngược 30s, bắt buộc dùng **Redlock** (thông qua Redisson) để khóa phân tán theo `bookingId`, loại bỏ triệt để xung đột race condition giữa nhiều thợ cùng nhận đơn.

---

## 4. Checklist triển khai Microservice
- [ ] 1. Kiểm tra `build.gradle` có đầy đủ: `spring-boot-starter-web` (hoặc `webflux` cho Gateway), `spring-boot-starter-validation`, `data-jpa`, `postgresql`, `flyway-core`, `spring-kafka`, `lombok`.
- [ ] 2. Kiểm tra `application.yaml` có cổng riêng và kết nối database riêng (Database-per-service pattern).
- [ ] 3. Viết migration script tại `resources/db/migration/V1__Init_Tables.sql`.
- [ ] 4. Mọi JPA Entity kế thừa `BaseEntity`.
- [ ] 5. Mọi Controller có phân chia package theo role (`admin/`, `customer/`, `agency/`, `freelancer/`).
- [ ] 6. Không hardcode text, sử dụng ResourceBundle `resources/text/messages.properties`.
- [ ] 7. Kiểm tra compile `./gradlew compileJava` thành công 100%.
