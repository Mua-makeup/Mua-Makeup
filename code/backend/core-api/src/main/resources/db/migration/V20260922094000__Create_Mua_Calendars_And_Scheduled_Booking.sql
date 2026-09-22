-- ==============================================================================
-- Migration: V20260922094000__Create_Mua_Calendars_And_Scheduled_Booking.sql
-- Description: Khởi tạo bảng mua_calendars (TIMESTAMPTZ & GiST Constraint) và bổ sung cờ cron, hết hạn cọc
-- ==============================================================================

-- 0. KÍCH HOẠT EXTENSION BTREE_GIST ĐỂ HỖ TRỢ EXCLUSION CONSTRAINT TRÊN NHIỀU CỘT
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. BẢNG QUẢN LÝ LỊCH BẬN CÁ NHÂN & KHUNG GIỜ ĐÃ ĐẶT CỦA THỢ (MUA_SCHEMA - ISSUE-18.2)
CREATE TABLE IF NOT EXISTS mua_schema.mua_calendars (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mua_id BIGINT NOT NULL REFERENCES mua_schema.mua_profiles(id) ON DELETE CASCADE,
    booking_id BIGINT REFERENCES booking_schema.bookings(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_locked BOOLEAN DEFAULT TRUE NOT NULL,
    reason VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT check_time_range CHECK (end_at > start_at),
    -- [CHỐT CHẶN VẬT LÝ DATABASE DEFENSE-IN-DEPTH]:
    -- Ràng buộc này chống 100% Hard Overlap (trùng giờ dịch vụ thực tế) ở cấp CSDL.
    -- Khoảng đệm di chuyển 30m (Buffer Time Violation) được tầng Application kiểm tra.
    CONSTRAINT exclude_mua_overlapping_slots 
        EXCLUDE USING gist (
            mua_id WITH =,
            tstzrange(start_at, end_at) WITH &&
        )
);

-- 2. BỔ SUNG CỘT HẾT HẠN CỌC VÀ CỜ CRON NHẮC LỊCH TRÊN BẢNG BOOKINGS (ISSUE-18.1 & 18.3)
ALTER TABLE booking_schema.bookings 
    ADD COLUMN IF NOT EXISTS deposit_expired_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT FALSE NOT NULL,
    ADD COLUMN IF NOT EXISTS reminder_2h_sent BOOLEAN DEFAULT FALSE NOT NULL;

-- 3. CẬP NHẬT CHECK CONSTRAINT CỦA CỘT STATUS ĐỂ HỖ TRỢ PENDING_DEPOSIT VÀ CANCELLED_EXPIRED
ALTER TABLE booking_schema.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE booking_schema.bookings ADD CONSTRAINT bookings_status_check CHECK (
    status IN ('PENDING_DEPOSIT', 'REQUESTED', 'PENDING_AGENCY_DISPATCH', 'AGENCY_ASSIGNED', 
               'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 
               'COMPLETED', 'PAID_OUT', 'CANCELLED', 'CANCELLED_EXPIRED', 'DISPUTED')
);

-- 4. CHỈ MỤC TỐI ƯU TRUY VẤN GIAO THOA THỜI GIAN, GIẢI PHÓNG SLOT VÀ CRON TÁC VỤ
CREATE INDEX IF NOT EXISTS idx_mua_calendars_range 
    ON mua_schema.mua_calendars USING gist (mua_id, tstzrange(start_at, end_at));

CREATE INDEX IF NOT EXISTS idx_mua_calendars_date 
    ON mua_schema.mua_calendars(mua_id, booking_date);

CREATE INDEX IF NOT EXISTS idx_mua_calendars_booking_id 
    ON mua_schema.mua_calendars(booking_id);

CREATE INDEX IF NOT EXISTS idx_bookings_deposit_expired 
    ON booking_schema.bookings(status, deposit_expired_at) 
    WHERE status = 'PENDING_DEPOSIT';

CREATE INDEX IF NOT EXISTS idx_bookings_reminder_cron 
    ON booking_schema.bookings(status, booking_type, booking_date, start_time) 
    WHERE status = 'ACCEPTED' AND booking_type = 'SCHEDULED';

-- 5. BÌNH LUẬN GIẢI THÍCH SCHEMA
COMMENT ON TABLE mua_schema.mua_calendars IS 'Bảng quản lý lịch bận và khung giờ khóa của thợ make-up (Chuẩn TIMESTAMPTZ chống ca vắt ngày)';
COMMENT ON COLUMN booking_schema.bookings.deposit_expired_at IS 'Thời điểm hết hạn 15 phút giữ chỗ để thanh toán cọc';
COMMENT ON COLUMN booking_schema.bookings.reminder_24h_sent IS 'Cờ đánh dấu đã gửi thông báo nhắc lịch trước 24 giờ';
COMMENT ON COLUMN booking_schema.bookings.reminder_2h_sent IS 'Cờ đánh dấu đã gửi thông báo nhắc lịch trước 2 giờ';
