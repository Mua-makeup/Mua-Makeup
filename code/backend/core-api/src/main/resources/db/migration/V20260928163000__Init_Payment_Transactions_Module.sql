-- =============================================================================
-- V20260928163000__Init_Payment_Transactions_Module.sql
-- NỀN TẢNG ĐẶT LỊCH MAKE-UP (MAKEUP BOOKING PLATFORM)
-- SPRINT 5 - MỐC 1: KHỞI TẠO BẢNG GIAO DỊCH CỔNG THANH TOÁN (PAYMENT TRANSACTIONS)
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS wallet_schema;

-- 1. BẢNG GIAO DỊCH CỔNG THANH TOÁN (Nạp ví qua VNPay, MoMo)
CREATE TABLE IF NOT EXISTS wallet_schema.payment_transactions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    payment_code VARCHAR(50) UNIQUE NOT NULL,
    user_id BIGINT NOT NULL REFERENCES auth_schema.users(id) ON DELETE RESTRICT,
    payment_gateway VARCHAR(30) NOT NULL,
    gateway_request_id VARCHAR(100),
    gateway_transaction_id VARCHAR(100),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
    wallet_posting_status VARCHAR(30) NOT NULL DEFAULT 'NOT_POSTED' CHECK (wallet_posting_status IN ('NOT_POSTED', 'POSTED')),
    payment_url TEXT,
    qr_code_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    wallet_posted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_posted_payment_success CHECK (wallet_posting_status <> 'POSTED' OR (status = 'SUCCESS' AND wallet_posted_at IS NOT NULL))
);

-- 2. CÁC INDEX TỐI ƯU HÓA TRUY VẤN VÀ ĐẢM BẢO IDEMPOTENCY
CREATE INDEX IF NOT EXISTS idx_payment_txns_gateway ON wallet_schema.payment_transactions(payment_gateway, gateway_transaction_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_gateway_request ON wallet_schema.payment_transactions(payment_gateway, gateway_request_id)
    WHERE gateway_request_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_gateway_transaction ON wallet_schema.payment_transactions(payment_gateway, gateway_transaction_id)
    WHERE gateway_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_unposted ON wallet_schema.payment_transactions(created_at)
    WHERE status = 'SUCCESS' AND wallet_posting_status = 'NOT_POSTED';
