package com.makeup.platform.service.booking;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.booking.*;
import com.makeup.platform.entity.payment.BookingDepositEntity;
import com.makeup.platform.entity.wallet.*;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.payment.*;
import com.makeup.platform.repository.wallet.*;
import com.makeup.platform.service.wallet.BookingSettlementService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.*;

/** Shared financial rules for studio, customer acceptance and escalated admin decisions.
 * Callers must hold the booking write lock throughout their transaction. */
@Service
@RequiredArgsConstructor
public class StudioDisputeFinanceService {
    private final DisputeStageService stages;
    private final BookingDepositRepository deposits;
    private final PaymentTransactionRepository payments;
    private final BookingCashReceiptRepository receipts;
    private final BookingSettlementRepository settlements;
    private final LedgerEntryRepository ledger;
    private final WalletRepository wallets;
    private final WalletHoldRepository holds;
    private final BookingRepository bookings;
    private final BookingSettlementService settlementService;
    @Value("${app.settlement.commission-rate:0.1500}")
    private BigDecimal cashCommissionRate;
    @Value("${app.settlement.online-commission-rate:0.20}")
    private BigDecimal onlineCommissionRate;

    public record Financials(String stage, boolean completedService, BigDecimal paidDeposit,
                             BigDecimal paidAmount, BigDecimal cashAmount, boolean settled) {}

    @Transactional(readOnly = true)
    public Financials inspect(BookingEntity booking) {
        BigDecimal deposit = deposits.findByBookingId(booking.getId())
                .map(BookingDepositEntity::getPaidAmount).map(StudioDisputeFinanceService::money)
                .orElse(BigDecimal.ZERO);
        BigDecimal online = payments.findByBookingIdAndStatus(booking.getId(), "SUCCESS").stream()
                .filter(p -> "BOOKING_FINAL_PAYMENT".equals(p.getPurpose()))
                .map(p -> money(p.getAmount())).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal cash = receipts.findByBookingId(booking.getId())
                .filter(r -> "BOTH_CONFIRMED".equals(r.getStatus())
                        && r.getCustomerConfirmedAt() != null && r.getFreelancerConfirmedAt() != null)
                .map(r -> money(r.getExpectedAmount())).orElse(BigDecimal.ZERO);
        boolean settled = settlements.findByBookingId(booking.getId())
                .map(s -> "SETTLED".equals(s.getStatus())).orElse(false);
        boolean completed = stages.isCompletedService(booking);
        BigDecimal paid = deposit.add(online).add(cash);
        String stage = settled ? "SETTLED" : !completed ? "BEFORE_COMPLETION"
                : paid.compareTo(money(booking.getTotalAmount())) >= 0 ? "PAID_UNSETTLED" : "COMPLETED_UNPAID";
        return new Financials(stage, completed, deposit, paid, cash, settled);
    }

    public static boolean escalated(BookingEntity b) {
        return contains(b.getCancellationReason(), "[LEO_THANG_ADMIN]") || contains(b.getEmergencyReason(), "[LEO_THANG_ADMIN]");
    }

    public static boolean studioRejected(BookingEntity b) {
        return contains(b.getCancellationReason(), "[STUDIO_TU_CHOI]");
    }

    private static boolean contains(String value, String marker) { return value != null && value.contains(marker); }

