---
name: spring-microservice
description: Universal engineering standards and patterns for developing the Spring Boot Layered Architecture Monolith in the Makeup Booking Platform ecosystem (Auth, Agency, Catalog, Location, Booking, Pricing, Payment, WebSocket).
version: 3.0.0
tags: [backend, java, spring-boot, layered-architecture, monolith, redis, redisson, websocket, postgis, system-wide]
---

# Universal Spring Boot Layered Architecture Monolith Engineering Skill

## 1. Phạm vi Kiến trúc (Monolith Core)
- **Mô hình Kiến trúc**: **Layered Architecture Monolith** (Toàn bộ các phân hệ Auth, Agency, Catalog, Location, Booking, Pricing, Wallet, WebSocket chạy trong tiến trình ứng dụng đơn lẻ **`core-api`**, Port: `8080`).
- **Không sử dụng Microservices phân mảnh**: Không triển khai microservices phân mảnh hay Spring Cloud API Gateway riêng biệt; không dùng Apache Kafka mà sử dụng Spring In-Memory EventBus (`ApplicationEventPublisher` & `@EventListener`).
- **Cơ sở dữ liệu**: Kết nối 1 CSDL duy nhất **`makeup_platform_db`** (PostgreSQL 16 + PostGIS) phân tách thành 8 Schemas độc lập (`auth_schema`, `agency_schema`, `mua_schema`, `catalog_schema`, `booking_schema`, `pricing_schema`, `wallet_schema`, `interaction_schema`).
- **Realtime Gateway**: Embedded STOMP WebSocket Gateway tích hợp trực tiếp bên trong `core-api`.

---

## 2. Cấu trúc Thư mục Phân tầng Bắt buộc (Layered Architecture)

Mọi thành phần code phải tuân thủ nghiêm ngặt cấu trúc package:
```text
code/backend/core-api/
├── src/main/java/com/makeup/platform/
│   ├── Application.java                   # Class bootstrap Spring Boot
│   │
│   ├── common/                            # Tiện ích và core classes dùng chung
│   │   ├── base/
│   │   │   ├── BaseEntity.java            # @MappedSuperclass chứa id, created_at, updated_at
│   │   │   ├── BaseController.java        # Định nghĩa hàm phản hồi HTTP chuẩn (ok, created, error)
│   │   │   ├── ApiResponse.java           # Standard JSON response envelope <T>
│   │   │   ├── BaseService.java           # Interface CRUD dùng Generics <T, ID>
│   │   │   └── BaseServiceImpl.java       # Code thực thi CRUD dùng chung
│   │   ├── constants/                     # ErrorCodes, SecurityConstants, RegexConstants
│   │   ├── exception/
│   │   │   ├── GlobalExceptionHandler.java # @RestControllerAdvice bắt lỗi tập trung
│   │   │   └── CustomBusinessException.java# Định nghĩa lỗi nghiệp vụ riêng
│   │   └── utils/                         # JwtUtils, DateUtils, GeoSpatialUtils
│   │
│   ├── config/                            # Cấu hình Framework (Security, OpenAPI, Database, Redis, Redisson, WebSocket)
│   ├── controller/                        # TẦNG GIAO TIẾP HTTP (Thin Controller - auth/, customer/, agency/, freelancer/, admin/)
│   ├── dto/                               # DATA TRANSFER OBJECT (request/ với @Valid, response/)
│   ├── entity/                            # TẦNG MAP DATABASE (JPA Entity kế thừa BaseEntity, chỉ định schema)
│   ├── mapper/                            # TẦNG CHUYỂN ĐỔI DỮ LIỆU (MANUAL MAPPER @Component phân theo domain)
│   │   ├── auth/                          # AuthMapper
│   │   ├── catalog/                       # ServicePackageMapper, SurchargeMapper, PortfolioMapper...
│   │   └── mua/                           # MuaProfileMapper, MuaStyleMapper...
│   ├── repository/                        # TẦNG TRUY VẤN DỮ LIỆU
│   │   ├── custom/                        # Interface gọi Native SQL / PostGIS Spatial queries
│   │   └── <Domain>Repository.java        # Kế thừa JpaRepository cho truy vấn cơ bản
│   └── service/                           # TẦNG NGHIỆP VỤ LÕI (100% Business Logic)
│       ├── impl/                          # BẮT BUỘC CHỨA CODE THỰC THI THẬT
│       └── <Domain>Service.java           # Interface định nghĩa hợp đồng hành động
│
├── src/main/resources/
│   ├── application.yaml                   # Cấu hình port 8080, datasource (8 schemas), redis
│   ├── text/
│   │   └── messages.properties            # ResourceBundle lưu trữ text tiếng Việt i18n
│   └── db/migration/                      # Scripts Flyway cho 1 database duy nhất
│       ├── V1__Create_Schemas_And_Extensions.sql
│       ├── V2__Init_Auth_And_Profiles.sql
│       ├── V3__Init_Catalog_And_Telemetry.sql
│       ├── V4__Init_Booking_And_Interaction.sql
│       └── V5__Init_Wallet_Double_Entry.sql
├── unitest/ & sonarLint/                  # Quản lý test case kiểm thử và chất lượng code
├── Dockerfile, .dockerignore
└── build.gradle                           # Cấu hình dependencies
```

