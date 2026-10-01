# Task 1 Brief: Flyway Migration — Deposit, Wallet, Settlement Tables

## Context

This is Task 1 of 11 in the implementation plan for "Freelancer Booking Deposit MoMo/VNPay". You are implementing the database foundation.

**Plan:** `docs/superpowers/plans/2026-09-30-freelancer-booking-deposit-momo-vnpay.md`

**Branch:** `feature/booking-deposit-payment`

## Global Constraints

- Spring Boot Monolith: 1 app, 1 PostgreSQL DB (`makeup_platform_db`), 8 schemas
- Flyway migrations MUST use timestamp naming: `V<YYYYMMDDHHmmss>__<Mo_ta>.sql`
- NEVER use sequential V7, V8... naming — causes merge conflicts
- All new migrations in `code/backend/core-api/src/main/resources/db/migration/`
- `spring.flyway.out-of-order=true` is configured
- ALL new columns must be backward-compatible (nullable or have DEFAULT) — never break existing data
- No hardcoding secrets; reference schema names exactly as used in existing migrations

## Existing Migration Files (latest)

- `V20260929140000__Create_Customer_Saved_Addresses.sql` — most recent
- `V20260928163000__Init_Payment_Transactions_Module.sql` — creates `wallet_schema.payment_transactions`

## Existing payment_transactions Schema

```sql
wallet_schema.payment_transactions:
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payment_code VARCHAR(50) UNIQUE NOT NULL,
  user_id BIGINT REFERENCES auth_schema.users(id),
  payment_gateway VARCHAR(30) NOT NULL,
  gateway_request_id VARCHAR(100),
  gateway_transaction_id VARCHAR(100),
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  status VARCHAR(30) DEFAULT 'PENDING' CHECK IN ('PENDING','SUCCESS','FAILED'),
  wallet_posting_status VARCHAR(30) DEFAULT 'NOT_POSTED' CHECK IN ('NOT_POSTED','POSTED'),
  payment_url TEXT, qr_code_url TEXT, expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ, wallet_posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
```

## Existing bookings Schema (booking_schema.bookings)

Key columns already exist: id, booking_code, customer_id, mua_id, agency_id, package_id, style_id,
booking_type, booking_partner, status VARCHAR(30), destination_address, destination_latitude,
destination_longitude, booking_date, start_time, service_subtotal, distance_fee, surcharge_fee,
surge_multiplier, discount_amount, total_amount, deposit_amount, deposit_expired_at, version,
completion_photo_url, cancellation_reason, reminder_24h_sent, reminder_2h_sent

## What to Build

Create ONE migration file: `V20260930142000__Init_Deposit_And_Wallet_Foundation.sql`

### 1. Alter payment_transactions (wallet_schema) — ADD new columns only

```sql
-- Add these nullable columns to avoid breaking existing data:
ALTER TABLE wallet_schema.payment_transactions
  ADD COLUMN IF NOT EXISTS booking_id BIGINT REFERENCES booking_schema.bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS purpose VARCHAR(30) DEFAULT 'TOP_UP',
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100),
  ADD COLUMN IF NOT EXISTS request_fingerprint VARCHAR(64),
  ADD COLUMN IF NOT EXISTS pricing_version VARCHAR(20),
  ADD COLUMN IF NOT EXISTS application_status VARCHAR(30) DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS application_error TEXT,
  ADD COLUMN IF NOT EXISTS applied_at TIMESTAMP WITH TIME ZONE;

-- Constraint on application_status values:
ALTER TABLE wallet_schema.payment_transactions
  ADD CONSTRAINT chk_payment_application_status
    CHECK (application_status IN ('PENDING','APPLIED','REFUND_REQUIRED','REVIEW_REQUIRED'));

-- Constraint on purpose values:
ALTER TABLE wallet_schema.payment_transactions
  ADD CONSTRAINT chk_payment_purpose
    CHECK (purpose IN ('TOP_UP','BOOKING_DEPOSIT'));

-- Unique index on idempotency_key per user:
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_idempotency
  ON wallet_schema.payment_transactions(user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Index for booking lookups:
CREATE INDEX IF NOT EXISTS idx_payment_booking
  ON wallet_schema.payment_transactions(booking_id)
  WHERE booking_id IS NOT NULL;

-- Index for SUCCESS not yet applied:
CREATE INDEX IF NOT EXISTS idx_payment_success_not_applied
  ON wallet_schema.payment_transactions(created_at)
  WHERE status = 'SUCCESS' AND application_status = 'PENDING';
```

