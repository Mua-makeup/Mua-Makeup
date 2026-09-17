-- =============================================================================
-- V20260914210900__Init_Location_Telemetry_Module.sql
-- NỀN TẢNG ĐẶT LỊCH MAKE-UP (MAKEUP BOOKING PLATFORM)
-- PHÂN HỆ: ĐỊNH VỊ GPS TELEMETRY & CHỈ MỤC KHÔNG GIAN REDIS GEO
-- =============================================================================

-- 1. KÍCH HOẠT EXTENSION POSTGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. TẠO SCHEMA TELEMETRY (NẾU CHƯA CÓ)
CREATE SCHEMA IF NOT EXISTS telemetry_schema;

-- 3. BỔ SUNG CỘT availability_status CHO BẢNG mua_schema.mua_profiles
ALTER TABLE mua_schema.mua_profiles 
ADD COLUMN IF NOT EXISTS availability_status VARCHAR(20) DEFAULT 'OFFLINE' NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mua_availability_status ON mua_schema.mua_profiles(availability_status);

-- 4. BẢNG LƯU VẾT LỊCH SỬ TỌA ĐỘ GPS (ÁP DỤNG RANGE PARTITIONING THEO THÁNG)
CREATE TABLE IF NOT EXISTS telemetry_schema.telemetry_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    mua_id BIGINT NOT NULL,
    booking_id BIGINT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location_point GEOMETRY(Point, 4326) NOT NULL,
    speed_kmh DECIMAL(5, 2) DEFAULT 0.00,
    heading_degree DECIMAL(5, 2) DEFAULT 0.00,
    accuracy_meters DECIMAL(6, 2),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (id, recorded_at)
) PARTITION BY RANGE (recorded_at);

-- Tạo các phân vùng cụ thể theo tháng năm 2026 và 2027
CREATE TABLE IF NOT EXISTS telemetry_schema.telemetry_logs_2026_01 
    PARTITION OF telemetry_schema.telemetry_logs
    FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-02-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS telemetry_schema.telemetry_logs_2026_02 
    PARTITION OF telemetry_schema.telemetry_logs
    FOR VALUES FROM ('2026-02-01 00:00:00+00') TO ('2026-03-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS telemetry_schema.telemetry_logs_2026_03 
    PARTITION OF telemetry_schema.telemetry_logs
    FOR VALUES FROM ('2026-03-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS telemetry_schema.telemetry_logs_2026_04 
    PARTITION OF telemetry_schema.telemetry_logs
    FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-05-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS telemetry_schema.telemetry_logs_2026_05 
    PARTITION OF telemetry_schema.telemetry_logs
    FOR VALUES FROM ('2026-05-01 00:00:00+00') TO ('2026-06-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS telemetry_schema.telemetry_logs_2026_06 
    PARTITION OF telemetry_schema.telemetry_logs
    FOR VALUES FROM ('2026-06-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS telemetry_schema.telemetry_logs_2026_07 
    PARTITION OF telemetry_schema.telemetry_logs
    FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-08-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS telemetry_schema.telemetry_logs_2026_08 
    PARTITION OF telemetry_schema.telemetry_logs
    FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS telemetry_schema.telemetry_logs_2026_09 
    PARTITION OF telemetry_schema.telemetry_logs
    FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS telemetry_schema.telemetry_logs_2026_10 
    PARTITION OF telemetry_schema.telemetry_logs
    FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS telemetry_schema.telemetry_logs_2026_11 
    PARTITION OF telemetry_schema.telemetry_logs
    FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS telemetry_schema.telemetry_logs_2026_12 
    PARTITION OF telemetry_schema.telemetry_logs
    FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS telemetry_schema.telemetry_logs_2027_01 
    PARTITION OF telemetry_schema.telemetry_logs
    FOR VALUES FROM ('2027-01-01 00:00:00+00') TO ('2027-02-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS telemetry_schema.telemetry_logs_2027_02 
    PARTITION OF telemetry_schema.telemetry_logs
    FOR VALUES FROM ('2027-02-01 00:00:00+00') TO ('2027-03-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS telemetry_schema.telemetry_logs_2027_03 
    PARTITION OF telemetry_schema.telemetry_logs
    FOR VALUES FROM ('2027-03-01 00:00:00+00') TO ('2027-04-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS telemetry_schema.telemetry_logs_2027_04 
    PARTITION OF telemetry_schema.telemetry_logs
    FOR VALUES FROM ('2027-04-01 00:00:00+00') TO ('2027-05-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS telemetry_schema.telemetry_logs_default 
    PARTITION OF telemetry_schema.telemetry_logs DEFAULT;

-- 5. BẢNG LƯU LỘ TRÌNH ĐÃ NÉN (POLYLINE LINESTRING) SAU KHI KẾT THÚC ĐƠN
CREATE TABLE IF NOT EXISTS telemetry_schema.booking_trips (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id BIGINT UNIQUE NOT NULL,
    mua_id BIGINT NOT NULL REFERENCES mua_schema.mua_profiles(id) ON DELETE CASCADE,
    total_distance_km DECIMAL(6, 2) DEFAULT 0.00,
    total_duration_minutes INT DEFAULT 0,
    route_linestring GEOMETRY(LineString, 4326) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. BẢNG CƠ SỞ ĐỊA CHỈ & TỌA ĐỘ CỐ ĐỊNH CỦA STUDIO
CREATE TABLE IF NOT EXISTS agency_schema.agency_branches (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    agency_id BIGINT NOT NULL REFERENCES agency_schema.agency_profiles(id) ON DELETE CASCADE,
    branch_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    address_line TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location_point GEOMETRY(Point, 4326) NOT NULL,
    is_main_branch BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. CHỈ MỤC TỐI ƯU TRUY VẤN
CREATE INDEX IF NOT EXISTS idx_telemetry_spatial 
    ON telemetry_schema.telemetry_logs USING GIST(location_point);

CREATE INDEX IF NOT EXISTS idx_telemetry_booking 
    ON telemetry_schema.telemetry_logs(booking_id, recorded_at);

CREATE INDEX IF NOT EXISTS idx_telemetry_mua 
    ON telemetry_schema.telemetry_logs(mua_id, recorded_at);

CREATE INDEX IF NOT EXISTS idx_booking_trips_spatial 
    ON telemetry_schema.booking_trips USING GIST(route_linestring);

CREATE INDEX IF NOT EXISTS idx_booking_trips_booking 
    ON telemetry_schema.booking_trips(booking_id);

CREATE INDEX IF NOT EXISTS idx_agency_branch_spatial 
    ON agency_schema.agency_branches USING GIST(location_point);

CREATE INDEX IF NOT EXISTS idx_agency_branch_agency 
    ON agency_schema.agency_branches(agency_id);
