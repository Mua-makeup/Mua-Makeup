
ALTER TABLE wallet_schema.booking_deposits 
    DROP CONSTRAINT IF EXISTS booking_deposits_status_check;

ALTER TABLE wallet_schema.booking_deposits 
    ADD CONSTRAINT booking_deposits_status_check 
    CHECK (status IN ('UNPAID', 'PENDING', 'PAID', 'EXPIRED', 'REFUND_PENDING', 'REFUNDED', 'COMPENSATED_TO_MUA', 'FORFEITED'));
