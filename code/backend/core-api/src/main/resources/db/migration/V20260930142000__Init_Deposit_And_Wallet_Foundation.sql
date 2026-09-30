-- =============================================================================
-- V20260930142000__Init_Deposit_And_Wallet_Foundation.sql
-- NỀN TẢNG ĐẶT LỊCH MAKE-UP (MAKEUP BOOKING PLATFORM)
-- SPRINT 5 - MỐC 1: KHỞI TẠO CƠ SỞ DỮ LIỆU CỌC, VÍ, SỔ CÁI VÀ QUYẾT TOÁN
-- =============================================================================

-- ===========================================================================
-- 1. BỔ SUNG CỘT MỚI VÀO payment_transactions (BACKWARD COMPATIBLE)
--    Không xóa/đổi tên cột cũ, chỉ ADD COLUMN IF NOT EXISTS
-- ===========================================================================

ALTER TABLE wallet_schema.payment_transactions
    ADD COLUMN IF NOT EXISTS booking_id       BIGINT REFERENCES booking_schema.bookings(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS purpose          VARCHAR(30) DEFAULT 'TOP_UP',
    ADD COLUMN IF NOT EXISTS idempotency_key  VARCHAR(100),
    ADD COLUMN IF NOT EXISTS request_fingerprint VARCHAR(64),
    ADD COLUMN IF NOT EXISTS pricing_version  VARCHAR(20),
    ADD COLUMN IF NOT EXISTS application_status VARCHAR(30) DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS application_error TEXT,
    ADD COLUMN IF NOT EXISTS applied_at       TIMESTAMP WITH TIME ZONE;

ALTER TABLE wallet_schema.payment_transactions
    ADD CONSTRAINT chk_payment_application_status
        CHECK (application_status IN ('PENDING','APPLIED','REFUND_REQUIRED','REVIEW_REQUIRED'));

ALTER TABLE wallet_schema.payment_transactions
    ADD CONSTRAINT chk_payment_purpose
        CHECK (purpose IN ('TOP_UP','BOOKING_DEPOSIT'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_idempotency
    ON wallet_schema.payment_transactions(user_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_booking
    ON wallet_schema.payment_transactions(booking_id)
    WHERE booking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_success_not_applied
    ON wallet_schema.payment_transactions(created_at)
    WHERE status = 'SUCCESS' AND application_status = 'PENDING';

-- ===========================================================================
-- 2. BỔ SUNG CỘT MỚI VÀO bookings (BACKWARD COMPATIBLE)
-- ===========================================================================

ALTER TABLE booking_schema.bookings
    ADD COLUMN IF NOT EXISTS remaining_payment_method VARCHAR(20) DEFAULT NULL;

ALTER TABLE booking_schema.bookings
    ADD CONSTRAINT chk_booking_remaining_payment_method
        CHECK (remaining_payment_method IS NULL OR remaining_payment_method IN ('CASH','ONLINE'));

-- ===========================================================================
-- 3. BẢNG booking_deposits — MỘT NGHĨA VỤ CỌC / BOOKING (wallet_schema)
--    Một booking chỉ có một nghĩa vụ cọc (UNIQUE booking_id).
--    Nhiều lần thử payment nhưng chỉ một applied_payment_id.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS wallet_schema.booking_deposits (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id          BIGINT NOT NULL UNIQUE REFERENCES booking_schema.bookings(id) ON DELETE RESTRICT,
    required_amount     DECIMAL(12, 2) NOT NULL CHECK (required_amount > 0),
    paid_amount         DECIMAL(12, 2),
    status              VARCHAR(30) NOT NULL DEFAULT 'UNPAID'
        CHECK (status IN ('UNPAID','PENDING','PAID','EXPIRED','REFUND_PENDING','REFUNDED')),
    applied_payment_id  BIGINT REFERENCES wallet_schema.payment_transactions(id) ON DELETE SET NULL,
    pricing_version     VARCHAR(20),
    expires_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    paid_at             TIMESTAMP WITH TIME ZONE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_deposit_paid_consistency
        CHECK (
            status <> 'PAID'
            OR (paid_amount IS NOT NULL AND paid_at IS NOT NULL AND applied_payment_id IS NOT NULL)
        )
);

CREATE INDEX IF NOT EXISTS idx_booking_deposits_booking ON wallet_schema.booking_deposits(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_deposits_status  ON wallet_schema.booking_deposits(status);
CREATE INDEX IF NOT EXISTS idx_booking_deposits_expires ON wallet_schema.booking_deposits(expires_at)
    WHERE status IN ('UNPAID','PENDING');

-- ===========================================================================
-- 4. BẢNG wallets — MỘT VÍ / NGƯỜI DÙNG (wallet_schema)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS wallet_schema.wallets (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id             BIGINT NOT NULL UNIQUE REFERENCES auth_schema.users(id) ON DELETE RESTRICT,
    available_balance   DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (available_balance >= 0),
    frozen_balance      DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (frozen_balance >= 0),
    currency            VARCHAR(10) NOT NULL DEFAULT 'VND',
    version             BIGINT NOT NULL DEFAULT 0,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallet_schema.wallets(user_id);

-- ===========================================================================
-- 5. BẢNG wallet_holds — PHONG TỎA CỌC THEO BOOKING (wallet_schema)
--    Mô hình Escrow: giữ tiền cọc gắn với booking, chưa ghi có ví thợ.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS wallet_schema.wallet_holds (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    wallet_id   BIGINT NOT NULL REFERENCES wallet_schema.wallets(id) ON DELETE RESTRICT,
    booking_id  BIGINT NOT NULL REFERENCES booking_schema.bookings(id) ON DELETE RESTRICT,
    deposit_id  BIGINT REFERENCES wallet_schema.booking_deposits(id) ON DELETE SET NULL,
    amount      DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    status      VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE','CONSUMED','RELEASED','REFUNDED')),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    released_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_hold_booking_deposit UNIQUE (booking_id, deposit_id)
);

CREATE INDEX IF NOT EXISTS idx_wallet_holds_wallet  ON wallet_schema.wallet_holds(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_holds_booking ON wallet_schema.wallet_holds(booking_id);
CREATE INDEX IF NOT EXISTS idx_wallet_holds_active  ON wallet_schema.wallet_holds(wallet_id)
    WHERE status = 'ACTIVE';

-- ===========================================================================
-- 6. BẢNG ledger_entries — SỔ CÁI KÉP (wallet_schema)
--    Mỗi biến động tài chính = cặp bút toán DEBIT + CREDIT.
--    idempotency_key UNIQUE: tránh ghi sổ lặp khi retry.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS wallet_schema.ledger_entries (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reference_type    VARCHAR(50)  NOT NULL,
    reference_id      BIGINT       NOT NULL,
    wallet_id         BIGINT REFERENCES wallet_schema.wallets(id) ON DELETE RESTRICT,
    entry_type        VARCHAR(20)  NOT NULL CHECK (entry_type IN ('DEBIT','CREDIT')),
    amount            DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    balance_after     DECIMAL(15, 2),
    description       VARCHAR(255),
    idempotency_key   VARCHAR(100) NOT NULL,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_ledger_idempotency UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_ledger_wallet    ON wallet_schema.ledger_entries(wallet_id);
CREATE INDEX IF NOT EXISTS idx_ledger_reference ON wallet_schema.ledger_entries(reference_type, reference_id);

-- ===========================================================================
-- 7. BẢNG booking_settlements — QUYẾT TOÁN ĐƠN (wallet_schema)
--    Lưu T/D/C/F/E/N sau khi cả hai bên xác nhận tiền mặt.
--    Unique booking_id: một đơn chỉ có một lần quyết toán.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS wallet_schema.booking_settlements (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id              BIGINT NOT NULL UNIQUE REFERENCES booking_schema.bookings(id) ON DELETE RESTRICT,
    settlement_version      INT NOT NULL DEFAULT 1,
    total_amount            DECIMAL(12, 2) NOT NULL,
    deposit_amount          DECIMAL(12, 2) NOT NULL,
    cash_amount             DECIMAL(12, 2) NOT NULL,
    commission_amount       DECIMAL(12, 2) NOT NULL,
    freelancer_earnings     DECIMAL(12, 2) NOT NULL,
    wallet_credited_amount  DECIMAL(12, 2) NOT NULL,
    commission_rate         DECIMAL(5, 4)  NOT NULL,
    status                  VARCHAR(30) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING','SETTLED','PARTIAL','PENDING_FEE_COLLECTION','DISPUTED','FAILED')),
    settled_at              TIMESTAMP WITH TIME ZONE,
    failure_reason          TEXT,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_settlements_booking ON wallet_schema.booking_settlements(booking_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status  ON wallet_schema.booking_settlements(status);

-- ===========================================================================
-- 8. BẢNG booking_cash_receipts — XÁC NHẬN TIỀN MẶT HAI PHÍA (wallet_schema)
--    Khách và thợ xác nhận độc lập; quyết toán chỉ chạy khi cả hai khớp.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS wallet_schema.booking_cash_receipts (
    id                              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id                      BIGINT NOT NULL UNIQUE REFERENCES booking_schema.bookings(id) ON DELETE RESTRICT,
    invoice_version                 VARCHAR(20) NOT NULL,
    expected_amount                 DECIMAL(12, 2) NOT NULL CHECK (expected_amount > 0),
    customer_confirmed_at           TIMESTAMP WITH TIME ZONE,
    customer_user_id                BIGINT REFERENCES auth_schema.users(id) ON DELETE SET NULL,
    freelancer_confirmed_at         TIMESTAMP WITH TIME ZONE,
    freelancer_user_id              BIGINT REFERENCES auth_schema.users(id) ON DELETE SET NULL,
    status                          VARCHAR(30) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING','BOTH_CONFIRMED','DISPUTED','CANCELLED')),
    dispute_reason                  TEXT,
    idempotency_key_customer        VARCHAR(100),
    idempotency_key_freelancer      VARCHAR(100),
    created_at                      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at                      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cash_receipt_customer_idempotency
    ON wallet_schema.booking_cash_receipts(customer_user_id, idempotency_key_customer)
    WHERE idempotency_key_customer IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_cash_receipt_freelancer_idempotency
    ON wallet_schema.booking_cash_receipts(freelancer_user_id, idempotency_key_freelancer)
    WHERE idempotency_key_freelancer IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cash_receipts_booking ON wallet_schema.booking_cash_receipts(booking_id);
CREATE INDEX IF NOT EXISTS idx_cash_receipts_status  ON wallet_schema.booking_cash_receipts(status);
