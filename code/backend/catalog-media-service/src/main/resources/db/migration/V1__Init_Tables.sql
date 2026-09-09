-- =============================================================================
-- V1__Init_Tables.sql - catalog-media-service (catalog_media_db)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS master_service_categories (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_code VARCHAR(50) UNIQUE NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url TEXT
);

CREATE TABLE IF NOT EXISTS makeup_styles (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    style_code VARCHAR(50) UNIQUE NOT NULL,
    style_name VARCHAR(100) NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS service_packages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    master_category_id INT NOT NULL REFERENCES master_service_categories(id),
    agency_id BIGINT,          -- Logical ref: agency_profiles.id (user_profile_db)
    mua_id BIGINT,             -- Logical ref: mua_profiles.id (user_profile_db)
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

CREATE TABLE IF NOT EXISTS surcharges (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    agency_id BIGINT,          -- Logical ref: agency_profiles.id (user_profile_db)
    mua_id BIGINT,             -- Logical ref: mua_profiles.id (user_profile_db)
    surcharge_name VARCHAR(100) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
    is_active BOOLEAN DEFAULT TRUE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_packages_category_price ON service_packages(master_category_id, price, is_available);
CREATE INDEX IF NOT EXISTS idx_packages_agency ON service_packages(agency_id);
CREATE INDEX IF NOT EXISTS idx_packages_mua ON service_packages(mua_id);
CREATE INDEX IF NOT EXISTS idx_package_items_pkg_type ON package_items(package_id, item_type, is_active);
