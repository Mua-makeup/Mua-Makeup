---
name: spring-microservice
description: Universal engineering standards and patterns for developing any Spring Boot 3 Microservice in the ecosystem (Gateway, Auth, Core Domains, E-commerce, Makeup, etc.).
version: 2.0.0
tags: [backend, java, spring-boot, microservices, layered-architecture, system-wide]
---

# Universal Spring Boot Microservice Engineering Skill

## 1. Phạm vi & Mục đích
Skill này cung cấp bộ khung chuẩn (Scaffold & Architectural Blueprint) áp dụng cho **tất cả các Microservices hiện tại và tương lai** trong toàn hệ thống backend (`code/backend/<service-name>/`). Bất kể nghiệp vụ nào (Core Gateway, Xác thực Auth, Quản lý Dịch vụ Makeup, Sản phẩm Product, Đơn hàng Order, Đặt lịch Booking, v.v.), tất cả đều phải tuân thủ chuẩn này.

---

## 2. Kiến trúc Phân tầng Chuẩn (Standard Layered Architecture)
Mỗi service được tổ chức độc lập với cấu trúc package tiêu chuẩn:
```
code/backend/<service-name>/
├── src/main/java/com/ioc/<service_domain>/
│   ├── Application.java               # Class bootstrap Spring Boot
│   ├── common/
│   │   ├── base/                      # BaseEntity, BaseController, BaseService, BaseServiceImpl
│   │   ├── constants/                 # ErrorCodes, SystemConstants, RegexConstants
│   │   ├── exception/                 # GlobalExceptionHandler, CustomBusinessException
│   │   └── utils/                     # Helpers (DateUtils, JsonUtils, SecurityUtils)
│   ├── config/                        # SecurityConfig, OpenApiConfig, DatabaseConfig, WebMvcConfig
│   ├── controller/                    # Nhóm Controller theo vai trò (admin/, public/, user/...)
│   ├── dto/
│   │   ├── request/                   # Request Payload DTOs (@Valid, @NotBlank...)
│   │   └── response/                  # Response DTOs (Data Model, PaginatedRes<T>)
│   ├── entity/                        # JPA Entities (Mapped to Database tables)
│   ├── repository/                    # Spring Data JPA Interfaces
│   │   └── custom/                    # Custom Repository Interfaces & Implementations (Native SQL, Stored Proc)
│   └── service/                       # Service Interfaces (Chỉ khai báo method hợp đồng)
│       └── impl/                      # Service Implementations (Chứa toàn bộ logic nghiệp vụ)
├── src/main/resources/
│   ├── application.yml                # Cấu hình Port, Datasource, Flyway, Logging, Discovery/Cloud
│   ├── text/
│   │   └── messages.properties        # ResourceBundle quản lý toàn bộ chuỗi thông báo, tránh hard-text
│   └── db/migration/
│       └── V1__Init_Tables.sql        # Script Flyway khởi tạo & nâng cấp database
├── unitest/ & sonarLint/              # Thư mục quản lý test case, rules chất lượng mã nguồn
├── Dockerfile                         # Multi-stage build container
├── .dockerignore
└── docker-compose.yml                 # Khởi chạy service kèm dependencies (DB, Redis, etc.)
```

---

## 3. Quy chuẩn Kỹ thuật Bắt buộc (Mandatory Technical Patterns)

### 3.1. Kế thừa Base Classes
- **BaseEntity**:
  Mọi Entity đại diện cho bảng phải kế thừa `BaseEntity` (có sẵn `id`, `createdAt`, `updatedAt` tự động sinh timestamp).
- **BaseService & BaseServiceImpl**:
  Các nghiệp vụ CRUD cơ bản kế thừa `BaseService<T, ID>` và `BaseServiceImpl<T, ID, R>` để tái sử dụng `findAll()`, `findById()`, `save()`, `deleteById()`.
- **BaseController**:
  Mọi Controller kế thừa `BaseController` để chuẩn hóa wrapper trả về HTTP (`ok()`, `created()`, `badRequest()`).

### 3.2. Data Transfer Objects (DTO) & Bean Validation
- **Quy tắc vàng**: Không bao giờ expose Entity ra Controller hoặc nhận Entity từ Request.
- Request DTO phải có validation annotations (`@NotBlank`, `@NotNull`, `@Size`, `@Email`, `@Pattern`, `@PositiveOrZero`).
- Controller method phải có annotation `@Valid @RequestBody <RequestDTO> request`.

### 3.3. Xử lý Exception & Thông điệp Tập trung
- Khi xảy ra lỗi nghiệp vụ, ném `CustomBusinessException(ErrorCodes.<MA_LOI>, message)`.
- Mọi exception được `GlobalExceptionHandler` `@RestControllerAdvice` bắt và chuẩn hóa định dạng JSON trả về:
  ```json
  {
    "code": "ERR_NOT_FOUND",
    "message": "Nội dung thông báo chi tiết",
    "timestamp": "2026-09-07T16:30:00"
  }
  ```
- Chuỗi thông báo không viết cứng trong code Java mà đọc từ `messages.properties`.

### 3.4. Database Migration & Custom Query
- Mọi service dùng CSDL bắt buộc sử dụng **Flyway** (`resources/db/migration/V<Timestamp_hoac_So>__<Ten_Mo_Ta>.sql`).
- Cấm dùng `spring.jpa.hibernate.ddl-auto: update` trên production.
- Các truy vấn phức tạp (Native SQL, Dynamic Query, Stored Procedure) phải được trừu tượng hóa qua interface trong `repository/custom/`.

---

## 4. Checklist khi khởi tạo hoặc sửa đổi một Microservice
- [ ] 1. Khai báo dependency và BOM trong `build.gradle` (Spring Boot 3.3.x, Java 17).
- [ ] 2. Kiểm tra file `application.yml` (Port không bị trùng lặp với các service khác trong hệ thống).
- [ ] 3. Viết script Flyway `V1__...sql` tạo bảng cơ sở.
- [ ] 4. Định nghĩa JPA Entity kế thừa `BaseEntity`.
- [ ] 5. Tạo Repository & Custom Repository (nếu có).
- [ ] 6. Tạo DTO Request/Response kèm `@Valid`.
- [ ] 7. Khai báo Service Interface và viết code xử lý thực thi trong `service/impl/`.
- [ ] 8. Viết Controller với route prefix rõ ràng (`/api/v1/<service-domain>/...`).
- [ ] 9. Kiểm tra biên dịch: `./gradlew compileJava` thành công 100%.