### 2. Alter bookings table (booking_schema.bookings) — ADD new columns only

```sql
-- remaining_payment_method: only set when customer confirms cash payment method
ALTER TABLE booking_schema.bookings
  ADD COLUMN IF NOT EXISTS remaining_payment_method VARCHAR(20) DEFAULT NULL;

ALTER TABLE booking_schema.bookings
  ADD CONSTRAINT chk_booking_remaining_payment_method
    CHECK (remaining_payment_method IS NULL OR remaining_payment_method IN ('CASH','ONLINE'));
```

### 3. Create booking_deposits table (wallet_schema)

One deposit obligation per booking. Multiple payment attempts allowed but only one applied.

```sql
CREATE TABLE IF NOT EXISTS wallet_schema.booking_deposits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  booking_id BIGINT NOT NULL UNIQUE REFERENCES booking_schema.bookings(id) ON DELETE RESTRICT,
  required_amount DECIMAL(12, 2) NOT NULL CHECK (required_amount > 0),
  paid_amount DECIMAL(12, 2),
  status VARCHAR(30) NOT NULL DEFAULT 'UNPAID'
    CHECK (status IN ('UNPAID','PENDING','PAID','EXPIRED','REFUND_PENDING','REFUNDED')),
  applied_payment_id BIGINT REFERENCES wallet_schema.payment_transactions(id) ON DELETE SET NULL,
  pricing_version VARCHAR(20),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT chk_deposit_paid_consistency
    CHECK (status <> 'PAID' OR (paid_amount IS NOT NULL AND paid_at IS NOT NULL AND applied_payment_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_booking_deposits_booking ON wallet_schema.booking_deposits(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_deposits_status ON wallet_schema.booking_deposits(status);
CREATE INDEX IF NOT EXISTS idx_booking_deposits_expires ON wallet_schema.booking_deposits(expires_at)
  WHERE status IN ('UNPAID','PENDING');
```

### 4. Create wallets table (wallet_schema)

One wallet per user. Available + frozen balance tracking.

```sql
CREATE TABLE IF NOT EXISTS wallet_schema.wallets (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES auth_schema.users(id) ON DELETE RESTRICT,
  available_balance DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (available_balance >= 0),
  frozen_balance DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (frozen_balance >= 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'VND',
  version BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallet_schema.wallets(user_id);
```

### 5. Create wallet_holds table (wallet_schema)

Tracks deposit amounts held per booking (escrow-style). This is what the plan calls "hold".

```sql
CREATE TABLE IF NOT EXISTS wallet_schema.wallet_holds (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  wallet_id BIGINT NOT NULL REFERENCES wallet_schema.wallets(id) ON DELETE RESTRICT,
  booking_id BIGINT NOT NULL REFERENCES booking_schema.bookings(id) ON DELETE RESTRICT,
  deposit_id BIGINT REFERENCES wallet_schema.booking_deposits(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','CONSUMED','RELEASED','REFUNDED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  released_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT uq_hold_booking_deposit UNIQUE (booking_id, deposit_id)
);

CREATE INDEX IF NOT EXISTS idx_wallet_holds_wallet ON wallet_schema.wallet_holds(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_holds_booking ON wallet_schema.wallet_holds(booking_id);
CREATE INDEX IF NOT EXISTS idx_wallet_holds_active ON wallet_schema.wallet_holds(wallet_id)
  WHERE status = 'ACTIVE';
```

### 6. Create ledger_entries table (wallet_schema)

Double-entry accounting ledger. Every financial movement has two entries (debit + credit).

```sql
CREATE TABLE IF NOT EXISTS wallet_schema.ledger_entries (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reference_type VARCHAR(50) NOT NULL,
  reference_id BIGINT NOT NULL,
  wallet_id BIGINT REFERENCES wallet_schema.wallets(id) ON DELETE RESTRICT,
  entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('DEBIT','CREDIT')),
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  balance_after DECIMAL(15, 2),
  description VARCHAR(255),
  idempotency_key VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT uq_ledger_idempotency UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_ledger_wallet ON wallet_schema.ledger_entries(wallet_id);
CREATE INDEX IF NOT EXISTS idx_ledger_reference ON wallet_schema.ledger_entries(reference_type, reference_id);
```

