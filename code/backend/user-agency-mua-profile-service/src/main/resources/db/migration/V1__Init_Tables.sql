-- =============================================================================
-- V1__Init_Tables.sql - user-agency-mua-profile-service (user_profile_db)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
    name VARCHAR(50) UNIQUE NOT NULL,
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
    permission_code VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    UNIQUE (role_id, permission_code)
);

CREATE TABLE IF NOT EXISTS agency_profiles (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    agency_code VARCHAR(30) UNIQUE NOT NULL,
    agency_name VARCHAR(150) NOT NULL,
    logo_url TEXT,
    hotline VARCHAR(20) NOT NULL,
    address_street TEXT NOT NULL,
    district VARCHAR(50) NOT NULL,
    city VARCHAR(50) NOT NULL,
    commission_rate_internal DECIMAL(5, 2) DEFAULT 30.00,
    is_verified BOOLEAN DEFAULT FALSE,
    rating_avg DECIMAL(3, 2) DEFAULT 5.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS mua_profiles (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mua_code VARCHAR(30) UNIQUE NOT NULL,
    bio TEXT,
    experience_years INT DEFAULT 1,
    portfolio_images JSONB DEFAULT '[]'::jsonb,
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
    style_id INT NOT NULL, -- Logical ref: makeup_styles.id (catalog_media_db)
    is_qualified BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (mua_id, style_id)
);
COMMENT ON TABLE mua_styles IS 'Bảng gán kỹ năng Tone Make-up trực tiếp cho Thợ trang điểm';

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_role_permissions_lookup ON role_permissions(role_id, permission_code);
CREATE INDEX IF NOT EXISTS idx_mua_online_status ON mua_profiles(is_online, is_busy);
CREATE INDEX IF NOT EXISTS idx_mua_styles ON mua_styles(mua_id, style_id, is_qualified);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON in_app_notifications(user_id, is_read, created_at DESC);
