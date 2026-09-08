---
name: create-new-service
description: Universal step-by-step workflow for bootstrapping ANY new Spring Boot Microservice in the Makeup Booking Platform ecosystem.
version: 2.1.0
---

# Universal Workflow: Create New Backend Microservice

## Phase 1: Planning & Service Domain Definition
1. Xác định tên service theo danh từ / Bounded Context (ví dụ: `review-service`, `notification-service`).
2. Xác định cổng chạy `server.port` trong `application.yaml` (tránh xung đột với 8 service cốt lõi: 8080 Gateway, 8081 User, 8082 Agency, 8083 Catalog, 8084 Location, 8085 Booking, 8086 Pricing, 8087 Payment).
3. Tạo thư mục tại `code/backend/<service-name>/`.

## Phase 2: Build & Dependency Configuration
1. Thiết lập file `code/backend/<service-name>/build.gradle`:
   - Plugins: `java`, `org.springframework.boot`, `io.spring.dependency-management`.
   - Toolchain: Java 17.
   - Core Dependencies:
     - `org.springframework.boot:spring-boot-starter-web` (hoặc `webflux`)
     - `org.springframework.boot:spring-boot-starter-data-jpa`
     - `org.springframework.boot:spring-boot-starter-validation`
     - `org.springframework.boot:spring-boot-starter-actuator`
     - `org.postgresql:postgresql`
     - `org.flywaydb:flyway-core`, `org.flywaydb:flyway-database-postgresql`
     - `org.springframework.kafka:spring-kafka`
     - `org.projectlombok:lombok`
     - `org.springframework.cloud:spring-cloud-starter-openfeign`
     - Test dependencies (`starter-test`, `validation-test`, `data-jpa-test`).

## Phase 3: Layered Architecture Scaffolding
Tạo toàn bộ cây thư mục mã nguồn theo chuẩn Layered Pattern:
- `src/main/java/com/trung/<service_domain>/`:
  - `Application.java`
  - `common/base/`: `BaseEntity.java`, `BaseController.java`, `BaseService.java`, `BaseServiceImpl.java`
  - `common/constants/`: `ErrorCodes.java`, `SystemConstants.java`, `RegexConstants.java`
  - `common/exception/`: `GlobalExceptionHandler.java`, `CustomBusinessException.java`
  - `common/utils/`: Helpers
  - `config/`: `SecurityConfig.java`, `OpenApiConfig.java`, `DatabaseConfig.java`, `KafkaConfig.java`
  - `controller/`: Phân chia theo role (`admin/`, `customer/`, `agency/`, `freelancer/`)
  - `dto/request/` (với `@Valid`, `@NotNull`...) và `dto/response/`
  - `entity/` (Kế thừa `BaseEntity`)
  - `repository/` và `repository/custom/`
  - `service/` (Interface) và `service/impl/` (Implementation)

## Phase 4: Resources & Database Migration
1. Tạo `src/main/resources/application.yaml`:
   - Cấu hình tên service: `spring.application.name: <service-name>`.
   - Kết nối database riêng: `jdbc:postgresql://localhost:5432/<service_db>`.
   - Kích hoạt Flyway: `spring.flyway.enabled: true`.
2. Tạo `src/main/resources/text/messages.properties` cho chuỗi thông báo i18n (tuyệt đối không hardcode text trong code).
3. Tạo `src/main/resources/db/migration/V1__Init_Tables.sql`.
4. Tạo thư mục `unitest/`, `sonarLint/`, `Dockerfile`, `.dockerignore`, `docker-compose.yml`.

## Phase 5: Verification & Quality Gate
1. Chạy `./gradlew compileJava` kiểm tra biên dịch thành công 100%.
2. Cập nhật tài liệu SRS `docs/makeup_platform_srs.md` và `docs/project-structure.md`.
