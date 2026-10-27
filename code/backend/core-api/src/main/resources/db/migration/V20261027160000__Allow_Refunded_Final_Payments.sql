ALTER TABLE wallet_schema.payment_transactions DROP CONSTRAINT IF EXISTS chk_payment_application_status;
ALTER TABLE wallet_schema.payment_transactions ADD CONSTRAINT chk_payment_application_status
    CHECK (application_status IN ('PENDING', 'APPLIED', 'REFUND_REQUIRED', 'REVIEW_REQUIRED', 'REFUNDED'));
