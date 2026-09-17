-- =============================================================================
-- V20260916161500__Add_Fixed_Location_To_Agency_Profile.sql
-- NỀN TẢNG ĐẶT LỊCH MAKE-UP (MAKEUP BOOKING PLATFORM)
-- BỔ SUNG TỌA ĐỘ VỊ TRÍ CỐ ĐỊNH CHO AGENCY PROFILE & ĐỒNG BỘ AGENCY BRANCHES
-- PHỤC VỤ ĐỘNG CƠ TÍNH GIÁ ĐỘNG & PHỤ PHÍ DI CHUYỂN (DYNAMIC PRICING ENGINE)
-- =============================================================================

-- 1. Bổ sung các cột tọa độ GPS & PostGIS geometry point cho agency_schema.agency_profiles
ALTER TABLE agency_schema.agency_profiles
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_point GEOMETRY(Point, 4326);

-- 2. Đánh chỉ mục không gian GIST phục vụ truy vấn cự ly siêu tốc (<5ms)
CREATE INDEX IF NOT EXISTS idx_agency_profiles_location 
ON agency_schema.agency_profiles USING GIST(location_point);

-- 3. Cập nhật tọa độ mặc định (Trung tâm TP.HCM: 10.776889, 106.700806) cho các Studio hiện có nếu chưa có tọa độ
UPDATE agency_schema.agency_profiles
SET 
    latitude = COALESCE(latitude, 10.776889),
    longitude = COALESCE(longitude, 106.700806),
    location_point = COALESCE(location_point, ST_SetSRID(ST_MakePoint(106.700806, 10.776889), 4326))
WHERE location_point IS NULL;

-- 4. Đồng bộ dữ liệu sang bảng agency_schema.agency_branches để phục vụ cả radar telemetry
INSERT INTO agency_schema.agency_branches (
    agency_id, branch_name, phone_number, address_line, 
    latitude, longitude, location_point, is_main_branch, is_active, created_at
)
SELECT 
    ap.id, 
    ap.agency_name || ' (Trụ sở chính)', 
    ap.hotline, 
    ap.address_street || ', ' || ap.district || ', ' || ap.city,
    ap.latitude, 
    ap.longitude, 
    ap.location_point, 
    TRUE, 
    TRUE, 
    CURRENT_TIMESTAMP
FROM agency_schema.agency_profiles ap
WHERE NOT EXISTS (
    SELECT 1 FROM agency_schema.agency_branches ab 
    WHERE ab.agency_id = ap.id AND ab.is_main_branch = TRUE
);
