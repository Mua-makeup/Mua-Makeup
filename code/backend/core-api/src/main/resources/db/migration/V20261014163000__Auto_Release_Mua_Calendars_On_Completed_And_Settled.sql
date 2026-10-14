-- ==============================================================================
-- Migration: V20261014163000__Auto_Release_Mua_Calendars_On_Completed_And_Settled.sql
-- Description: Tự động giải phóng khung giờ khóa mua_calendars khi đơn hàng
--              hoàn thành (COMPLETED), đã quyết toán (PAID_OUT) hoặc bị hủy/hoàn tiền.
--              Đồng thời dọn sạch các slot cũ còn sót lại của các đơn đã hoàn tất.
-- ==============================================================================

-- 1. Nâng cấp trigger tự động giải phóng lịch khi đơn COMPLETED, PAID_OUT, CANCELLED...
CREATE OR REPLACE FUNCTION booking_schema.trg_release_mua_calendar_on_booking_cancellation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('CANCELLED', 'CANCELLED_EXPIRED', 'COMPLETED', 'PAID_OUT', 'DISPUTE_REFUNDED') THEN
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

-- 2. Dọn sạch các slot mua_calendars cũ còn sót lại của các đơn đã hoàn tất/quyết toán/hủy
DELETE FROM mua_schema.mua_calendars c
USING booking_schema.bookings b
WHERE c.booking_id = b.id
  AND b.status IN ('CANCELLED', 'CANCELLED_EXPIRED', 'PENDING_DEPOSIT', 'COMPLETED', 'PAID_OUT', 'DISPUTE_REFUNDED');