---

## 3. Quy chuẩn Kỹ thuật Bắt buộc

### 3.1. Phân định Trách nhiệm Phân tầng (Controller vs Service vs Mapper)
- **Tầng Service (Pure Business Logic Layer)**:
  - 100% logic nghiệp vụ nằm tại Service (`service/impl/<Domain>ServiceImpl.java`).
  - Bao gồm: kiểm tra điều kiện nghiệp vụ, kiểm tra trạng thái thực thi, tính toán số tiền/phí, điều phối transaction (`@Transactional`), kích hoạt sự kiện (`ApplicationEventPublisher`), xử lý bộ đệm (`@Cacheable`/`@CacheEvict`) và điều phối gọi `Mapper`.
- **Tầng Controller (Thin Controller Layer)**:
  - Controller CHỈ đóng vai trò tiếp nhận HTTP Request, giải mã `@Valid`, lấy principal từ security context (`@AuthenticationPrincipal`), ủy quyền toàn bộ cho Service và bọc kết quả trả về `ResponseEntity<ApiResponse<T>>`.
  - TUYỆT ĐỐI KHÔNG viết logic nghiệp vụ (if/else rẽ nhánh, tính toán giá, gọi database repository) trong Controller.
- **Tầng Mapper (Manual Mapper @Component)**:
  - Toàn bộ chuyển đổi qua lại giữa Entity $\leftrightarrow$ DTO BẮT BUỘC thực hiện qua package `com.makeup.platform.mapper.<domain>.*Mapper`.
  - BẮT BUỘC dùng **Manual Mapper**: Đánh dấu `@Component`, viết mã Java tường minh với Builder / Getter / Setter.
  - CẤM sử dụng MapStruct hay ModelMapper (để đảm bảo null-safety tuyệt đối, không có reflection/annotation-processor magic, dễ debug và test).
  - Tầng Service inject Mapper bean qua constructor injection (`@RequiredArgsConstructor`).

### 3.2. Kế thừa Base Components
- **`BaseEntity`**: Mọi Entity phải kế thừa `BaseEntity` (id, createdAt, updatedAt).
- **`BaseController`**: Mọi Controller phải kế thừa `BaseController` và trả về `ResponseEntity<ApiResponse<T>>`.
- **`BaseService<T, ID>` & `BaseServiceImpl<T, ID, R>`**: Đảm bảo tái sử dụng logic CRUD cơ bản.

### 3.3. Data Transfer Objects (DTO) & Bean Validation
- **Cấm expose JPA Entity ra Controller**. Mọi payload gửi lên / trả về phải dùng DTO.
- Mọi Request DTO bắt buộc có Bean Validation (`@NotNull`, `@NotBlank`, `@Future`, `@Size`...).
- Controller phải đặt `@Valid @RequestBody <DTO> request`.

### 3.4. Đa Ngôn Ngữ Chuẩn Hóa Toàn Hệ Thống (i18n qua JSON & Header & Database)
- **Tuyệt đối KHÔNG hard-code chuỗi text**: Không hardcode tiếng Việt hay tiếng Anh trong Controller, Service, DTO hay Validator.
- **Khai báo thông điệp JSON**: Mọi message trả về và mã lỗi phải được định nghĩa đồng thời tại cả 2 file:
  - `src/main/resources/i18n/messages_en.json` (Tiếng Anh - Mặc định)
  - `src/main/resources/i18n/messages_vi.json` (Tiếng Việt)
- **Cơ chế xác định ngôn ngữ**: Tự động nhận diện theo thứ tự ưu tiên:
  1. Header `Accept-Language` (`vi`, `vi-VN`, `en`, `en-US`).
  2. Thuộc tính `language` của User đăng nhập (`auth_schema.users`, claim JWT).
  3. Mặc định fallback: `en` (Tiếng Anh).
- **Ném lỗi & Trả về**:
  - Ném ngoại lệ nghiệp vụ: `throw new CustomBusinessException(ErrorCodes.XXX, "module.error_key", args...)`.
  - Trả về Controller: `return ok(res, "module.success_key")` hoặc `created(res, "module.created_key")`. `BaseController` và `GlobalExceptionHandler` sẽ tự động tra cứu `JsonMessageSource` theo Locale của request.

### 3.5. Quản lý 1 Database + 8 Schemas
- Khai báo rõ schema trong `@Table`: `@Table(name = "users", schema = "auth_schema")`.
- Khóa ngoại xuyên schema được hỗ trợ hoàn toàn tự nhiên trong PostgreSQL.

### 3.6. Distributed Locking (Redlock)
- Khi xử lý tranh chấp đơn hàng đếm ngược 30s giữa nhiều thợ, dùng **Redlock** (thông qua Redisson trên Redis).
