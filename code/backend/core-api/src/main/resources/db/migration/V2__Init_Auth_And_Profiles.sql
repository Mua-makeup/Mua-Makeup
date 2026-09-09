-- =============================================================================
-- V2__Init_Auth_And_Profiles.sql
-- Khởi tạo Bảng trong auth_schema, agency_schema, mua_schema
-- =============================================================================

-- 1. BẢNG TRONG auth_schema
CREATE TABLE IF NOT EXISTS auth_schema.users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    gender VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_schema.roles (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS auth_schema.user_roles (
    user_id BIGINT NOT NULL REFERENCES auth_schema.users(id) ON DELETE CASCADE,
    role_id INT NOT NULL REFERENCES auth_schema.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS auth_schema.role_permissions (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_id INT NOT NULL REFERENCES auth_schema.roles(id) ON DELETE CASCADE,
    permission_code VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    UNIQUE (role_id, permission_code)
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON auth_schema.users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_email ON auth_schema.users(email);
CREATE INDEX IF NOT EXISTS idx_role_permissions_lookup ON auth_schema.role_permissions(role_id, permission_code);

-- 2. BẢNG TRONG agency_schema
CREATE TABLE IF NOT EXISTS agency_schema.agency_profiles (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_id BIGINT UNIQUE NOT NULL REFERENCES auth_schema.users(id) ON DELETE RESTRICT,
    agency_code VARCHAR(30) UNIQUE NOT NULL,
    agency_name VARCHAR(150) NOT NULL,
    logo_url TEXT,
    hotline VARCHAR(20) NOT NULL,
    address_street TEXT NOT NULL,
    district VARCHAR(50) NOT NULL,
    city VARCHAR(50) NOT NULL,
    commission_rate_internal DECIMAL(5, 2) DEFAULT 30.00,
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    rating_avg DECIMAL(3, 2) DEFAULT 5.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agency_code ON agency_schema.agency_profiles(agency_code);

-- 3. BẢNG TRONG mua_schema
CREATE TABLE IF NOT EXISTS mua_schema.mua_profiles (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES auth_schema.users(id) ON DELETE CASCADE,
    mua_code VARCHAR(30) UNIQUE NOT NULL,
    bio TEXT,
    experience_years INT DEFAULT 1,
    portfolio_images JSONB DEFAULT '[]'::jsonb,
    certificates JSONB DEFAULT '[]'::jsonb,
    max_service_radius_km DECIMAL(4, 1) DEFAULT 15.0,
    is_online BOOLEAN DEFAULT FALSE NOT NULL,
    is_busy BOOLEAN DEFAULT FALSE NOT NULL,
    rating_avg DECIMAL(3, 2) DEFAULT 5.00,
    total_completed_jobs INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mua_code ON mua_schema.mua_profiles(mua_code);
CREATE INDEX IF NOT EXISTS idx_mua_online_status ON mua_schema.mua_profiles(is_online, is_busy);

-- 4. SEED ROLES
INSERT INTO auth_schema.roles (name, description) VALUES
('ROLE_CUSTOMER', 'Khách hàng sử dụng dịch vụ đặt lịch trang điểm'),
('ROLE_FREELANCE_MUA', 'Thợ trang điểm hoạt động tự do'),
('ROLE_AGENCY_ADMIN', 'Chủ hoặc Quản trị viên Studio / Đại lý'),
('ROLE_AGENCY_STAFF', 'Lễ tân / Nhân viên điều phối thuộc Studio'),
('ROLE_SUPER_ADMIN', 'Quản trị viên tối cao của nền tảng')
ON CONFLICT (name) DO NOTHING;

-- 5. SEED ROLE PERMISSIONS
-- CUSTOMER
INSERT INTO auth_schema.role_permissions (role_id, permission_code, description)
SELECT r.id, p.code, p.descr FROM auth_schema.roles r
CROSS JOIN (VALUES
    ('booking:create', 'Đặt lịch trang điểm mới'),
    ('booking:view_my_jobs', 'Xem lịch hẹn của mình'),
    ('wallet:view_balance', 'Xem số dư ví khách hàng'),
    ('wallet:withdraw', 'Rút tiền hoàn về tài khoản')
) AS p(code, descr)
WHERE r.name = 'ROLE_CUSTOMER'
ON CONFLICT (role_id, permission_code) DO NOTHING;

-- FREELANCE MUA
INSERT INTO auth_schema.role_permissions (role_id, permission_code, description)
SELECT r.id, p.code, p.descr FROM auth_schema.roles r
CROSS JOIN (VALUES
    ('booking:create', 'Đặt lịch trang điểm'),
    ('booking:view_my_jobs', 'Xem danh sách ca làm việc cá nhân'),
    ('booking:accept_instant', 'Chấp nhận đơn khẩn cấp realtime 30s'),
    ('booking:update_status', 'Cập nhật tiến trình ca trang điểm'),
    ('location:broadcast', 'Phát sóng tọa độ GPS di chuyển'),
    ('portfolio:upload', 'Upload album ảnh tác phẩm trước sau'),
    ('portfolio:delete', 'Xóa ảnh trong album cá nhân'),
    ('calendar:block', 'Khóa khung giờ bận cá nhân'),
    ('calendar:view', 'Xem lịch làm việc cá nhân'),
    ('wallet:view_balance', 'Xem số dư ví thợ'),
    ('wallet:withdraw', 'Yêu cầu rút tiền về tài khoản ngân hàng')
) AS p(code, descr)
WHERE r.name = 'ROLE_FREELANCE_MUA'
ON CONFLICT (role_id, permission_code) DO NOTHING;

-- AGENCY ADMIN
INSERT INTO auth_schema.role_permissions (role_id, permission_code, description)
SELECT r.id, p.code, p.descr FROM auth_schema.roles r
CROSS JOIN (VALUES
    ('booking:view_my_jobs', 'Xem toàn bộ đơn đặt lịch của Studio'),
    ('booking:dispatch', 'Điều phối và gán thợ cho đơn Studio'),
    ('agency:manage', 'Quản lý thông tin hồ sơ Studio'),
    ('agency:invite_staff', 'Mời và duyệt thợ gia nhập Studio'),
    ('agency:set_commission', 'Thiết lập % hoa hồng nội bộ Studio'),
    ('agency:view_staff', 'Xem danh sách nhân sự Studio'),
    ('portfolio:upload', 'Đăng ảnh album đại diện Studio'),
    ('portfolio:delete', 'Xóa ảnh album Studio'),
    ('calendar:view', 'Xem ma trận lịch của toàn bộ thợ Studio'),
    ('wallet:view_balance', 'Xem số dư ví doanh nghiệp Studio'),
    ('wallet:withdraw', 'Yêu cầu rút doanh thu Studio về tài khoản công ty')
) AS p(code, descr)
WHERE r.name = 'ROLE_AGENCY_ADMIN'
ON CONFLICT (role_id, permission_code) DO NOTHING;

-- AGENCY STAFF
INSERT INTO auth_schema.role_permissions (role_id, permission_code, description)
SELECT r.id, p.code, p.descr FROM auth_schema.roles r
CROSS JOIN (VALUES
    ('booking:view_my_jobs', 'Xem đơn đặt lịch của Studio'),
    ('booking:dispatch', 'Điều phối và gán thợ Studio cho ca làm'),
    ('agency:view_staff', 'Xem danh sách thợ và trạng thái thợ'),
    ('calendar:view', 'Xem ma trận lịch làm việc của thợ Studio')
) AS p(code, descr)
WHERE r.name = 'ROLE_AGENCY_STAFF'
ON CONFLICT (role_id, permission_code) DO NOTHING;
