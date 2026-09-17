-- ==============================================================================
-- Migration: V20260916162000__Create_Booking_And_History_Tables.sql
-- Description: Khởi tạo bảng bookings và booking_history cho phân hệ Booking State Machine
-- ==============================================================================

CREATE SCHEMA IF NOT EXISTS booking_schema;

-- 1. BẢNG ĐƠN HÀNG CHÍNH (BOOKINGS)
CREATE TABLE IF NOT EXISTS booking_schema.bookings (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_code VARCHAR(30) UNIQUE NOT NULL,
    customer_id BIGINT NOT NULL REFERENCES auth_schema.users(id) ON DELETE RESTRICT,
    agency_id BIGINT REFERENCES agency_schema.agency_profiles(id) ON DELETE SET NULL,
    mua_id BIGINT REFERENCES mua_schema.mua_profiles(id) ON DELETE SET NULL,
    
    booking_type VARCHAR(30) NOT NULL CHECK (booking_type IN ('REALTIME_INSTANT', 'SCHEDULED')),
    booking_partner VARCHAR(30) NOT NULL CHECK (booking_partner IN ('FREELANCER_DIRECT', 'AGENCY_DISPATCH')),
    status VARCHAR(30) DEFAULT 'REQUESTED' NOT NULL CHECK (
        status IN ('REQUESTED', 'PENDING_AGENCY_DISPATCH', 'AGENCY_ASSIGNED', 
                   'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 
                   'COMPLETED', 'PAID_OUT', 'CANCELLED', 'DISPUTED')
    ),
    
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
    deposit_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    
    completion_photo_url TEXT,
    cancellation_reason TEXT,
    version BIGINT DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. BẢNG NHẬT KÝ LỊCH SỬ BIẾN ĐỘNG TRẠNG THÁI ĐƠN HÀNG (ISSUE-16.2)
CREATE TABLE IF NOT EXISTS booking_schema.booking_history (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES booking_schema.bookings(id) ON DELETE CASCADE,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    changed_by_user_id BIGINT REFERENCES auth_schema.users(id) ON DELETE SET NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- CHỈ MỤC TỐI ƯU TRUY VẤN
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON booking_schema.bookings(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_mua ON booking_schema.bookings(mua_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_agency ON booking_schema.bookings(agency_id, status);
CREATE INDEX IF NOT EXISTS idx_booking_history_order ON booking_schema.booking_history(booking_id, created_at ASC);
