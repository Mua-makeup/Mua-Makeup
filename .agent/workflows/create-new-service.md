---
name: create-new-service
description: Universal step-by-step workflow for implementing a new Business Feature Domain in the Layered Architecture Monolith (core-api).
version: 3.0.0
---

# Universal Workflow: Add New Business Domain to Layered Monolith

## Phase 1: Database Migration & Schema Allocation
1. Xác định PostgreSQL Schema cho nghiệp vụ (`auth_schema`, `agency_schema`, `mua_schema`, `catalog_schema`, `booking_schema`, `wallet_schema`...).
2. Viết file Flyway migration mới tại `src/main/resources/db/migration/V<N>__<Ten_Migration>.sql`.

## Phase 2: Entity & Repository Layer
1. Tạo Entity kế thừa `BaseEntity`:
   - Đặt tại `src/main/java/com/makeup/platform/entity/<domain>/<Domain>Entity.java`.
   - Khai báo rõ `@Table(name = "...", schema = "<domain>_schema")`.
2. Tạo Repository:
   - Đặt tại `src/main/java/com/makeup/platform/repository/<Domain>Repository.java` (kế thừa `JpaRepository`).
   - Nếu có query Native/PostGIS phức tạp, tạo thêm `repository/custom/<Domain>CustomRepository.java`.

## Phase 3: DTOs & Bean Validation
1. Tạo Request DTO tại `dto/request/<domain>/`:
   - Bắt buộc Bean Validation: `@NotBlank`, `@NotNull`, `@Min`, `@Max`, `@Size`...
2. Tạo Response DTO tại `dto/response/<domain>/`.

## Phase 4: Service Layer (Interface & Implementation)
1. Tạo Interface tại `service/<Domain>Service.java`.
2. Tạo Implementation tại `service/impl/<Domain>ServiceImpl.java`:
   - Ném ngoại lệ nghiệp vụ qua `CustomBusinessException`.
   - Thêm chuỗi thông báo i18n vào `src/main/resources/text/messages.properties`.

## Phase 5: Controller Layer (Theo Actor/Role)
1. Tạo Controller kế thừa `BaseController`:
   - Đặt tại `controller/<actor>/` (`customer/`, `freelancer/`, `agency/`, `admin/`, `auth/`).
   - Trả về `ResponseEntity<ApiResponse<ResponseDTO>>`.

## Phase 6: Verification
1. Viết Unit Test với Mockito tại `src/test/java/com/makeup/platform/service/<Domain>ServiceTest.java`.
2. Chạy `./gradlew compileJava` và `./gradlew test` kiểm tra 100% pass.
