-- =============================================================================
-- DỰ ÁN NỀN TẢNG ĐẶT LỊCH MAKE-UP (MAKEUP BOOKING PLATFORM)
-- SCRIPT THIẾT KẾ CƠ SỞ DỮ LIỆU CHUẨN POSTGRESQL 16 + POSTGIS EXTENSION (UPDATED)
-- TỔNG CỘNG: 6 DATABASES, 27 BẢNG, PHÂN CHIA THEO DOMAIN MICROSERVICES
-- =============================================================================

-- =============================================================================
-- DATABASE 1: user_profile_db (Port: 8081 - user-agency-mua-profile-service)
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1.1 Users & RBAC
CREATE TABLE IF NOT EXISTS users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    gender VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS roles (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL, -- ROLE_CUSTOMER, ROLE_FREELANCE_MUA, ROLE_AGENCY_ADMIN, ROLE_AGENCY_STAFF, ROLE_SUPER_ADMIN
    description VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    role_id INT REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS role_permissions (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_code VARCHAR(100) NOT NULL, -- booking:create, booking:dispatch, wallet:withdraw, agency:invite_staff...
    description VARCHAR(255),
    UNIQUE (role_id, permission_code)
);

-- 1.2 Profiles
CREATE TABLE IF NOT EXISTS agency_profiles (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    agency_code VARCHAR(30) UNIQUE NOT NULL, -- Mã Đại lý AG-HN-00182
    agency_name VARCHAR(150) NOT NULL,
    logo_url TEXT,
    hotline VARCHAR(20) NOT NULL,
    address_street TEXT NOT NULL,
    district VARCHAR(50) NOT NULL,
    city VARCHAR(50) NOT NULL,
    commission_rate_internal DECIMAL(5, 2) DEFAULT 30.00, -- % hoa hồng Studio chia thợ
    is_verified BOOLEAN DEFAULT FALSE,
    rating_avg DECIMAL(3, 2) DEFAULT 5.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS mua_profiles (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mua_code VARCHAR(30) UNIQUE NOT NULL, -- Mã Thợ MUA-2026-08912
    bio TEXT,
    experience_years INT DEFAULT 1,
    portfolio_images JSONB DEFAULT '[]'::jsonb, -- Album ảnh Before/After
    certificates JSONB DEFAULT '[]'::jsonb,
    max_service_radius_km DECIMAL(4, 1) DEFAULT 15.0,
    is_online BOOLEAN DEFAULT FALSE,
    is_busy BOOLEAN DEFAULT FALSE,
    rating_avg DECIMAL(3, 2) DEFAULT 5.00,
    total_completed_jobs INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS mua_styles (
    mua_id BIGINT REFERENCES mua_profiles(id) ON DELETE CASCADE,
    style_id INT NOT NULL, -- Logical ref: makeup_styles.id
    is_qualified BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (mua_id, style_id)
);
COMMENT ON TABLE mua_styles IS 'Bảng gán kỹ năng Tone Make-up trực tiếp cho Thợ trang điểm (cả Freelancer và Agency Staff)';

CREATE TABLE IF NOT EXISTS in_app_notifications (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    reference_id BIGINT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for user_profile_db
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_role_permissions_lookup ON role_permissions(role_id, permission_code);
CREATE INDEX IF NOT EXISTS idx_mua_online_status ON mua_profiles(is_online, is_busy);
CREATE INDEX IF NOT EXISTS idx_mua_styles ON mua_styles(mua_id, style_id, is_qualified);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON in_app_notifications(user_id, is_read, created_at DESC);


-- =============================================================================
-- DATABASE 2: agency_operations_db (Port: 8082 - agency-operations-service)
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS agency_staff (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    agency_id BIGINT NOT NULL, -- Logical ref: agency_profiles.id
    mua_id BIGINT NOT NULL,    -- Logical ref: mua_profiles.id
    agreed_commission_rate DECIMAL(5, 2),
    is_active BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (agency_id, mua_id)
);

CREATE TABLE IF NOT EXISTS agency_staff_services (
    staff_id BIGINT REFERENCES agency_staff(id) ON DELETE CASCADE,
    package_id BIGINT NOT NULL, -- Logical ref: service_packages.id
    proficiency_level VARCHAR(30) DEFAULT 'PRIMARY_MUA',
    is_qualified BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (staff_id, package_id)
);

CREATE TABLE IF NOT EXISTS agency_staff_styles (
    staff_id BIGINT REFERENCES agency_staff(id) ON DELETE CASCADE,
    style_id INT NOT NULL,      -- Logical ref: makeup_styles.id
    is_qualified BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (staff_id, style_id)
);

-- Indexes for agency_operations_db
CREATE INDEX IF NOT EXISTS idx_agency_staff_styles ON agency_staff_styles(staff_id, style_id, is_qualified);


-- =============================================================================
-- DATABASE 3: catalog_media_db (Port: 8083 - catalog-media-service)
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS master_service_categories (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_code VARCHAR(50) UNIQUE NOT NULL, -- MAKE_TIEC, MAKE_CO_DAU, MAKE_KY_YEU...
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url TEXT
);

CREATE TABLE IF NOT EXISTS makeup_styles (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    style_code VARCHAR(50) UNIQUE NOT NULL, -- TONE_DOUYIN, TONE_THAI, TONE_HONG_BABY, TONE_TAY...
    style_name VARCHAR(100) NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS service_packages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    master_category_id INT NOT NULL REFERENCES master_service_categories(id),
    agency_id BIGINT,          -- Logical ref: agency_profiles.id
    mua_id BIGINT,             -- Logical ref: mua_profiles.id
    package_name VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(12, 2) NOT NULL CHECK (price >= 0),
    estimated_duration_minutes INT DEFAULT 60,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT check_package_owner CHECK (
        (agency_id IS NOT NULL AND mua_id IS NULL) OR
        (agency_id IS NULL AND mua_id IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS package_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    package_id BIGINT NOT NULL REFERENCES service_packages(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('COMPONENT', 'ADD_ON')),
    item_name VARCHAR(150) NOT NULL,
    step_order INT DEFAULT 1,
    item_price DECIMAL(12, 2) DEFAULT 0.00 CHECK (item_price >= 0),
    is_required BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS package_styles (
    package_id BIGINT REFERENCES service_packages(id) ON DELETE CASCADE,
    style_id INT REFERENCES makeup_styles(id) ON DELETE CASCADE,
    PRIMARY KEY (package_id, style_id)
);

CREATE TABLE IF NOT EXISTS portfolio_showcases (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mua_id BIGINT NOT NULL,     -- Logical ref: mua_profiles.id
    staff_id BIGINT,            -- Logical ref: agency_staff.id
    package_id BIGINT REFERENCES service_packages(id) ON DELETE SET NULL,
    style_id INT REFERENCES makeup_styles(id) ON DELETE SET NULL,
    title VARCHAR(150),
    image_url TEXT NOT NULL,
    additional_images JSONB DEFAULT '[]'::jsonb,
    description TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT check_showcase_owner CHECK (staff_id IS NOT NULL OR mua_id IS NOT NULL)
);
COMMENT ON TABLE portfolio_showcases IS 'Bảng lưu Album ảnh sản phẩm trang điểm thực tế của cả Thợ Tự Do và Thợ Studio';

CREATE TABLE IF NOT EXISTS surcharges (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    agency_id BIGINT,          -- Logical ref: agency_profiles.id
    mua_id BIGINT,             -- Logical ref: mua_profiles.id
    surcharge_name VARCHAR(100) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
    is_active BOOLEAN DEFAULT TRUE
);

-- Indexes for catalog_media_db
CREATE INDEX IF NOT EXISTS idx_packages_category_price ON service_packages(master_category_id, price, is_available);
CREATE INDEX IF NOT EXISTS idx_packages_agency ON service_packages(agency_id);
CREATE INDEX IF NOT EXISTS idx_packages_mua ON service_packages(mua_id);
CREATE INDEX IF NOT EXISTS idx_package_items_pkg_type ON package_items(package_id, item_type, is_active);
CREATE INDEX IF NOT EXISTS idx_portfolio_showcase_lookup ON portfolio_showcases(mua_id, staff_id, package_id, style_id);


-- =============================================================================
-- DATABASE 4: location_tracking_db (Port: 8084 - location-service)
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

CREATE TABLE IF NOT EXISTS telemetry_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mua_id BIGINT NOT NULL,     -- Logical ref: mua_profiles.id
    booking_id BIGINT,          -- Logical ref: bookings.id
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location_point GEOMETRY(Point, 4326) NOT NULL,
    speed_kmh DECIMAL(5, 2),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for location_tracking_db
CREATE INDEX IF NOT EXISTS idx_telemetry_spatial ON telemetry_logs USING GIST(location_point);
CREATE INDEX IF NOT EXISTS idx_telemetry_mua_recorded ON telemetry_logs(mua_id, recorded_at DESC);


-- =============================================================================
-- DATABASE 5: booking_dispatch_db (Port: 8085 - booking-service)
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE booking_type_enum AS ENUM ('REALTIME_INSTANT', 'SCHEDULED');
CREATE TYPE booking_partner_enum AS ENUM ('FREELANCER_DIRECT', 'AGENCY_DISPATCH');
CREATE TYPE booking_status_enum AS ENUM (
    'REQUESTED', 'PENDING_AGENCY_DISPATCH', 'AGENCY_ASSIGNED',
    'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS',
    'COMPLETED', 'PAID_OUT', 'CANCELLED', 'DISPUTED'
);
CREATE TYPE dispute_status_enum AS ENUM (
    'OPENED', 'UNDER_INVESTIGATION', 'RESOLVED_REFUND_CUSTOMER', 'RESOLVED_PAY_MUA', 'CLOSED'
);

CREATE TABLE IF NOT EXISTS bookings (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_code VARCHAR(30) UNIQUE NOT NULL, -- BK-260908-A9X2K
    customer_id BIGINT NOT NULL,              -- Logical ref: users.id
    agency_id BIGINT,                         -- Logical ref: agency_profiles.id
    mua_id BIGINT,                            -- Logical ref: mua_profiles.id
    booking_type booking_type_enum NOT NULL,
    booking_partner booking_partner_enum NOT NULL,
    status booking_status_enum DEFAULT 'REQUESTED',
    destination_address TEXT NOT NULL,
    destination_latitude DECIMAL(10, 8) NOT NULL,
    destination_longitude DECIMAL(11, 8) NOT NULL,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    service_subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    distance_fee DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    surcharge_fee DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    surge_multiplier DECIMAL(3, 2) DEFAULT 1.00,
    discount_amount DECIMAL(12, 2) DEFAULT 0.00,
    total_amount DECIMAL(12, 2) NOT NULL CHECK (total_amount >= 0),
    completion_photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS booking_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    package_id BIGINT NOT NULL,               -- Logical ref: service_packages.id
    package_name VARCHAR(150) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    quantity INT DEFAULT 1 CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS booking_history (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    from_status booking_status_enum,
    to_status booking_status_enum NOT NULL,
    changed_by_user_id BIGINT,                -- Logical ref: users.id
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS mua_calendars (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mua_id BIGINT NOT NULL,                   -- Logical ref: mua_profiles.id
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (mua_id, booking_date, start_time)
);

CREATE TABLE IF NOT EXISTS reviews (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id BIGINT UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    customer_id BIGINT NOT NULL,              -- Logical ref: users.id
    mua_id BIGINT,                            -- Logical ref: mua_profiles.id
    agency_id BIGINT,                         -- Logical ref: agency_profiles.id
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    review_images JSONB DEFAULT '[]'::jsonb,
    tip_amount DECIMAL(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS disputes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dispute_code VARCHAR(30) UNIQUE NOT NULL,
    booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    opened_by_user_id BIGINT NOT NULL,        -- Logical ref: users.id
    reason TEXT NOT NULL,
    evidence_images JSONB DEFAULT '[]'::jsonb,
    status dispute_status_enum DEFAULT 'OPENED',
    resolution_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for booking_dispatch_db
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_mua_date ON bookings(mua_id, booking_date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_agency_date ON bookings(agency_id, booking_date, status);


-- =============================================================================
-- DATABASE 6: payment_wallet_db (Port: 8087 - payment-service)
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE wallet_type_enum AS ENUM ('CUSTOMER_WALLET', 'FREELANCER_WALLET', 'AGENCY_WALLET', 'SYSTEM_PLATFORM_WALLET');
CREATE TYPE transaction_type_enum AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'ESCROW_LOCK', 'ESCROW_RELEASE', 'PLATFORM_COMMISSION', 'REFUND', 'TIP');
CREATE TYPE payout_status_enum AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'REJECTED');

CREATE TABLE IF NOT EXISTS wallets (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT,                           -- Logical ref: users.id
    agency_id BIGINT,                         -- Logical ref: agency_profiles.id
    mua_id BIGINT,                            -- Logical ref: mua_profiles.id
    wallet_type wallet_type_enum NOT NULL,
    balance DECIMAL(15, 2) DEFAULT 0.00 CHECK (balance >= 0),
    frozen_balance DECIMAL(15, 2) DEFAULT 0.00 CHECK (frozen_balance >= 0),
    currency VARCHAR(3) DEFAULT 'VND',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT check_wallet_owner CHECK (
        (wallet_type = 'CUSTOMER_WALLET' AND user_id IS NOT NULL) OR
        (wallet_type = 'FREELANCER_WALLET' AND mua_id IS NOT NULL) OR
        (wallet_type = 'AGENCY_WALLET' AND agency_id IS NOT NULL) OR
        (wallet_type = 'SYSTEM_PLATFORM_WALLET')
    )
);

CREATE TABLE IF NOT EXISTS user_bank_accounts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT,                           -- Logical ref: users.id
    agency_id BIGINT,                         -- Logical ref: agency_profiles.id
    mua_id BIGINT,                            -- Logical ref: mua_profiles.id
    bank_name VARCHAR(100) NOT NULL,
    bank_code VARCHAR(20) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_holder_name VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_code VARCHAR(50) UNIQUE NOT NULL,
    wallet_id BIGINT NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
    bank_account_id BIGINT NOT NULL REFERENCES user_bank_accounts(id) ON DELETE RESTRICT,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    fee DECIMAL(12, 2) DEFAULT 0.00 CHECK (fee >= 0),
    net_amount DECIMAL(15, 2) NOT NULL CHECK (net_amount > 0),
    status payout_status_enum DEFAULT 'PENDING',
    admin_note TEXT,
    processed_by_user_id BIGINT,              -- Logical ref: users.id
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_transactions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    payment_code VARCHAR(50) UNIQUE NOT NULL,
    booking_id BIGINT,                        -- Logical ref: bookings.id
    user_id BIGINT NOT NULL,                  -- Logical ref: users.id
    payment_gateway VARCHAR(30) NOT NULL,     -- MOMO, VNPAY, ZALOPAY, BANK_TRANSFER, CASH
    gateway_transaction_id VARCHAR(100),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    status VARCHAR(30) DEFAULT 'PENDING',     -- PENDING, SUCCESS, FAILED, REFUNDED
    payment_url TEXT,
    qr_code_url TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transaction_code VARCHAR(50) UNIQUE NOT NULL,
    booking_id BIGINT,                        -- Logical ref: bookings.id
    payment_transaction_id BIGINT REFERENCES payment_transactions(id) ON DELETE SET NULL,
    transaction_type transaction_type_enum NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    status VARCHAR(30) DEFAULT 'COMPLETED',   -- PENDING, COMPLETED, FAILED, REVERSED
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transaction_id BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    wallet_id BIGINT NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
    amount DECIMAL(15, 2) NOT NULL,
    balance_before DECIMAL(15, 2) NOT NULL,
    balance_after DECIMAL(15, 2) NOT NULL,
    frozen_balance_before DECIMAL(15, 2) NOT NULL,
    frozen_balance_after DECIMAL(15, 2) NOT NULL,
    entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('CREDIT', 'DEBIT', 'FREEZE', 'UNFREEZE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS ledger_entries (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transaction_id BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    debit_wallet_id BIGINT NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
    credit_wallet_id BIGINT NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'VND',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for payment_wallet_db
CREATE INDEX IF NOT EXISTS idx_user_bank_accounts_owner ON user_bank_accounts(user_id, agency_id, mua_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(wallet_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_txns_gateway ON payment_transactions(payment_gateway, gateway_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_booking ON transactions(booking_id, transaction_code);
CREATE INDEX IF NOT EXISTS idx_wallet_txns_wallet_time ON wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_debit_credit ON ledger_entries(debit_wallet_id, credit_wallet_id, created_at DESC);
