-- =============================================================================
-- V1__Init_Tables.sql - agency-operations-service (agency_operations_db)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS agency_staff (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    agency_id BIGINT NOT NULL, -- Logical ref: agency_profiles.id (user_profile_db)
    mua_id BIGINT NOT NULL,    -- Logical ref: mua_profiles.id (user_profile_db)
    agreed_commission_rate DECIMAL(5, 2),
    is_active BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (agency_id, mua_id)
);

CREATE TABLE IF NOT EXISTS agency_staff_services (
    staff_id BIGINT REFERENCES agency_staff(id) ON DELETE CASCADE,
    package_id BIGINT NOT NULL, -- Logical ref: service_packages.id (catalog_media_db)
    proficiency_level VARCHAR(30) DEFAULT 'PRIMARY_MUA',
    is_qualified BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (staff_id, package_id)
);

CREATE TABLE IF NOT EXISTS agency_staff_styles (
    staff_id BIGINT REFERENCES agency_staff(id) ON DELETE CASCADE,
    style_id INT NOT NULL,      -- Logical ref: makeup_styles.id (catalog_media_db)
    is_qualified BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (staff_id, style_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agency_staff_styles ON agency_staff_styles(staff_id, style_id, is_qualified);
