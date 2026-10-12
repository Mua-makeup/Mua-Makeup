
ALTER TABLE booking_schema.booking_staff_assignments
    ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5, 2) DEFAULT 0.00 CHECK (commission_rate >= 0.00 AND commission_rate <= 100.00),
    ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(15, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS commission_note TEXT,
    ADD COLUMN IF NOT EXISTS payout_status VARCHAR(20) DEFAULT 'PENDING' NOT NULL CHECK (payout_status IN ('PENDING', 'SETTLED', 'CANCELLED')),
    ADD COLUMN IF NOT EXISTS payout_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN booking_schema.booking_staff_assignments.commission_rate IS 'Tỷ lệ % hoa hồng thợ được hưởng trong ca làm này';
COMMENT ON COLUMN booking_schema.booking_staff_assignments.commission_amount IS 'Số tiền hoa hồng tính ra (VNĐ) cho thợ trong ca';
COMMENT ON COLUMN booking_schema.booking_staff_assignments.commission_note IS 'Lý do / căn cứ phân chia hoa hồng cho thợ này';
COMMENT ON COLUMN booking_schema.booking_staff_assignments.payout_status IS 'Trạng thái giải ngân hoa hồng vào ví: PENDING, SETTLED, CANCELLED';
COMMENT ON COLUMN booking_schema.booking_staff_assignments.payout_at IS 'Thời điểm hoàn tất chuyển tiền hoa hồng vào ví thợ';
