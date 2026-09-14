-- =============================================================================
-- V8__Add_Updated_At_To_Booking_Trips.sql
-- NỀN TẢNG ĐẶT LỊCH MAKE-UP (MAKEUP BOOKING PLATFORM)
-- BỔ SUNG CỘT updated_at CHO BẢNG telemetry_schema.booking_trips (ĐỒNG BỘ BaseEntity)
-- =============================================================================

ALTER TABLE telemetry_schema.booking_trips 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL;
