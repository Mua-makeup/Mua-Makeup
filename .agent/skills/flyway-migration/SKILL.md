---
name: flyway-migration
description: Universal database schema design, Flyway SQL versioning, and JPA synchronization standard for the Single PostgreSQL Database (makeup_platform_db) managed by 8 Schemas with PostGIS.
version: 3.0.0
tags: [database, postgresql, postgis, flyway, migration, schema, jpa, system-wide]
---

# Flyway Database Migration Standard (1 Database + 8 Schemas)

## 1. Nguyên tắc Cốt lõi
Hệ thống sử dụng **1 CSDL duy nhất: `makeup_platform_db`** (PostgreSQL 16 + PostGIS) được phân tách thành **8 PostgreSQL Schemas**:
1. `auth_schema`: Users, Roles, User_Roles, Role_Permissions.
2. `agency_schema`: Agency_Profiles, Agency_Staff, Agency_Staff_Services, Agency_Staff_Styles.
3. `mua_schema`: Mua_Profiles, Mua_Styles, Mua_Calendars.
4. `catalog_schema`: Master_Service_Categories, Makeup_Styles, Service_Packages, Package_Items, Package_Styles, Portfolio_Showcases, Surcharges.
5. `booking_schema`: Bookings, Booking_Items, Booking_History.
6. `telemetry_schema`: Telemetry_Logs (Point PostGIS 4326).
7. `wallet_schema`: Wallets, User_Bank_Accounts, Withdrawal_Requests, Payment_Transactions, Transactions, Wallet_Transactions, Ledger_Entries.
8. `interaction_schema`: In_App_Notifications, Reviews, Disputes.

---

## 2. Quy chuẩn Tệp tin Flyway Migrations & Quy tắc Teamwork

Các file migration được đặt tại `code/backend/core-api/src/main/resources/db/migration/`:

### A. Các tệp Baseline khởi tạo nền tảng (Legacy Baseline):
- `V1__Create_Schemas_And_Extensions.sql`: Khởi tạo 8 Schemas và kích hoạt extensions `uuid-ossp`, `postgis`.
- `V2__Init_Auth_And_Profiles.sql`: DDL các bảng `auth_schema`, `agency_schema`, `mua_schema` kèm seed roles & permissions.
- `V3__Init_Catalog_And_Surcharges.sql`: DDL `catalog_schema` và các phụ phí.
- `V4__Init_Mua_Portfolio_Gallery.sql`: DDL thư viện ảnh và portfolio MUA.
- `V5__Add_Language_To_Users.sql`: Bổ sung đa ngôn ngữ cho tài khoản người dùng.
- `V6__Seed_Super_Admin_And_Permissions.sql`: Dữ liệu ban đầu Super Admin và ma trận phân quyền.

### B. Quy tắc BẮT BUỘC cho các Migration mới (Timestamp-Based Versioning):
Để chống xung đột khi làm việc nhóm song song (4+ thành viên rẽ nhiều nhánh Git độc lập):
1. **Quy tắc đặt tên file**:
   - Cú pháp: `V<YYYYMMDDHHmmss>__<Mo_Ta>.sql`
   - Ví dụ: `V20260914210900__Init_Location_Telemetry_Module.sql`, `V20260914210901__Add_Updated_At_To_Booking_Trips.sql`.
   - **Tuyệt đối CẤM sử dụng số tuần tự tự tăng** như `V7, V8, V9...`.
2. **Cấu hình Spring Boot Flyway bắt buộc (`application.yaml`)**:
   ```yaml
   spring:
     flyway:
       enabled: true
       baseline-on-migrate: true
       out-of-order: true                   # Cho phép nạp migration không theo thứ tự tuần tự khi merge branch
       ignore-migration-patterns:
         - "*:missing"                      # Bỏ qua lỗi khi DB chứa migration từ branch khác chưa merge vào branch hiện tại
       locations: classpath:db/migration
   ```
3. **Tính bất biến (Strict Migration Immutability)**:
   - TUYỆT ĐỐI KHÔNG sửa nội dung hay định dạng (LF/CRLF, spaces) của file migration đã từng được commit hoặc apply vào database (gây lỗi `Migration checksum mismatch`).
   - Mọi thay đổi schema (thêm cột, sửa kiểu dữ liệu, index, trigger) đều phải tạo một file migration Timestamp mới tiếp theo.

---

## 3. Khóa Ngoại Xuyên Schema (Cross-Schema Foreign Keys)
Trong PostgreSQL, các bảng giữa các schema hoàn toàn có thể tạo Foreign Key trực tiếp:
```sql
CREATE TABLE agency_schema.agency_profiles (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_id BIGINT UNIQUE NOT NULL REFERENCES auth_schema.users(id) ON DELETE RESTRICT,
    ...
);
```

---

## 4. Cấu hình JPA Entity tương ứng
```java
@Entity
@Table(name = "users", schema = "auth_schema")
public class UserEntity extends BaseEntity { ... }

@Entity
@Table(name = "agency_profiles", schema = "agency_schema")
public class AgencyProfileEntity extends BaseEntity { ... }
```
