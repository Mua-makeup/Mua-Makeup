-- ==============================================================================
-- Migration: V20261002100500__Auto_Release_Mua_Calendars_On_Booking_Cancellation.sql
-- Description: Tự động giải phóng khung giờ bận trong mua_schema.mua_calendars
--              khi đơn hàng chuyển sang trạng thái hủy (CANCELLED, CANCELLED_EXPIRED)
-- ==============================================================================

CREATE OR REPLACE FUNCTION booking_schema.trg_release_mua_calendar_on_booking_cancellation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('CANCELLED', 'CANCELLED_EXPIRED') THEN
        DELETE FROM mua_schema.mua_calendars
        WHERE booking_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_release_mua_calendar_on_cancelled ON booking_schema.bookings;

CREATE TRIGGER trg_release_mua_calendar_on_cancelled
    AFTER INSERT OR UPDATE OF status ON booking_schema.bookings
    FOR EACH ROW
    EXECUTE FUNCTION booking_schema.trg_release_mua_calendar_on_booking_cancellation();
