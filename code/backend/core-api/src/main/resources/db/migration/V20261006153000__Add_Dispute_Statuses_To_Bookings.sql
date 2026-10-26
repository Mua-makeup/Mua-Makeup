
ALTER TABLE booking_schema.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE booking_schema.bookings ADD CONSTRAINT bookings_status_check CHECK (
    status IN ('PENDING_DEPOSIT', 'REQUESTED', 'PENDING_AGENCY_DISPATCH', 'AGENCY_ASSIGNED', 
               'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 
               'COMPLETED', 'PAID_OUT', 'CANCELLED', 'CANCELLED_EXPIRED', 
               'DISPUTED', 'DISPUTE_REFUNDED', 'DISPUTE_COMPENSATED')
);

CREATE OR REPLACE FUNCTION booking_schema.trg_release_mua_calendar_on_booking_cancellation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('CANCELLED', 'CANCELLED_EXPIRED', 'DISPUTE_REFUNDED', 'DISPUTE_COMPENSATED') THEN
        DELETE FROM mua_schema.mua_calendars
        WHERE booking_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Cập nhật các đơn đã giải quyết khiếu nại trong quá khứ sang đúng trạng thái chuẩn
UPDATE booking_schema.bookings
SET status = 'DISPUTE_REFUNDED'
WHERE status = 'CANCELLED' 
  AND (cancellation_reason LIKE 'Admin phê duyệt khiếu nại hoàn cọc%' 
       OR cancellation_reason LIKE 'Admin phê duyệt hoàn 100% cọc%');

UPDATE booking_schema.bookings
SET status = 'DISPUTE_COMPENSATED'
WHERE status = 'PAID_OUT' 
  AND (cancellation_reason LIKE 'Admin phê duyệt bồi thường cho thợ%' 
       OR cancellation_reason LIKE 'Admin phê duyệt bồi thường cọc cho thợ%');
