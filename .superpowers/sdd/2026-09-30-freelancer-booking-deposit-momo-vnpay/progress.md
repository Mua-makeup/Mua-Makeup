# SDD ledger — plan: docs/superpowers/plans/2026-09-30-freelancer-booking-deposit-momo-vnpay.md

MERGE_BASE: 57b76fae185ead614c350fb715784c3bc859cd9a
Branch: feature/booking-deposit-payment

## Pre-flight Scan

| Check | Finding | Ruling |
|-------|---------|--------|
| Task 1 (Migration) to Task 2 (Entities) | T1 creates tables T2 maps; schema names must match | OK: wallet_schema for booking_deposits per plan section 4 |
| Task 3 (Wallet) to Task 5 (Webhook processor) | T3 produces wallet/hold entities; T5 writes them | Wallet entities must be committed before T5 |
| Task 4 (Intent API) depends on T2+T3 | BookingDepositEntity + wallets needed | Sequence enforced: T1->T2->T3->T4->T5 |
| Task 5 depends on T4 | IPN processor needs BookingDepositService | Sequence enforced |
| Task 7 (FreelancerWallet API) depends on T3 | Wallet repo needed | OK |
| Task 8 (Settlement) depends on T7 | BookingSettlement entity new | T8 after T7 |
| Tasks 9-11 (Mobile) depend on Backend API contract | Can read existing endpoints | Mobile starts after T4 is done |
| Plan section 6 says remove fake deposit confirm APIs | Existing /deposit and /confirm-deposit endpoints must be gated/removed | Ruling: return 410 GONE directing to new deposit-intents flow |
| pricing_version snapshot requirement | BookingEntity has no pricing_version field; needed in BookingDepositEntity | Add pricing_version to booking_deposits table in T1 |
| Idempotency-Key header contract | CreateDepositIntentReq must include idempotency_key; header handled at controller | Controller extracts from header, passes to service |
| N<0 case (settlement fee > deposit) | Plan says charge freelancer balance; complex edge | Ruling: Implement PENDING_FEE_COLLECTION status; skip auto-deduction in MVP |
| remaining_payment_method field | Not in BookingEntity; needed for cash flow | Add to bookings table in T1 |

## Pre-flight Rulings

1. Ruling: Remove mock deposit confirm — Return HTTP 410 Gone with message key booking.deposit_confirm_deprecated on old endpoints. Cost if wrong: old callers break; acceptable since plan mandates this.
2. Ruling: pricing_version in booking_deposits — Store as VARCHAR(20). Cost if wrong: version mismatch detection won't work properly; recoverable.
3. Ruling: N<0 MVP — Record as PENDING_FEE_COLLECTION, do not auto-deduct. Cost if wrong: platform loses small commission amount temporarily; acceptable for MVP.
4. Ruling: remaining_payment_method — Add nullable VARCHAR(20) DEFAULT NULL to bookings table. Cost if wrong: migration is additive-only, fully backward compatible.

## Task Log

