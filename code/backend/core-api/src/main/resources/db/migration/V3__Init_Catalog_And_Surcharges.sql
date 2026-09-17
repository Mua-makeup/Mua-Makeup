-- =============================================================================
-- V3__Init_Catalog_And_Surcharges.sql
-- Khởi tạo Bảng trong catalog_schema và Seed Master Taxonomy
-- =============================================================================

-- 1. DANH MỤC DỊCH VỤ GỐC TOÀN SÀN
CREATE TABLE IF NOT EXISTS catalog_schema.master_service_categories (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_code VARCHAR(50) UNIQUE NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. DANH MỤC PHONG CÁCH MAKE-UP CHUẨN SÀN
CREATE TABLE IF NOT EXISTS catalog_schema.makeup_styles (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    style_code VARCHAR(50) UNIQUE NOT NULL,
    style_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. GÓI DỊCH VỤ (AGENCY VS FREELANCER)
CREATE TABLE IF NOT EXISTS catalog_schema.service_packages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    master_category_id INT NOT NULL REFERENCES catalog_schema.master_service_categories(id) ON DELETE RESTRICT,
    agency_id BIGINT REFERENCES agency_schema.agency_profiles(id) ON DELETE CASCADE,
    mua_id BIGINT REFERENCES mua_schema.mua_profiles(id) ON DELETE CASCADE,
    package_name VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(12, 2) NOT NULL CHECK (price >= 50000.00),
    estimated_duration_minutes INT DEFAULT 60 NOT NULL CHECK (estimated_duration_minutes >= 30),
    is_available BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT check_package_owner CHECK (
        (agency_id IS NOT NULL AND mua_id IS NULL) OR 
        (agency_id IS NULL AND mua_id IS NOT NULL)
    )
);

-- 4. BƯỚC QUY TRÌNH & DỊCH VỤ MUA THÊM (ADD-ONS)
CREATE TABLE IF NOT EXISTS catalog_schema.package_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    package_id BIGINT NOT NULL REFERENCES catalog_schema.service_packages(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('COMPONENT', 'ADD_ON')),
    item_name VARCHAR(150) NOT NULL,
    step_order INT DEFAULT 1 NOT NULL,
    item_price DECIMAL(12, 2) DEFAULT 0.00 NOT NULL CHECK (item_price >= 0.00),
    is_required BOOLEAN DEFAULT TRUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 5. BẢNG TRUNG GIAN GÓI - PHONG CÁCH
CREATE TABLE IF NOT EXISTS catalog_schema.package_styles (
    package_id BIGINT NOT NULL REFERENCES catalog_schema.service_packages(id) ON DELETE CASCADE,
    style_id INT NOT NULL REFERENCES catalog_schema.makeup_styles(id) ON DELETE CASCADE,
    PRIMARY KEY (package_id, style_id)
);

-- 6. BẢNG CẤU HÌNH PHỤ PHÍ STUDIO & FREELANCER
CREATE TABLE IF NOT EXISTS catalog_schema.surcharges (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    agency_id BIGINT REFERENCES agency_schema.agency_profiles(id) ON DELETE CASCADE,
    mua_id BIGINT REFERENCES mua_schema.mua_profiles(id) ON DELETE CASCADE,
    surcharge_name VARCHAR(100) NOT NULL,
    surcharge_type VARCHAR(30) NOT NULL CHECK (surcharge_type IN ('EARLY_MORNING', 'OUT_OF_RADIUS', 'HOLIDAY', 'CUSTOM')),
    amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0.00),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT check_surcharge_owner CHECK (
        (agency_id IS NOT NULL AND mua_id IS NULL) OR 
        (agency_id IS NULL AND mua_id IS NOT NULL)
    )
);

-- 7. CHỈ MỤC TỐI ƯU TRUY VẤN
CREATE INDEX IF NOT EXISTS idx_packages_agency ON catalog_schema.service_packages(agency_id, is_available);
CREATE INDEX IF NOT EXISTS idx_packages_mua ON catalog_schema.service_packages(mua_id, is_available);
CREATE INDEX IF NOT EXISTS idx_packages_category ON catalog_schema.service_packages(master_category_id);
CREATE INDEX IF NOT EXISTS idx_package_items ON catalog_schema.package_items(package_id, is_active, step_order);
CREATE INDEX IF NOT EXISTS idx_surcharges_owner ON catalog_schema.surcharges(agency_id, mua_id, is_active);

