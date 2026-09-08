---
name: flyway-migration
description: Universal database schema design, Flyway SQL versioning, and JPA synchronization standard for all 8 microservices in the Makeup Booking Platform.
version: 2.1.0
tags: [database, flyway, sql, postgresql, postgis, migration, system-wide]
---

# Universal Flyway Database Migration Skill

## 1. Phạm vi & Vai trò
Skill này áp dụng cho việc quản lý cơ sở dữ liệu trên **tất cả 8 Microservices** trong hệ sinh thái backend (`code/backend/<service-name>/src/main/resources/db/migration/`). Mỗi microservice sở hữu CSDL PostgreSQL riêng biệt (*Database per Service Pattern*).

---

## 2. Quy chuẩn Đặt tên File & Phiên bản
Định dạng file bắt buộc: `V<Version>__<Description_Snake_Case>.sql` (chính xác 2 dấu gạch dưới `__` sau số version).
Ví dụ:
- `V1__Init_Tables.sql`
- `V2__Create_Agency_Members_And_Roles.sql`
- `V3__Add_Commission_Configs_Table.sql`
- `V4__Create_Postgis_Spatial_Index.sql`

---

## 3. Nguyên tắc Bất biến & An toàn DDL
1. **Tính bất biến (Immutability)**:
   - File migration một khi đã commit và chạy trên database thì **tuyệt đối không được chỉnh sửa**.
   - Muốn sửa cột, đổi kiểu dữ liệu, thêm chỉ mục $\rightarrow$ Phải tạo file `V<N+1>__...sql` mới.
2. **Cấu trúc Bảng Chuẩn (Khớp với `BaseEntity`)**:
   Mọi bảng dữ liệu chính trong bất kỳ service nào đều phải bao gồm các trường chuẩn PostgreSQL:
   ```sql
   id BIGSERIAL PRIMARY KEY,
   created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
   updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
   ```
3. **Idempotency & Naming Convention**:
   - Khóa ngoại: `fk_<bang_nguon>_<bang_dich>` (ví dụ: `fk_agency_members_agencies`).
   - Chỉ mục tìm kiếm: `idx_<ten_bang>_<ten_cot>` (ví dụ: `idx_users_email`).
   - Chỉ mục không gian (Spatial Index cho `location-service`):
     ```sql
     CREATE EXTENSION IF NOT EXISTS postgis;
     CREATE INDEX idx_telemetry_location_geom ON telemetry_locations USING GIST(geom_point);
     ```

---

## 4. Đồng bộ hóa với JPA Entity
- Kiểu dữ liệu trong SQL phải khớp chặt chẽ với Java JPA Mapping:
  - `VARCHAR(255)` $\leftrightarrow$ `@Column(length = 255)`
  - `TEXT` $\leftrightarrow$ `@Lob` hoặc `@Column(columnDefinition = "TEXT")`
  - `DECIMAL(12, 2)` $\leftrightarrow$ `BigDecimal`
  - `BOOLEAN` $\leftrightarrow$ `Boolean`
  - `TIMESTAMP WITH TIME ZONE` $\leftrightarrow$ `LocalDateTime` hoặc `Instant`
  - `geometry(Point, 4326)` $\leftrightarrow$ `org.locationtech.jts.geom.Point` (Hibernate Spatial)
- Luôn kiểm tra đối chiếu giữa `entity/` và script SQL trước khi commit.
