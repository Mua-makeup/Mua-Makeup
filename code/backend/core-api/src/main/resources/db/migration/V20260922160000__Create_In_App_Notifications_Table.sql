-- =============================================================================
-- V20260922160000__Create_In_App_Notifications_Table.sql
-- NỀN TẢNG ĐẶT LỊCH MAKE-UP (MAKEUP BOOKING PLATFORM)
-- TẠO BẢNG THÔNG BÁO IN-APP (interaction_schema.in_app_notifications)
-- ĐỒNG BỘ ĐA NỀN TẢNG (WEB, MOBILE APP, CHỦ STUDIO, KHÁCH HÀNG, THỢ MUA)
-- =============================================================================

CREATE TABLE IF NOT EXISTS interaction_schema.in_app_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES auth_schema.users(id) ON DELETE CASCADE,
    agency_id BIGINT REFERENCES agency_schema.agency_profiles(id) ON DELETE CASCADE,
    booking_id BIGINT REFERENCES booking_schema.bookings(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    metadata JSONB,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Index tra cứu phân trang và lọc theo trạng thái đã đọc
CREATE INDEX IF NOT EXISTS idx_notifications_agency_id_created 
    ON interaction_schema.in_app_notifications(agency_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created 
    ON interaction_schema.in_app_notifications(user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_booking_id 
    ON interaction_schema.in_app_notifications(booking_id);

COMMENT ON TABLE interaction_schema.in_app_notifications IS 'Bảng lưu trữ thông báo in-app dùng chung cho cả Web SPA và Mobile App';
COMMENT ON COLUMN interaction_schema.in_app_notifications.type IS 'Loại thông báo (NEW_BOOKING, BOOKING_CONFIRMED, BOOKING_CANCELLED...)';
COMMENT ON COLUMN interaction_schema.in_app_notifications.metadata IS 'Dữ liệu JSON kèm theo để điều hướng deep link trên Web và Mobile';
