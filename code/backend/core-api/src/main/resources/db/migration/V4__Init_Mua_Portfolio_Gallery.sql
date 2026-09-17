
ALTER TABLE mua_schema.mua_profiles 
    ADD COLUMN IF NOT EXISTS total_reviews INT DEFAULT 0 NOT NULL;

COMMENT ON COLUMN mua_schema.mua_profiles.certificates IS 'Mảng JSONB chứng chỉ thợ tải lên, mặc định is_verified=false, chỉ Admin/Moderator mới có quyền duyệt';
COMMENT ON COLUMN mua_schema.mua_profiles.rating_avg IS 'Điểm đánh giá trung bình được cập nhật bất đồng bộ qua ReviewSubmittedEvent từ Review Service';
COMMENT ON COLUMN mua_schema.mua_profiles.total_reviews IS 'Tổng số đánh giá được cập nhật bất đồng bộ qua ReviewSubmittedEvent từ Review Service';

CREATE TABLE IF NOT EXISTS mua_schema.mua_styles (
    mua_id BIGINT NOT NULL REFERENCES mua_schema.mua_profiles(id) ON DELETE CASCADE,
    style_id INT NOT NULL REFERENCES catalog_schema.makeup_styles(id) ON DELETE CASCADE,
    is_qualified BOOLEAN DEFAULT TRUE NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (mua_id, style_id)
);

COMMENT ON TABLE mua_schema.mua_styles IS 'Bảng liên kết nhiều-nhiều giữa Thợ MUA và các Phong cách Make-up thế mạnh';
COMMENT ON COLUMN mua_schema.mua_styles.is_qualified IS 'Trạng thái kiểm duyệt tay nghề thợ đối với phong cách này';

CREATE TABLE IF NOT EXISTS catalog_schema.portfolio_showcases (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mua_id BIGINT NOT NULL REFERENCES mua_schema.mua_profiles(id) ON DELETE CASCADE,
    package_id BIGINT REFERENCES catalog_schema.service_packages(id) ON DELETE SET NULL,
    style_id INT REFERENCES catalog_schema.makeup_styles(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,                         -- Ảnh hoàn thiện chính chất lượng cao (HD)
    thumbnail_url TEXT,                              -- Ảnh thu nhỏ tối ưu CDN (400x400)
    additional_images JSONB DEFAULT '[]'::jsonb,     -- Mảng JSONB chứa URL ảnh Before/After, góc chụp cận cảnh
    is_featured BOOLEAN DEFAULT FALSE NOT NULL,      -- Cờ ghim tiêu biểu (Tối đa 6 ảnh trên hồ sơ)
    
    is_visible BOOLEAN DEFAULT TRUE NOT NULL,        -- Cho phép thợ chủ động ẩn/hiện tác phẩm (Mặc định: true)
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,       -- Cờ xóa mềm (Mặc định: false; true = đã xóa)
    deleted_at TIMESTAMP WITH TIME ZONE,             -- Thời điểm xóa mềm tác phẩm
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

COMMENT ON TABLE catalog_schema.portfolio_showcases IS 'Bộ sưu tập album tác phẩm thực tế hoàn thiện của MUA';
COMMENT ON COLUMN catalog_schema.portfolio_showcases.is_visible IS 'Cờ kiểm soát thợ ẩn/hiện tác phẩm khỏi bộ sưu tập công khai mà không xóa dữ liệu';
COMMENT ON COLUMN catalog_schema.portfolio_showcases.is_deleted IS 'Cờ xóa mềm bảo tồn bản ghi cho đối soát lịch sử đặt lịch; CDN dọn dẹp bằng Batch Job bất đồng bộ';
COMMENT ON COLUMN catalog_schema.portfolio_showcases.is_featured IS 'Cờ ghim ảnh tiêu biểu lên đầu Gallery (Tối đa 6 tác phẩm hiển thị)';

-- Tối ưu hóa truy vấn Gallery công khai cho khách hàng (chỉ quét các bản ghi hiển thị và chưa bị xóa mềm)
CREATE INDEX IF NOT EXISTS idx_portfolio_public_gallery 
    ON catalog_schema.portfolio_showcases(mua_id, is_featured DESC, created_at DESC)
    WHERE is_visible = TRUE AND is_deleted = FALSE;

-- Tối ưu hóa lọc theo phong cách cho tác phẩm còn hiển thị
CREATE INDEX IF NOT EXISTS idx_portfolio_style_active 
    ON catalog_schema.portfolio_showcases(style_id)
    WHERE is_visible = TRUE AND is_deleted = FALSE;


-- Chỉ mục hỗ trợ Batch Job dọn dẹp CDN quét các bản ghi xóa mềm quá hạn
CREATE INDEX IF NOT EXISTS idx_portfolio_cleanup_job 
    ON catalog_schema.portfolio_showcases(deleted_at)
    WHERE is_deleted = TRUE;

-- Chỉ mục lookup phong cách thợ
CREATE INDEX IF NOT EXISTS idx_mua_styles_lookup 
    ON mua_schema.mua_styles(style_id, mua_id);
