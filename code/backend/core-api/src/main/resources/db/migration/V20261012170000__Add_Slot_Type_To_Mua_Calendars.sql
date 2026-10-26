-- Thêm cột slot_type vào bảng mua_schema.mua_calendars để phân biệt lý do khóa lịch
ALTER TABLE mua_schema.mua_calendars 
    ADD COLUMN IF NOT EXISTS slot_type VARCHAR(50) DEFAULT 'PERSONAL_BLOCKED' NOT NULL;

-- Cập nhật dữ liệu cũ: nếu có booking_id thì phân loại theo tính chất đơn hàng
UPDATE mua_schema.mua_calendars 
SET slot_type = CASE 
    WHEN reason LIKE '%ASSIGNED_%' THEN 'AGENCY_ASSIGNED'
    WHEN booking_id IS NOT NULL THEN 'BOOKING'
    ELSE 'PERSONAL_BLOCKED'
END;

COMMENT ON COLUMN mua_schema.mua_calendars.slot_type IS 'Loại khóa lịch: PERSONAL_BLOCKED (bận cá nhân), BOOKING (khách đặt lịch), AGENCY_ASSIGNED (studio phân công)';