    @Transactional
    public BookingStatus resolve(BookingEntity booking, String resolution, String note) {
        if (booking.getAgency() == null || booking.getAgency().getOwner() == null || booking.getCustomer() == null
                || booking.getStatus() != BookingStatus.DISPUTED) throw conflict("dispute.invalid_studio_state");
        // Lock the same deposit as final-payment application before reading payment evidence.
        deposits.findByBookingIdWithLock(booking.getId());
        Financials f = inspect(booking);
        boolean refund = "APPROVE_REFUND_CUSTOMER".equalsIgnoreCase(resolution) || "REFUND".equalsIgnoreCase(resolution);
        boolean split = "SPLIT_50_50".equalsIgnoreCase(resolution) || "SPLIT_SETTLEMENT_50_50".equalsIgnoreCase(resolution);
        boolean uphold = "APPROVE_COMPENSATION_MUA".equalsIgnoreCase(resolution) || "REJECT_AND_PAYOUT_MUA".equalsIgnoreCase(resolution);
        if (!refund && !split && !uphold) throw conflict("dispute.invalid_resolution_type");
        if ((ledger.existsByIdempotencyKey("studio_dispute:" + booking.getId() + ":refund") || ledger.existsByIdempotencyKey("studio_dispute:" + booking.getId() + ":compensation"))) throw conflict("dispute.already_resolved");
        if (f.paidAmount().compareTo(money(booking.getTotalAmount())) > 0) throw conflict("dispute.payment_reconciliation_required");
        if (settlements.findByBookingId(booking.getId()).isPresent() && !f.settled())
            throw conflict("dispute.payment_reconciliation_required");
        if (!f.completedService() && f.paidAmount().compareTo(f.paidDeposit()) != 0)
            throw conflict("dispute.payment_reconciliation_required");
        if (split && f.completedService()) throw conflict("dispute.split_not_allowed_for_completed_booking");

        if (uphold && f.completedService()) {
            if (!f.settled() && "PAID_UNSETTLED".equals(f.stage())) {
                booking.setStatus(BookingStatus.COMPLETED);
                bookings.save(booking);
                if (f.cashAmount().signum() > 0) settlementService.settleBooking(booking.getId(), cashCommissionRate);
                else settlementService.settleBookingOnlinePaymentInTransaction(booking.getId(), onlineCommissionRate);
                if (!settlements.findByBookingId(booking.getId()).map(s -> "SETTLED".equals(s.getStatus())).orElse(false))
                    throw conflict("dispute.payment_reconciliation_required");
            }
            // A finished service still awaiting payment must remain payable, never PAID_OUT.
            return f.settled() || "PAID_UNSETTLED".equals(f.stage()) ? BookingStatus.PAID_OUT : BookingStatus.COMPLETED;
        }

        Map<Long, BigDecimal> debits = new TreeMap<>();
        if (refund) {
            if (f.settled()) {
                var credits = ledger.findByReferenceIdAndReferenceTypeAndEntryType(booking.getId(), "BOOKING_SETTLEMENT", "CREDIT");
                BigDecimal credited = BigDecimal.ZERO;
                for (var entry : credits) {
                    if (entry.getWallet() == null || entry.getWallet().getUser() == null
                            || entry.getAmount() == null || entry.getAmount().signum() <= 0)
                        throw conflict("dispute.payment_reconciliation_required");
                    debits.merge(entry.getWallet().getUser().getId(), money(entry.getAmount()), BigDecimal::add);
                    credited = credited.add(money(entry.getAmount()));
                }
                var settlement = settlements.findByBookingId(booking.getId()).orElseThrow();
                boolean netCashPayout = credited.compareTo(money(settlement.getWalletCreditedAmount())) == 0
                        && credited.add(f.cashAmount()).add(money(settlement.getCommissionAmount())).compareTo(f.paidAmount()) == 0;
                // The cash writer historically credited T-F, while its snapshot stored D-F.
                // Recognize that exact, fully evidenced shape only. Reverse every actual credit
                // AND collect the cash from its recipient: skipping either leaves money behind.
                boolean grossCashPayout = f.cashAmount().signum() > 0
                        && settlement.getTotalAmount() != null && settlement.getDepositAmount() != null
                        && settlement.getCashAmount() != null && settlement.getCommissionAmount() != null
                        && settlement.getWalletCreditedAmount() != null
                        && settlement.getTotalAmount().compareTo(f.paidAmount()) == 0
                        && settlement.getDepositAmount().compareTo(f.paidDeposit()) == 0
                        && settlement.getCashAmount().compareTo(f.cashAmount()) == 0
                        && f.paidDeposit().add(f.cashAmount()).compareTo(f.paidAmount()) == 0
                        && credited.add(settlement.getCommissionAmount()).compareTo(f.paidAmount()) == 0
                        && settlement.getWalletCreditedAmount().add(f.cashAmount()).compareTo(credited) == 0
                        && ledger.findByReferenceIdAndReferenceTypeAndEntryType(booking.getId(), "BOOKING_SETTLEMENT", "DEBIT").isEmpty();
                if (!netCashPayout && !grossCashPayout)
                    throw conflict("dispute.payment_reconciliation_required");
            }
            if (f.cashAmount().signum() > 0) {
                var receipt = receipts.findByBookingId(booking.getId()).orElseThrow();
                if (receipt.getFreelancerUser() == null) throw conflict("dispute.payment_reconciliation_required");
                debits.merge(receipt.getFreelancerUser().getId(), f.cashAmount(), BigDecimal::add);
            }
        }
        // Lock all involved wallets in user-id order, and validate before changing any balance.
        Map<Long, UserEntity> users = new TreeMap<>();
        users.put(booking.getCustomer().getId(), booking.getCustomer());
        users.put(booking.getAgency().getOwner().getId(), booking.getAgency().getOwner());
        Map<Long, WalletEntity> locked = new TreeMap<>();
        Set<Long> ids = new TreeSet<>(users.keySet()); ids.addAll(debits.keySet());
        for (Long id : ids) {
            var wallet = wallets.findByUserIdWithLock(id).orElseGet(() -> {
                if (!users.containsKey(id)) throw conflict("dispute.insufficient_recovery_balance");
                return wallets.save(WalletEntity.builder().user(users.get(id)).availableBalance(BigDecimal.ZERO)
                        .frozenBalance(BigDecimal.ZERO).currency("VND").build());
            });
            if (money(wallet.getAvailableBalance()).compareTo(debits.getOrDefault(id, BigDecimal.ZERO)) < 0)
                throw conflict("dispute.insufficient_recovery_balance");
            locked.put(id, wallet);
        }
        for (var debit : debits.entrySet()) post(booking, locked.get(debit.getKey()), debit.getValue(), false,
                "BOOKING_CLAWBACK", "recover:" + debit.getKey(), note);
        BigDecimal customerAmount = refund ? f.paidAmount() : split
                ? f.paidDeposit().divide(BigDecimal.valueOf(2), 0, RoundingMode.HALF_UP) : BigDecimal.ZERO;
        BigDecimal studioAmount = refund ? BigDecimal.ZERO : f.paidDeposit().subtract(customerAmount);
        var customerWallet = locked.get(booking.getCustomer().getId());
        post(booking, customerWallet, customerAmount, true, "BOOKING_REFUND", "refund", note);
        post(booking, locked.get(booking.getAgency().getOwner().getId()), studioAmount, true, "BOOKING_COMPENSATION", "compensation", note);
        String depositStatus = refund ? "REFUNDED" : split ? "SPLIT_SETTLED" : "COMPENSATED_TO_MUA";
        for (var hold : holds.findAllByBookingIdAndStatus(booking.getId(), "ACTIVE")) {
            if (hold.getWallet() == null || !Objects.equals(hold.getWallet().getUser().getId(), booking.getCustomer().getId()))
                throw conflict("dispute.payment_reconciliation_required");
            BigDecimal frozen = money(customerWallet.getFrozenBalance());
            if (frozen.compareTo(money(hold.getAmount())) < 0) throw conflict("dispute.payment_reconciliation_required");
            customerWallet.setFrozenBalance(frozen.subtract(money(hold.getAmount())));
            hold.setStatus(refund ? "REFUNDED" : split ? "SPLIT_SETTLED" : "CONSUMED");
            hold.setReleasedAt(OffsetDateTime.now()); holds.save(hold);
        }
        wallets.save(customerWallet);
        deposits.findByBookingId(booking.getId()).ifPresent(d -> { d.setStatus(depositStatus); deposits.save(d); });
        if (refund) {
            payments.findByBookingIdAndStatus(booking.getId(), "SUCCESS").stream()
                    .filter(p -> "BOOKING_FINAL_PAYMENT".equals(p.getPurpose()))
                    .forEach(p -> { p.setApplicationStatus("REFUNDED"); payments.save(p); });
            // Prevent subsequent cash confirmations from re-opening a refunded service.
            receipts.findByBookingId(booking.getId()).ifPresent(r -> { r.setStatus("CANCELLED"); receipts.save(r); });
        }
        return refund || split ? BookingStatus.DISPUTE_REFUNDED : BookingStatus.DISPUTE_COMPENSATED;
    }

    private void post(BookingEntity booking, WalletEntity wallet, BigDecimal amount, boolean credit, String type, String suffix, String note) {
        if (amount.signum() == 0) return;
        BigDecimal balance = money(wallet.getAvailableBalance()).add(credit ? amount : amount.negate());
        wallet.setAvailableBalance(balance); wallets.save(wallet);
        ledger.save(LedgerEntryEntity.builder().wallet(wallet).referenceType(type).referenceId(booking.getId())
                .entryType(credit ? "CREDIT" : "DEBIT").amount(amount).balanceAfter(balance)
                .description(("Xử lý khiếu nại studio #" + booking.getBookingCode() + ": " + note).substring(0, Math.min(255, ("Xử lý khiếu nại studio #" + booking.getBookingCode() + ": " + note).length())))
                .idempotencyKey("studio_dispute:" + booking.getId() + ":" + suffix).build());
    }
    private static BigDecimal money(BigDecimal value) { return value == null ? BigDecimal.ZERO : value; }
    private static CustomBusinessException conflict(String key) {
        return new CustomBusinessException(ErrorCodes.ERR_INVALID_STATE_TRANSITION, key, HttpStatus.CONFLICT);
    }
}


