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

## 2. Quy chuẩn Tệp tin Flyway Migrations
Các file migration được đặt tại `code/backend/core-api/src/main/resources/db/migration/`:
- `V1__Create_Schemas_And_Extensions.sql`: Khởi tạo 8 Schemas và kích hoạt extensions `uuid-ossp`, `postgis`.
- `V2__Init_Auth_And_Profiles.sql`: DDL các bảng `auth_schema`, `agency_schema`, `mua_schema` kèm seed roles & permissions.
- `V3__Init_Catalog_And_Telemetry.sql`: DDL `catalog_schema` và `telemetry_schema`.
- `V4__Init_Booking_And_Interaction.sql`: DDL `booking_schema` và `interaction_schema`.
- `V5__Init_Wallet_Double_Entry.sql`: DDL 7 bảng kế toán đúp trong `wallet_schema`.

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