### 7. Create booking_settlements table (wallet_schema)

One settlement per booking. Records T/D/C/F/E/N values after cash confirmation.

```sql
CREATE TABLE IF NOT EXISTS wallet_schema.booking_settlements (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  booking_id BIGINT NOT NULL UNIQUE REFERENCES booking_schema.bookings(id) ON DELETE RESTRICT,
  settlement_version INT NOT NULL DEFAULT 1,
  total_amount DECIMAL(12, 2) NOT NULL,
  deposit_amount DECIMAL(12, 2) NOT NULL,
  cash_amount DECIMAL(12, 2) NOT NULL,
  commission_amount DECIMAL(12, 2) NOT NULL,
  freelancer_earnings DECIMAL(12, 2) NOT NULL,
  wallet_credited_amount DECIMAL(12, 2) NOT NULL,
  commission_rate DECIMAL(5, 4) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','SETTLED','PARTIAL','PENDING_FEE_COLLECTION','DISPUTED','FAILED')),
  settled_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_settlements_booking ON wallet_schema.booking_settlements(booking_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON wallet_schema.booking_settlements(status);
```

### 8. Create booking_cash_receipts table (wallet_schema)

Tracks cash confirmation from both sides before settlement.

```sql
CREATE TABLE IF NOT EXISTS wallet_schema.booking_cash_receipts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  booking_id BIGINT NOT NULL UNIQUE REFERENCES booking_schema.bookings(id) ON DELETE RESTRICT,
  invoice_version VARCHAR(20) NOT NULL,
  expected_amount DECIMAL(12, 2) NOT NULL CHECK (expected_amount > 0),
  customer_confirmed_at TIMESTAMP WITH TIME ZONE,
  customer_user_id BIGINT REFERENCES auth_schema.users(id) ON DELETE SET NULL,
  freelancer_confirmed_at TIMESTAMP WITH TIME ZONE,
  freelancer_user_id BIGINT REFERENCES auth_schema.users(id) ON DELETE SET NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','BOTH_CONFIRMED','DISPUTED','CANCELLED')),
  dispute_reason TEXT,
  idempotency_key_customer VARCHAR(100),
  idempotency_key_freelancer VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cash_receipt_customer_idempotency
  ON wallet_schema.booking_cash_receipts(customer_user_id, idempotency_key_customer)
  WHERE idempotency_key_customer IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_cash_receipt_freelancer_idempotency
  ON wallet_schema.booking_cash_receipts(freelancer_user_id, idempotency_key_freelancer)
  WHERE idempotency_key_freelancer IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cash_receipts_booking ON wallet_schema.booking_cash_receipts(booking_id);
CREATE INDEX IF NOT EXISTS idx_cash_receipts_status ON wallet_schema.booking_cash_receipts(status);
```

## Steps

- [ ] Create the migration file at the exact path: `code/backend/core-api/src/main/resources/db/migration/V20260930142000__Init_Deposit_And_Wallet_Foundation.sql`
- [ ] Write all 8 DDL sections above into it, in order, with clear section comment headers
- [ ] Verify the file compiles logically: no forward references, constraints reference columns that exist in same file
- [ ] Run Gradle compile to verify no syntax errors in project: `./gradlew compileJava -p code/backend/core-api` (compile should succeed since this is SQL, not Java — just confirm the file is syntactically coherent by reviewing manually)
- [ ] Commit: `git add code/backend/core-api/src/main/resources/db/migration/V20260930142000__Init_Deposit_And_Wallet_Foundation.sql && git commit -m "feat(db): add deposit/wallet/settlement foundation migration"`

## What NOT to do

- Do NOT modify existing migration files
- Do NOT rename existing columns
- Do NOT add NOT NULL columns without DEFAULT to existing tables
- Do NOT create any Java files — this task is SQL only
- Do NOT run the app — just create the migration file and compile Java

## Report Contract

Write your report to: `.superpowers/sdd/2026-09-30-freelancer-booking-deposit-momo-vnpay/task-1-report.md`

Return in your final message:
- Status: DONE / DONE_WITH_CONCERNS / BLOCKED
- Commits: (git short hashes)
- Summary: one line
- Concerns: any deviations from above spec
