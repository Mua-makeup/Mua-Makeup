
ALTER TABLE wallet_schema.payment_transactions
    DROP CONSTRAINT IF EXISTS chk_payment_purpose;

ALTER TABLE wallet_schema.payment_transactions
    ADD CONSTRAINT chk_payment_purpose
        CHECK (purpose IN ('TOP_UP', 'BOOKING_DEPOSIT', 'BOOKING_FINAL_PAYMENT'));
