-- =============================================================================
-- V1__Init_Tables.sql - payment-service (payment_wallet_db)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE wallet_type_enum AS ENUM ('CUSTOMER_WALLET', 'FREELANCER_WALLET', 'AGENCY_WALLET', 'SYSTEM_PLATFORM_WALLET');
CREATE TYPE transaction_type_enum AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'ESCROW_LOCK', 'ESCROW_RELEASE', 'PLATFORM_COMMISSION', 'REFUND', 'TIP');
CREATE TYPE payout_status_enum AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'REJECTED');

CREATE TABLE IF NOT EXISTS wallets (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT,                           -- Logical ref: users.id (user_profile_db)
    agency_id BIGINT,                         -- Logical ref: agency_profiles.id (user_profile_db)
    mua_id BIGINT,                            -- Logical ref: mua_profiles.id (user_profile_db)
    wallet_type wallet_type_enum NOT NULL,
    balance DECIMAL(15, 2) DEFAULT 0.00 CHECK (balance >= 0),
    frozen_balance DECIMAL(15, 2) DEFAULT 0.00 CHECK (frozen_balance >= 0),
    currency VARCHAR(3) DEFAULT 'VND',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT check_wallet_owner CHECK (
        (wallet_type = 'CUSTOMER_WALLET' AND user_id IS NOT NULL) OR
        (wallet_type = 'FREELANCER_WALLET' AND mua_id IS NOT NULL) OR
        (wallet_type = 'AGENCY_WALLET' AND agency_id IS NOT NULL) OR
        (wallet_type = 'SYSTEM_PLATFORM_WALLET')
    )
);

CREATE TABLE IF NOT EXISTS user_bank_accounts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT,                           -- Logical ref: users.id (user_profile_db)
    agency_id BIGINT,                         -- Logical ref: agency_profiles.id (user_profile_db)
    mua_id BIGINT,                            -- Logical ref: mua_profiles.id (user_profile_db)
    bank_name VARCHAR(100) NOT NULL,
    bank_code VARCHAR(20) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_holder_name VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_code VARCHAR(50) UNIQUE NOT NULL,
    wallet_id BIGINT NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
    bank_account_id BIGINT NOT NULL REFERENCES user_bank_accounts(id) ON DELETE RESTRICT,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    fee DECIMAL(12, 2) DEFAULT 0.00 CHECK (fee >= 0),
    net_amount DECIMAL(15, 2) NOT NULL CHECK (net_amount > 0),
    status payout_status_enum DEFAULT 'PENDING',
    admin_note TEXT,
    processed_by_user_id BIGINT,              -- Logical ref: users.id (user_profile_db)
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_transactions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    payment_code VARCHAR(50) UNIQUE NOT NULL,
    booking_id BIGINT,                        -- Logical ref: bookings.id (booking_dispatch_db)
    user_id BIGINT NOT NULL,                  -- Logical ref: users.id (user_profile_db)
    payment_gateway VARCHAR(30) NOT NULL,     -- MOMO, VNPAY, ZALOPAY, BANK_TRANSFER, CASH
    gateway_transaction_id VARCHAR(100),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    status VARCHAR(30) DEFAULT 'PENDING',     -- PENDING, SUCCESS, FAILED, REFUNDED
    payment_url TEXT,
    qr_code_url TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transaction_code VARCHAR(50) UNIQUE NOT NULL,
    booking_id BIGINT,                        -- Logical ref: bookings.id (booking_dispatch_db)
    payment_transaction_id BIGINT REFERENCES payment_transactions(id) ON DELETE SET NULL,
    transaction_type transaction_type_enum NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    status VARCHAR(30) DEFAULT 'COMPLETED',   -- PENDING, COMPLETED, FAILED, REVERSED
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transaction_id BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    wallet_id BIGINT NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
    amount DECIMAL(15, 2) NOT NULL,
    balance_before DECIMAL(15, 2) NOT NULL,
    balance_after DECIMAL(15, 2) NOT NULL,
    frozen_balance_before DECIMAL(15, 2) NOT NULL,
    frozen_balance_after DECIMAL(15, 2) NOT NULL,
    entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('CREDIT', 'DEBIT', 'FREEZE', 'UNFREEZE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS ledger_entries (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transaction_id BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    debit_wallet_id BIGINT NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
    credit_wallet_id BIGINT NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'VND',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_bank_accounts_owner ON user_bank_accounts(user_id, agency_id, mua_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(wallet_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_txns_gateway ON payment_transactions(payment_gateway, gateway_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_booking ON transactions(booking_id, transaction_code);
CREATE INDEX IF NOT EXISTS idx_wallet_txns_wallet_time ON wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_debit_credit ON ledger_entries(debit_wallet_id, credit_wallet_id, created_at DESC);
