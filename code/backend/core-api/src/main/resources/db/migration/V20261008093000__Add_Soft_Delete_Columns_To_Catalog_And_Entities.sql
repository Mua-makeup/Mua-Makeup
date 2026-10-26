
ALTER TABLE catalog_schema.service_packages 
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE NOT NULL;

CREATE INDEX IF NOT EXISTS idx_service_packages_is_deleted 
    ON catalog_schema.service_packages(is_deleted);

COMMENT ON COLUMN catalog_schema.service_packages.is_deleted 
    IS 'Cờ xóa mềm bảo tồn thông tin gói dịch vụ trong lịch sử đơn hàng của khách và thợ';

-- 2. Bước quy trình & add-on (catalog_schema.package_items)
ALTER TABLE catalog_schema.package_items 
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE NOT NULL;

CREATE INDEX IF NOT EXISTS idx_package_items_is_deleted 
    ON catalog_schema.package_items(package_id, is_deleted);

COMMENT ON COLUMN catalog_schema.package_items.is_deleted 
    IS 'Cờ xóa mềm cho các bước thực hiện và dịch vụ cộng thêm của gói';

-- 3. Phụ phí dịch vụ (catalog_schema.surcharges)
ALTER TABLE catalog_schema.surcharges 
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE NOT NULL;

CREATE INDEX IF NOT EXISTS idx_surcharges_is_deleted 
    ON catalog_schema.surcharges(is_deleted);

COMMENT ON COLUMN catalog_schema.surcharges.is_deleted 
    IS 'Cờ xóa mềm cho phụ phí dịch vụ của studio hoặc MUA tự do';

-- 4. Địa chỉ đã lưu của khách hàng (auth_schema.customer_saved_addresses)
ALTER TABLE auth_schema.customer_saved_addresses 
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customer_saved_addresses_is_deleted 
    ON auth_schema.customer_saved_addresses(user_id, is_deleted);

COMMENT ON COLUMN auth_schema.customer_saved_addresses.is_deleted 
    IS 'Cờ xóa mềm cho sổ địa chỉ khách hàng';

-- 5. Thông báo in-app (interaction_schema.in_app_notifications)
ALTER TABLE interaction_schema.in_app_notifications 
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE NOT NULL;

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_is_deleted 
    ON interaction_schema.in_app_notifications(is_deleted);

COMMENT ON COLUMN interaction_schema.in_app_notifications.is_deleted 
    IS 'Cờ xóa mềm cho thông báo in-app';
