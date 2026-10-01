-- Migration: V20261001094000__Allow_Discount_Multiplier_And_Add_Happy_Hour_Rule.sql
-- Description: Cho phép hệ số multiplier từ 0.70 (giảm giá 30%) đến 1.50 (+50% cao điểm), cập nhật zone_code, và thêm quy tắc ưu đãi giờ vàng và cuối tuần

ALTER TABLE catalog_schema.surge_pricing_rules 
    DROP CONSTRAINT IF EXISTS surge_pricing_rules_surge_multiplier_check;

ALTER TABLE catalog_schema.surge_pricing_rules 
    ADD CONSTRAINT surge_pricing_rules_surge_multiplier_check 
    CHECK ((surge_multiplier >= 0.70) AND (surge_multiplier <= 1.50));

UPDATE catalog_schema.surge_pricing_rules 
SET zone_code = 'ALL' 
WHERE zone_code = 'VN_ALL';

-- Khung giờ vàng ưu đãi đầu chiều (-10%)
INSERT INTO catalog_schema.surge_pricing_rules 
    (rule_name, zone_code, start_time, end_time, applicable_days_of_week, surge_multiplier, min_demand_ratio, is_active, created_at, updated_at)
SELECT 
    'Ưu Đãi Khung Giờ Vàng Buổi Trưa', 'ALL', '13:00:00', '15:00:00', 
    'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY,SUNDAY', 0.90, 1.00, true, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM catalog_schema.surge_pricing_rules WHERE rule_name = 'Ưu Đãi Khung Giờ Vàng Buổi Trưa'
);

-- Phụ phí cuối tuần cao điểm (+10%)
INSERT INTO catalog_schema.surge_pricing_rules 
    (rule_name, zone_code, start_time, end_time, applicable_days_of_week, surge_multiplier, min_demand_ratio, is_active, created_at, updated_at)
SELECT 
    'Phụ Phí Cuối Tuần Cao Điểm', 'ALL', '08:00:00', '12:00:00', 
    'SATURDAY,SUNDAY', 1.10, 1.00, true, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM catalog_schema.surge_pricing_rules WHERE rule_name = 'Phụ Phí Cuối Tuần Cao Điểm'
);
