
ALTER TABLE booking_schema.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE booking_schema.bookings ADD CONSTRAINT bookings_status_check CHECK (
    status IN (
        'PENDING_DEPOSIT', 'REQUESTED', 'PENDING_AGENCY_DISPATCH', 'AGENCY_ASSIGNED', 
        'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 
        'COMPLETED', 'PAID_OUT', 'CANCELLED', 'CANCELLED_EXPIRED', 'EXPIRED',
        'DISPUTED', 'DISPUTE_REFUNDED', 'DISPUTE_COMPENSATED'
    )
);

-- 2. Cập nhật ràng buộc trạng thái tiền cọc Escrow (booking_deposits_status_check)
ALTER TABLE wallet_schema.booking_deposits DROP CONSTRAINT IF EXISTS booking_deposits_status_check;
ALTER TABLE wallet_schema.booking_deposits ADD CONSTRAINT booking_deposits_status_check CHECK (
    status IN (
        'UNPAID', 'PENDING', 'PAID', 'EXPIRED', 'REFUND_PENDING', 
        'REFUNDED', 'COMPENSATED_TO_MUA', 'FORFEITED', 'SPLIT_SETTLED', 'DISPUTED'
    )
);

-- 3. Cập nhật ràng buộc trạng thái giữ tiền ví (wallet_holds_status_check)
ALTER TABLE wallet_schema.wallet_holds DROP CONSTRAINT IF EXISTS wallet_holds_status_check;
ALTER TABLE wallet_schema.wallet_holds ADD CONSTRAINT wallet_holds_status_check CHECK (
    status IN ('ACTIVE', 'CONSUMED', 'RELEASED', 'REFUNDED', 'SPLIT_SETTLED', 'COMPENSATED_TO_MUA')
);

-- 4. Đồng bộ Trigger tự động giải phóng lịch thợ khi đơn bị hủy hoặc phân xử khiếu nại
CREATE OR REPLACE FUNCTION booking_schema.trg_release_mua_calendar_on_booking_cancellation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('CANCELLED', 'CANCELLED_EXPIRED', 'EXPIRED', 'DISPUTE_REFUNDED', 'DISPUTE_COMPENSATED') THEN
        DELETE FROM mua_schema.mua_calendars
        WHERE booking_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
