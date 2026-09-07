---
name: flyway-migration
description: Universal database schema design, Flyway SQL versioning, and JPA synchronization standard for all microservices.
version: 2.0.0
tags: [database, flyway, sql, postgresql, migration, system-wide]
---

# Universal Flyway Database Migration Skill

## 1. Phạm vi & Vai trò
Skill này áp dụng cho việc quản lý cơ sở dữ liệu trên **tất cả các microservices** trong hệ sinh thái backend (`code/backend/<service-name>/src/main/resources/db/migration/`).

---

## 2. Quy chuẩn Đặt tên File & Phiên bản
Định dạng file bắt buộc: `V<Version>__<Description_Snake_Case>.sql` (chính xác 2 dấu gạch dưới `__` sau số version).
Ví dụ:
- `V1__Init_Tables.sql`
- `V2__Create_Makeup_Services_Table.sql`
- `V3__Add_Booking_Status_And_Payment_Method.sql`
- `V4__Create_Customer_Reviews_Table.sql`

---

## 3. Nguyên tắc Bất biến & An toàn DDL
1. **Tính bất biến (Immutability)**:
   - File migration một khi đã commit và chạy trên database thì **tuyệt đối không được chỉnh sửa**.
   - Muốn sửa cột, đổi kiểu dữ liệu, thêm chỉ mục $\rightarrow$ Phải tạo file `V<N+1>__...sql` mới.
2. **Cấu trúc Bảng Chuẩn (Khớp với `BaseEntity`)**:
   Mọi bảng dữ liệu chính trong bất kỳ service nào đều phải bao gồm các trường:
   ```sql
   id BIGINT AUTO_INCREMENT PRIMARY KEY,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
   ```
3. **Idempotency & Indexing**:
   - Dùng `CREATE TABLE IF NOT EXISTS`.
   - Đặt tên chỉ mục và khóa ngoại theo convention:
     - Khóa ngoại: `fk_<bang_nguon>_<bang_dich>` (ví dụ: `fk_bookings_services`).
     - Chỉ mục tìm kiếm: `idx_<ten_bang>_<ten_cot>` (ví dụ: `idx_users_email`).

---

## 4. Đồng bộ hóa với JPA Entity
- Kiểu dữ liệu trong SQL phải khớp chặt chẽ với annotation Java:
  - `VARCHAR(255)` $\leftrightarrow$ `@Column(length = 255)`
  - `DECIMAL(12, 2)` $\leftrightarrow$ `BigDecimal`
  - `TEXT` $\leftrightarrow$ `@Lob` / `@Column(columnDefinition = "TEXT")`
  - `BOOLEAN` / `TINYINT(1)` $\leftrightarrow$ `Boolean`
- Khi tạo migration mới, kiểm tra lại toàn bộ entity mapping trong thư mục `entity/` của service tương ứng.
