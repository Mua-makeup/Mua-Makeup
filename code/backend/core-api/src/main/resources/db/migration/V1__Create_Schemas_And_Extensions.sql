-- =============================================================================
-- V1__Create_Schemas_And_Extensions.sql
-- NỀN TẢNG ĐẶT LỊCH MAKE-UP (MAKEUP BOOKING PLATFORM)
-- KHỞI TẠO CÁC EXTENSIONS VÀ 8 POSTGRESQL SCHEMAS
-- =============================================================================

-- 1. KÍCH HOẠT EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. KHỞI TẠO 8 POSTGRESQL SCHEMAS ĐỘC LẬP THEO BOUNDED CONTEXTS
CREATE SCHEMA IF NOT EXISTS auth_schema;
CREATE SCHEMA IF NOT EXISTS agency_schema;
CREATE SCHEMA IF NOT EXISTS mua_schema;
CREATE SCHEMA IF NOT EXISTS catalog_schema;
CREATE SCHEMA IF NOT EXISTS booking_schema;
CREATE SCHEMA IF NOT EXISTS telemetry_schema;
CREATE SCHEMA IF NOT EXISTS wallet_schema;
CREATE SCHEMA IF NOT EXISTS interaction_schema;

COMMENT ON SCHEMA auth_schema IS 'Schema quản lý Tài khoản, Vai trò và Phân quyền RBAC';
COMMENT ON SCHEMA agency_schema IS 'Schema quản lý Hồ sơ Studio / Đại lý và Nhân viên Studio';
COMMENT ON SCHEMA mua_schema IS 'Schema quản lý Hồ sơ Thợ Make-up tự do, Kỹ năng và Lịch bận';
COMMENT ON SCHEMA catalog_schema IS 'Schema quản lý Gói dịch vụ, Danh mục Tone Make-up và Portfolio';
COMMENT ON SCHEMA booking_schema IS 'Schema quản lý Máy trạng thái Đơn đặt lịch và Nhật ký điều phối';
COMMENT ON SCHEMA telemetry_schema IS 'Schema lưu trữ Tọa độ GPS Telemetry di chuyển của Thợ (PostGIS)';
COMMENT ON SCHEMA wallet_schema IS 'Schema quản lý Ví điện tử, Escrow và Sổ cái kế toán đúp 7 bảng';
COMMENT ON SCHEMA interaction_schema IS 'Schema quản lý Thông báo In-App, Đánh giá và Khiếu nại';
