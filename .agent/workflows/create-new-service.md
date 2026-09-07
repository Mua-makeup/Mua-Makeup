---
name: create-new-service
description: Universal step-by-step workflow for bootstrapping ANY new Spring Boot Microservice in the backend workspace.
version: 2.0.0
---

# Universal Workflow: Create New Backend Microservice

## Phase 1: Planning & Service Domain Definition
1. Xác định tên service theo danh từ / Bounded Context (ví dụ: `auth-service`, `makeup-service`, `product-service`, `order-service`, `booking-service`, `notification-service`).
2. Xác định cổng chạy `server.port` (đảm bảo không xung đột với các service hiện có).
3. Tạo thư mục tại `code/backend/<service-name>/`.

## Phase 2: Build & Dependency Configuration
1. Thiết lập `code/backend/<service-name>/build.gradle`:
   - Plugin: Java, Spring Boot `3.3.3`, Spring Dependency Management `1.1.6`.
   - BOM: `spring-cloud-dependencies:2023.0.3`.
   - Dependencies: `spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `spring-boot-starter-validation`, `flyway-core`, `flyway-database-postgresql`, `postgresql`, `lombok`, `spring-boot-starter-test`.
2. Tạo `settings.gradle` và wrapper nếu cần.

## Phase 3: Layered Architecture Scaffolding
Tạo toàn bộ cây thư mục theo chuẩn:
- `src/main/java/com/ioc/<service_domain>/`:
  - `Application.java`
  - `common/base/` (`BaseEntity.java`, `BaseController.java`, `BaseService.java`, `BaseServiceImpl.java`)
  - `common/constants/` (`ErrorCodes.java`, `SystemConstants.java`, `RegexConstants.java`)
  - `common/exception/` (`GlobalExceptionHandler.java`, `CustomBusinessException.java`)
  - `common/utils/`
  - `config/` (`SecurityConfig.java`, `OpenApiConfig.java`, `DatabaseConfig.java`)
  - `controller/` (Phân chia theo role: `admin/`, `public/`, `customer/`...)
  - `dto/request/` và `dto/response/`
  - `entity/`
  - `repository/` và `repository/custom/`
  - `service/` (Interface) và `service/impl/` (Implementation)

## Phase 4: Resources & Database Migration
1. Tạo `src/main/resources/application.yml`:
   - Config database URL riêng (`jdbc:postgresql://localhost:5432/<service_db_name>`).
   - Bật Flyway `enabled: true`, tắt Hibernate DDL auto `validate`.
2. Tạo `src/main/resources/text/messages.properties` cho chuỗi thông báo i18n.
3. Tạo `src/main/resources/db/migration/V1__Init_Tables.sql`.
4. Tạo `unitest/`, `sonarLint/`, `Dockerfile`, `.dockerignore`, `docker-compose.yml`.

## Phase 5: Verification & Verification Gate
1. Chạy `./gradlew compileJava` kiểm tra biên dịch thành công 100%.
2. Cập nhật tài liệu `docs/srs.md` với thông tin về microservice mới.