-- 8. SEED TAXONOMY MASTER CATEGORIES
INSERT INTO catalog_schema.master_service_categories (category_code, category_name, description, icon_url) VALUES
('MAKE_CO_DAU', 'Trang điểm Cô Dâu', 'Trang điểm tiệc cưới, đón dâu, ăn hỏi với kỹ thuật bền nền cao cấp 24h', 'https://cdn.makeup.vn/icons/bride.svg'),
('MAKE_TIEC', 'Trang điểm Tiệc & Sự kiện', 'Trang điểm dạ hội, gala dinner, sinh nhật, prom tôn vinh đường nét', 'https://cdn.makeup.vn/icons/party.svg'),
('MAKE_KY_YEU', 'Trang điểm Kỷ Yếu / Học Sinh', 'Trang điểm tự nhiên trong trẻo, chống trôi ngoài trời cho sinh viên', 'https://cdn.makeup.vn/icons/yearbook.svg'),
('MAKE_CHUP_ANH', 'Trang điểm Concept / Chụp ảnh Studio', 'Trang điểm nghệ thuật, lookbook, thời trang chuẩn ánh sáng studio', 'https://cdn.makeup.vn/icons/photoshoot.svg'),
('MAKE_HANG_NGAY', 'Trang điểm Đi làm / Hàng ngày', 'Trang điểm nhẹ nhàng công sở, gặp gỡ đối tác', 'https://cdn.makeup.vn/icons/daily.svg')
ON CONFLICT (category_code) DO NOTHING;

-- 9. SEED TAXONOMY MAKEUP STYLES
INSERT INTO catalog_schema.makeup_styles (style_code, style_name, description) VALUES
('TONE_DOUYIN', 'Tone Hàn Douyin', 'Mắt to tròn long lanh, bọng mắt cười, nhũ bắt sáng và son lòng môi căng mọng'),
('TONE_THAI', 'Tone Thái Sang Trọng', 'Lông mày gẩy sợi sắc nét, má cam nâu tây, mi cong vút tôn đường nét'),
('TONE_TAY', 'Tone Tây Sắc Sảo', 'Khối rõ rệt, mắt khói quyến rũ cut-crease, môi tều cá tính phong cách Âu Mỹ'),
('TONE_HONG_BABY', 'Tone Hồng Baby Ngọt Ngào', 'Phấn má ửng hồng tươi trẻ, son môi hồng sữa, mắt nhũ đào trong veo'),
('TONE_CAM_DAO', 'Tone Cam Đào Trẻ Trung', 'Gam màu cam pastel ấm áp, trẻ trung, phù hợp tiệc ngoài trời và kỷ yếu'),
('TONE_CO_DIEN', 'Tone Cổ Điển / Retro', 'Môi đỏ đậm quyền lực, eyeliner mắt mèo cổ điển thập niên 80-90s')
ON CONFLICT (style_code) DO NOTHING;

-- 10. BỔ SUNG PERMISSIONS VÀO auth_schema.role_permissions
-- SUPER ADMIN PERMISSIONS
INSERT INTO auth_schema.role_permissions (role_id, permission_code, description)
SELECT r.id, p.code, p.descr FROM auth_schema.roles r
CROSS JOIN (VALUES
    ('catalog:master_manage', 'Toàn quyền quản trị danh mục dịch vụ gốc và phong cách make-up'),
    ('package:create', 'Tạo mới gói dịch vụ'),
    ('package:update', 'Chỉnh sửa gói dịch vụ'),
    ('package:delete', 'Xóa gói dịch vụ'),
    ('surcharge:configure', 'Cấu hình bảng phụ phí')
) AS p(code, descr)
WHERE r.name = 'ROLE_SUPER_ADMIN'
ON CONFLICT (role_id, permission_code) DO NOTHING;

-- AGENCY ADMIN PERMISSIONS
INSERT INTO auth_schema.role_permissions (role_id, permission_code, description)
SELECT r.id, p.code, p.descr FROM auth_schema.roles r
CROSS JOIN (VALUES
    ('package:create', 'Tạo gói dịch vụ Studio'),
    ('package:update', 'Sửa gói dịch vụ Studio'),
    ('package:delete', 'Xóa gói dịch vụ Studio'),
    ('surcharge:configure', 'Cấu hình bảng phụ phí Studio')
) AS p(code, descr)
WHERE r.name = 'ROLE_AGENCY_ADMIN'
ON CONFLICT (role_id, permission_code) DO NOTHING;

-- FREELANCE MUA PERMISSIONS
INSERT INTO auth_schema.role_permissions (role_id, permission_code, description)
SELECT r.id, p.code, p.descr FROM auth_schema.roles r
CROSS JOIN (VALUES
    ('package:create', 'Tạo gói dịch vụ cá nhân'),
    ('package:update', 'Sửa gói dịch vụ cá nhân'),
    ('package:delete', 'Xóa gói dịch vụ cá nhân'),
    ('surcharge:configure', 'Cấu hình bảng phụ phí cá nhân')
) AS p(code, descr)
WHERE r.name = 'ROLE_FREELANCE_MUA'
ON CONFLICT (role_id, permission_code) DO NOTHING;

-- CUSTOMER PERMISSION
INSERT INTO auth_schema.role_permissions (role_id, permission_code, description)
SELECT r.id, p.code, p.descr FROM auth_schema.roles r
CROSS JOIN (VALUES
    ('booking:preview', 'Tính toán phụ phí và xem trước hóa đơn đặt ca')
) AS p(code, descr)
WHERE r.name = 'ROLE_CUSTOMER'
ON CONFLICT (role_id, permission_code) DO NOTHING;
