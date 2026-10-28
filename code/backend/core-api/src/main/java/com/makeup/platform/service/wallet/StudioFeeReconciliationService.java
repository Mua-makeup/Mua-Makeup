package com.makeup.platform.service.wallet;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.wallet.LedgerEntryEntity;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.wallet.*;
import com.makeup.platform.service.booking.StudioDisputeFinanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;

/** Explicit, audited correction of the old 15% Studio fee; never invoked by GET wallet. */
@Service
@RequiredArgsConstructor
public class StudioFeeReconciliationService {
    private final BookingRepository bookings;
    private final BookingSettlementRepository settlements;
    private final LedgerEntryRepository ledger;
    private final WalletRepository wallets;
    private final StudioDisputeFinanceService finance;
    private final PlatformFeeService platformFeeService;

    public record Preview(BigDecimal oldFee, BigDecimal correctFee, BigDecimal recoveryAmount, boolean applicable) {}

    @Transactional(readOnly = true)
    public Preview preview(Long bookingId) {
        var booking = bookings.findById(bookingId).orElseThrow(StudioFeeReconciliationService::conflict);
        if (booking.getAgency() == null) throw conflict();
        var settlement = settlements.findByBookingId(bookingId).orElseThrow(StudioFeeReconciliationService::conflict);
        BigDecimal fee = settlement.getTotalAmount().multiply(platformFeeService.rateFor(booking)).setScale(0, RoundingMode.HALF_UP);
        BigDecimal recovery = fee.subtract(settlement.getCommissionAmount());
        return new Preview(settlement.getCommissionAmount(), fee, recovery,
                recovery.signum() > 0 && "SETTLED".equals(settlement.getStatus())
                && (booking.getStatus() == BookingStatus.PAID_OUT || booking.getStatus() == BookingStatus.DISPUTED));
    }

    @Transactional
    public Preview correct(Long bookingId, Long adminId, BigDecimal expectedOldFee) {
        var booking = bookings.findByIdForUpdate(bookingId).orElseThrow(StudioFeeReconciliationService::conflict);
        String key = "studio_fee20:" + bookingId;
        if (ledger.existsByIdempotencyKey(key)) return preview(bookingId);
        var plan = preview(bookingId);
        if (!plan.applicable() || expectedOldFee == null || plan.oldFee().compareTo(expectedOldFee) != 0) throw conflict();
        var settlement = settlements.findByBookingId(bookingId).orElseThrow(StudioFeeReconciliationService::conflict);
        var evidence = finance.inspect(booking);
        if (settlement.getCommissionRate().compareTo(new BigDecimal("0.15")) != 0
                || settlement.getTotalAmount().multiply(new BigDecimal("0.15")).setScale(0, RoundingMode.HALF_UP).compareTo(plan.oldFee()) != 0) throw conflict();
        if (booking.getAgency().getOwner() == null || evidence.paidAmount().compareTo(settlement.getTotalAmount()) != 0
                || settlement.getDepositAmount().compareTo(evidence.paidDeposit()) != 0
                || settlement.getCashAmount().compareTo(evidence.cashAmount()) != 0) throw conflict();
        var credits = ledger.findByReferenceIdAndReferenceTypeAndEntryType(bookingId, "BOOKING_SETTLEMENT", "CREDIT");
        BigDecimal total = BigDecimal.ZERO, ownerCredit = BigDecimal.ZERO;
        Long ownerId = booking.getAgency().getOwner().getId();
        for (var entry : credits) {
            if (entry.getWallet() == null || entry.getWallet().getUser() == null || entry.getAmount() == null || entry.getAmount().signum() <= 0) throw conflict();
            total = total.add(entry.getAmount());
            if (ownerId.equals(entry.getWallet().getUser().getId())) ownerCredit = ownerCredit.add(entry.getAmount());
        }
        if (total.add(plan.oldFee()).compareTo(evidence.paidAmount()) != 0
                || !(total.compareTo(settlement.getWalletCreditedAmount()) == 0
                    || total.compareTo(settlement.getWalletCreditedAmount().add(evidence.cashAmount())) == 0)
                || ownerCredit.compareTo(plan.recoveryAmount()) < 0
                || !ledger.findByReferenceIdAndReferenceTypeAndEntryType(bookingId, "BOOKING_SETTLEMENT", "DEBIT").isEmpty()) throw conflict();
        var wallet = wallets.findByUserIdWithLock(ownerId).orElseThrow(StudioFeeReconciliationService::conflict);
        if (wallet.getAvailableBalance().compareTo(plan.recoveryAmount()) < 0)
            throw new CustomBusinessException(ErrorCodes.ERR_INVALID_STATE_TRANSITION, "dispute.insufficient_recovery_balance", HttpStatus.CONFLICT);
        wallet.setAvailableBalance(wallet.getAvailableBalance().subtract(plan.recoveryAmount()));
        wallets.save(wallet);
        ledger.save(LedgerEntryEntity.builder().wallet(wallet).referenceId(bookingId).referenceType("BOOKING_SETTLEMENT")
                .entryType("DEBIT").amount(plan.recoveryAmount()).balanceAfter(wallet.getAvailableBalance())
                .idempotencyKey(key).description("Điều chỉnh phí Studio 20% #" + booking.getBookingCode() + " bởi Admin " + adminId
                        + " (phí cũ " + plan.oldFee() + ")").build());
        settlement.setCommissionRate(platformFeeService.rateFor(booking));
        settlement.setCommissionAmount(plan.correctFee());
        settlement.setFreelancerEarnings(settlement.getTotalAmount().subtract(plan.correctFee()));
        settlement.setWalletCreditedAmount(total.subtract(plan.recoveryAmount()));
        settlement.setSettlementVersion(2);
        settlements.save(settlement);
        return preview(bookingId);
    }

    private static CustomBusinessException conflict() {
        return new CustomBusinessException(ErrorCodes.ERR_INVALID_STATE_TRANSITION, "dispute.payment_reconciliation_required", HttpStatus.CONFLICT);
    }
}
