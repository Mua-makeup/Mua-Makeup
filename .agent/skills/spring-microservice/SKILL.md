---
name: spring-microservice
description: Universal engineering standards and patterns for developing any Spring Boot 3 Microservice in the Makeup Booking Platform ecosystem (Gateway, WebSocket, Profile, Agency, Catalog, Location, Booking, Pricing, Payment).
version: 2.2.0
tags: [backend, java, spring-boot, microservices, layered-architecture, event-driven, kafka, redis, system-wide]
---

# Universal Spring Boot 3 Microservice Engineering Skill

## 1. Phạm vi & Ma trận 9 Microservices Cốt lõi
Skill này áp dụng cho toàn bộ **9 Backend Microservices** trong nền tảng Đặt lịch Make-up (`code/backend/<service-name>/`):

| STT | Service | Port | Database PostgreSQL | Redis Index | Vai trò cốt lõi |
| :---: | :--- | :---: | :--- | :---: | :--- |
| 1 | **`api-gateway`** | `8080` | *(Không)* | `DB 0` | Stateless Reverse Proxy, JWT Filter, Rate Limiting |
| 2 | **`websocket-service`** | `8088` | *(Không)* | `DB 1` | Stateful Connection Hub, STOMP, Redis Pub/Sub, Kafka bridge |
| 3 | **`user-agency-mua-profile-service`** | `8081` | `user_profile_db` | *(Không)* | Quản lý Users, RBAC, Profile thợ, Chứng chỉ |
| 4 | **`agency-operations-service`** | `8082` | `agency_operations_db` | *(Không)* | Quản lý Studio, Lời mời thợ, Phân quyền, Hoa hồng |
| 5 | **`catalog-media-service`** | `8083` | `catalog_media_db` | *(Không)* | Bảng giá, Album ảnh Before/After, Cloudinary CDN |
| 6 | **`location-service`** | `8084` | `location_tracking_db` | `DB 2` | PostGIS Spatial, GPS Telemetry stream 5s, Redis GEO |
| 7 | **`booking-service`** | `8085` | `booking_dispatch_db` | `DB 3` | State Machine đơn hàng, Đặt ca 30s vs Hẹn trước, Redlock |
| 8 | **`pricing-service`** | `8086` | *(Không)* | `DB 4` | Dynamic Pricing, Maps Matrix API, Surge pricing cache |
| 9 | **`payment-service`** | `8087` | `payment_wallet_db` | *(Không)* | Ví 3 tầng, Ký quỹ Escrow, VNPay/MoMo SHA512 |

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
├── unitest/ & sonarLint/                  # Quản lý test case kiểm thử và chất lượng code
├── Dockerfile, .dockerignore
└── build.gradle                           # Cấu hình dependencies
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
- Mọi Request DTO bắt buộc có Bean Validation (`@NotNull`, `@NotBlank`, `@Future`, `@Size`...).
- Controller phải đặt `@Valid @RequestBody <DTO> request`.

### 3.3. Xử lý Lỗi & Không Hard-code Text (ResourceBundle)
- Ném lỗi nghiệp vụ qua `CustomBusinessException(ErrorCode, args)`.
- Mọi chuỗi thông báo lỗi được định nghĩa trong `src/main/resources/text/messages.properties`.
- `GlobalExceptionHandler` `@RestControllerAdvice` bắt và map HTTP status code chính xác (400, 401, 403, 404, 409, 500).

### 3.4. Distributed Locking (Redlock)
- Tại `booking-service`, khi xử lý tranh chấp đơn hàng đếm ngược 30s giữa nhiều thợ, bắt buộc dùng **Redlock** (thông qua Redisson trên Redis DB 3) để khóa phân tán theo `bookingId`.
