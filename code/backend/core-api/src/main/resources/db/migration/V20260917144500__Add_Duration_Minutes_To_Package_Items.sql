-- Bổ sung trường duration_minutes cho bảng package_items (Quy trình & Add-ons)
ALTER TABLE catalog_schema.package_items
ADD COLUMN IF NOT EXISTS duration_minutes INT DEFAULT 15 NOT NULL;
