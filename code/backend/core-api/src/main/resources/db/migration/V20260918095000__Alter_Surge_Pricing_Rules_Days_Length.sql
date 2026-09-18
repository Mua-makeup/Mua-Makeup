-- =============================================================================
-- V20260918095000__Alter_Surge_Pricing_Rules_Days_Length.sql
-- Nâng độ dài cột applicable_days_of_week lên VARCHAR(255) để lưu đủ 7 ngày
-- =============================================================================
ALTER TABLE catalog_schema.surge_pricing_rules
    ALTER COLUMN applicable_days_of_week TYPE VARCHAR(255);
