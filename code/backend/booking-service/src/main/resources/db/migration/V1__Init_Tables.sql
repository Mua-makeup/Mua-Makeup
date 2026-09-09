-- =============================================================================
-- V1__Init_Tables.sql - booking-service (booking_dispatch_db)
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
    booking_code VARCHAR(30) UNIQUE NOT NULL,
    customer_id BIGINT NOT NULL,              -- Logical ref: users.id (user_profile_db)
    agency_id BIGINT,                         -- Logical ref: agency_profiles.id (user_profile_db)
    mua_id BIGINT,                            -- Logical ref: mua_profiles.id (user_profile_db)
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
    package_id BIGINT NOT NULL,               -- Logical ref: service_packages.id (catalog_media_db)
    package_name VARCHAR(150) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    quantity INT DEFAULT 1 CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS booking_history (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    from_status booking_status_enum,
    to_status booking_status_enum NOT NULL,
    changed_by_user_id BIGINT,                -- Logical ref: users.id (user_profile_db)
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS mua_calendars (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mua_id BIGINT NOT NULL,                   -- Logical ref: mua_profiles.id (user_profile_db)
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
    customer_id BIGINT NOT NULL,              -- Logical ref: users.id (user_profile_db)
    mua_id BIGINT,                            -- Logical ref: mua_profiles.id (user_profile_db)
    agency_id BIGINT,                         -- Logical ref: agency_profiles.id (user_profile_db)
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
    opened_by_user_id BIGINT NOT NULL,        -- Logical ref: users.id (user_profile_db)
    reason TEXT NOT NULL,
    evidence_images JSONB DEFAULT '[]'::jsonb,
    status dispute_status_enum DEFAULT 'OPENED',
    resolution_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_mua_date ON bookings(mua_id, booking_date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_agency_date ON bookings(agency_id, booking_date, status);
