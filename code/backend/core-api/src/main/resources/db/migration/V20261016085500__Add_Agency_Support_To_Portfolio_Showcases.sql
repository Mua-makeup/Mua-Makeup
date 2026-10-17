-- =========================================================================
-- MIGRATION: V20261016085500__Add_Agency_Support_To_Portfolio_Showcases.sql
-- MỤC TIÊU: Mở rộng catalog_schema.portfolio_showcases cho phép Studio (Agency)
--          tải lên, quản lý album ảnh mẫu tác phẩm gắn với dịch vụ của mình.
-- =========================================================================

-- 1. Cho phép mua_id có thể NULL (để tác phẩm có thể thuộc về Agency độc lập)
ALTER TABLE catalog_schema.portfolio_showcases 
    ALTER COLUMN mua_id DROP NOT NULL;

-- 2. Bổ sung agency_id tham chiếu tới agency_schema.agency_profiles(id)
ALTER TABLE catalog_schema.portfolio_showcases 
    ADD COLUMN IF NOT EXISTS agency_id BIGINT REFERENCES agency_schema.agency_profiles(id) ON DELETE CASCADE;

-- 3. Ràng buộc toàn vẹn: Mỗi tác phẩm phải thuộc về MUA hoặc Agency (không được đồng thời cả hai hoặc để trống cả hai)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_portfolio_owner'
    ) THEN
        ALTER TABLE catalog_schema.portfolio_showcases
            ADD CONSTRAINT chk_portfolio_owner
            CHECK (
                (mua_id IS NOT NULL AND agency_id IS NULL) OR 
                (mua_id IS NULL AND agency_id IS NOT NULL)
            );
    END IF;
END $$;

-- 4. Tạo Index tối ưu hóa truy vấn Gallery công khai cho Studio / Agency
CREATE INDEX IF NOT EXISTS idx_portfolio_agency_public_gallery
    ON catalog_schema.portfolio_showcases(agency_id, is_featured DESC, created_at DESC)
    WHERE is_visible = TRUE AND is_deleted = FALSE;

-- 5. Tạo Index tối ưu lọc theo package_id cho các tác phẩm còn hiển thị
CREATE INDEX IF NOT EXISTS idx_portfolio_package_id
    ON catalog_schema.portfolio_showcases(package_id)
    WHERE is_visible = TRUE AND is_deleted = FALSE;
