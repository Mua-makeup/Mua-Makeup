-- ==============================================================================
-- Migration: Add Surge Pricing Rules and Distance Fee Tiers in catalog_schema
-- Standard: Timestamp Versioning V20260915150000
-- ==============================================================================

-- 1. BẢNG CẤU HÌNH QUY TẮC SURGE PRICING (CAO ĐIỂM / TỶ LỆ CUNG CẦU)
CREATE TABLE IF NOT EXISTS catalog_schema.surge_pricing_rules (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rule_name VARCHAR(150) NOT NULL,
    zone_code VARCHAR(50) DEFAULT 'ALL',
    start_time TIME,
    end_time TIME,
    applicable_days_of_week VARCHAR(50),
    surge_multiplier NUMERIC(3, 2) NOT NULL DEFAULT 1.00 CHECK (surge_multiplier BETWEEN 1.00 AND 1.50),
    min_demand_ratio NUMERIC(4, 2) DEFAULT 1.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. BẢNG BẬC THANG PHÍ DI CHUYỂN CHUẨN SÀN DỰ PHÒNG (FALLBACK DISTANCE TIERS)
CREATE TABLE IF NOT EXISTS catalog_schema.distance_fee_tiers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    min_distance_km NUMERIC(6, 2) NOT NULL,
    max_distance_km NUMERIC(6, 2) NOT NULL,
    price_per_km NUMERIC(12, 2) NOT NULL CHECK (price_per_km >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. DỮ LIỆU MẪU BAN ĐẦU CHO SURGE PRICING
INSERT INTO catalog_schema.surge_pricing_rules 
(rule_name, zone_code, start_time, end_time, applicable_days_of_week, surge_multiplier, is_active)
VALUES 
('Giờ Sáng Rước Dâu Cuối Tuần', 'VN_ALL', '05:00:00', '07:00:00', 'SATURDAY,SUNDAY', 1.20, TRUE),
('Giờ Tiệc Tối Khẩn Cấp', 'VN_ALL', '17:30:00', '19:30:00', 'FRIDAY,SATURDAY,SUNDAY', 1.15, TRUE)
ON CONFLICT DO NOTHING;

-- 4. DỮ LIỆU MẪU BẬC THANG PHÍ DI CHUYỂN DỰ PHÒNG
INSERT INTO catalog_schema.distance_fee_tiers
(min_distance_km, max_distance_km, price_per_km, is_active)
VALUES
(0.00, 5.00, 0.00, TRUE),
(5.00, 15.00, 15000.00, TRUE),
(15.00, 30.00, 20000.00, TRUE)
ON CONFLICT DO NOTHING;
