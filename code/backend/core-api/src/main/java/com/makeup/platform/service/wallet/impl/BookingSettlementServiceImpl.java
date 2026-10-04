package com.makeup.platform.service.wallet.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.payment.BookingDepositEntity;
import com.makeup.platform.entity.wallet.BookingCashReceiptEntity;
import com.makeup.platform.entity.wallet.BookingSettlementEntity;
import com.makeup.platform.entity.wallet.LedgerEntryEntity;
import com.makeup.platform.entity.wallet.WalletEntity;
import com.makeup.platform.entity.wallet.WalletHoldEntity;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.payment.BookingDepositRepository;
import com.makeup.platform.repository.wallet.BookingCashReceiptRepository;
import com.makeup.platform.repository.wallet.BookingSettlementRepository;
import com.makeup.platform.repository.wallet.LedgerEntryRepository;
import com.makeup.platform.repository.wallet.WalletHoldRepository;
import com.makeup.platform.repository.wallet.WalletRepository;
import com.makeup.platform.service.wallet.BookingSettlementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingSettlementServiceImpl implements BookingSettlementService {

    private static final ZoneOffset VIETNAM_OFFSET = ZoneOffset.ofHours(7);

    private final BookingRepository bookingRepository;
    private final BookingDepositRepository bookingDepositRepository;
    private final BookingCashReceiptRepository cashReceiptRepository;
    private final BookingSettlementRepository settlementRepository;
    private final WalletRepository walletRepository;
    private final WalletHoldRepository walletHoldRepository;
    private final LedgerEntryRepository ledgerEntryRepository;

    @Override
    @Transactional
    public void settleBooking(Long bookingId, BigDecimal commissionRate) {
        bookingDepositRepository.findByBookingIdWithLock(bookingId).orElseThrow();
        // Idempotency check
        if (settlementRepository.existsByBookingId(bookingId)) {
            log.info("[Settlement] Booking {} already settled, skipping", bookingId);
            return;
        }

        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND,
                        "booking.not_found", HttpStatus.NOT_FOUND));

        // Kiểm tra điều kiện tiên quyết
        if (booking.getStatus() != BookingStatus.COMPLETED) {
            throw new CustomBusinessException(ErrorCodes.ERR_SETTLEMENT_PREREQUISITE_NOT_MET,
                    "settlement.booking_not_completed", HttpStatus.BAD_REQUEST);
        }

        BookingCashReceiptEntity cashReceipt = cashReceiptRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_CASH_RECEIPT_NOT_FOUND,
                        "settlement.cash_receipt_not_found", HttpStatus.NOT_FOUND));

        if (!"BOTH_CONFIRMED".equals(cashReceipt.getStatus())) {
            throw new CustomBusinessException(ErrorCodes.ERR_SETTLEMENT_PREREQUISITE_NOT_MET,
                    "settlement.cash_receipt_not_confirmed", HttpStatus.BAD_REQUEST);
        }

        BookingDepositEntity deposit = bookingDepositRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_DEPOSIT_NOT_FOUND,
                        "booking.deposit_not_found", HttpStatus.NOT_FOUND));

        if (!"PAID".equals(deposit.getStatus())) {
            throw new CustomBusinessException(ErrorCodes.ERR_DEPOSIT_NOT_PAID,
                    "settlement.deposit_not_paid", HttpStatus.BAD_REQUEST);
        }

        // Tính T/D/C/F/E/N
        // T: tổng hóa đơn cuối
        BigDecimal T = booking.getTotalAmount();
        // D: tiền cọc
        BigDecimal D = deposit.getPaidAmount();
        // C: tiền mặt khách trả thợ (xác nhận bởi cả hai)
        BigDecimal C = cashReceipt.getExpectedAmount();
        // Validate: T = D + C (trong trường hợp bình thường)
        // F: phí nền tảng
        BigDecimal F = T.multiply(commissionRate).setScale(0, RoundingMode.HALF_UP);
        // E: thu nhập thợ = T - F
        BigDecimal E = T.subtract(F);
        // N: ghi có ví thợ = D - F (phần hệ thống giữ trừ phí)
        BigDecimal N = D.subtract(F);

        String settlementStatus;
        String failureReason = null;

        if (N.compareTo(BigDecimal.ZERO) < 0) {
            // Trường hợp đặc biệt: Phí > Cọc (ví dụ phí 35% và cọc 30%)
            // Không tắc nghẽn, nhưng ghi nhận PENDING_FEE_COLLECTION
            log.warn("[Settlement] Booking {} has N={} < 0. commissionRate={}, D={}, F={}. Setting PENDING_FEE_COLLECTION.",
                    bookingId, N, commissionRate, D, F);
            settlementStatus = "PENDING_FEE_COLLECTION";
            failureReason = "commission_exceeds_deposit_N=" + N;
            N = BigDecimal.ZERO; // Không trừ âm vào ví
        } else {
            settlementStatus = "SETTLED";
        }

        // Tạo settlement record
        BookingSettlementEntity settlement = BookingSettlementEntity.builder()
                .booking(booking)
                .totalAmount(T)
                .depositAmount(D)
                .cashAmount(C)
                .commissionAmount(F)
                .freelancerEarnings(E)
                .walletCreditedAmount(N)
                .commissionRate(commissionRate)
                .status(settlementStatus)
                .settledAt("SETTLED".equals(settlementStatus) ? OffsetDateTime.now(VIETNAM_OFFSET) : null)
                .failureReason(failureReason)
                .build();

        settlementRepository.save(settlement);

        // Ghi có ví thợ nếu N > 0
        if (N.compareTo(BigDecimal.ZERO) > 0 && booking.getMua() != null) {
            Long freelancerUserId = booking.getMua().getUser().getId();
            WalletEntity freelancerWallet = walletRepository.findByUserIdWithLock(freelancerUserId)
                    .orElseGet(() -> {
                        WalletEntity newWallet = WalletEntity.builder()
                                .user(booking.getMua().getUser())
                                .availableBalance(BigDecimal.ZERO)
                                .frozenBalance(BigDecimal.ZERO)
                                .currency("VND")
                                .build();
                        return walletRepository.save(newWallet);
                    });

            String ledgerKey = "settle:credit:" + bookingId + ":" + freelancerUserId;
            if (!ledgerEntryRepository.existsByIdempotencyKey(ledgerKey)) {
                BigDecimal balanceBefore = freelancerWallet.getAvailableBalance();
                freelancerWallet.setAvailableBalance(balanceBefore.add(N));
                walletRepository.save(freelancerWallet);

                LedgerEntryEntity credit = LedgerEntryEntity.builder()
                        .referenceType("BOOKING_SETTLEMENT")
                        .referenceId(bookingId)
                        .wallet(freelancerWallet)
                        .entryType("CREDIT")
                        .amount(N)
                        .balanceAfter(freelancerWallet.getAvailableBalance())
                        .description("Quyết toán booking #" + booking.getBookingCode() + " (N=D-F)")
                        .idempotencyKey(ledgerKey)
                        .build();
                ledgerEntryRepository.save(credit);

                log.info("[Settlement] Credited {} VND to freelancer wallet (userId={}) for booking {}",
                        N, freelancerUserId, bookingId);
            }
        }

        // Giải phóng wallet_hold
        List<WalletHoldEntity> activeHolds = walletHoldRepository.findAllByBookingIdAndStatus(bookingId, "ACTIVE");
        for (WalletHoldEntity hold : activeHolds) {
            hold.setStatus("CONSUMED");
            hold.setReleasedAt(OffsetDateTime.now(VIETNAM_OFFSET));
            walletHoldRepository.save(hold);
            log.info("[Settlement] Released wallet hold {} for booking {}", hold.getId(), bookingId);
        }

        booking.setStatus(BookingStatus.PAID_OUT);
        bookingRepository.save(booking);

        log.info("[Settlement] Booking {} settled. T={} D={} C={} F={} E={} N={} Status={}",
                bookingId, T, D, C, F, E, N, settlementStatus);
    }

    @Override
    @Transactional
    public void settleBookingOnlinePayment(Long bookingId, BigDecimal commissionRate) {
        bookingDepositRepository.findByBookingIdWithLock(bookingId).orElseThrow();
        if (settlementRepository.existsByBookingId(bookingId)) {
            log.info("[SettlementOnline] Booking {} already settled, skipping", bookingId);
            return;
        }

        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND,
                        "booking.not_found", HttpStatus.NOT_FOUND));

        BookingDepositEntity deposit = bookingDepositRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_DEPOSIT_NOT_FOUND,
                        "booking.deposit_not_found", HttpStatus.NOT_FOUND));

        if (booking.getStatus() != BookingStatus.COMPLETED || !"PAID".equals(deposit.getStatus())) {
            throw new CustomBusinessException(ErrorCodes.ERR_SETTLEMENT_PREREQUISITE_NOT_MET,
                    "settlement.booking_not_completed", HttpStatus.CONFLICT);
        }

        BigDecimal T = booking.getTotalAmount();
        BigDecimal D = deposit.getPaidAmount() != null ? deposit.getPaidAmount() : BigDecimal.ZERO;
        BigDecimal C = BigDecimal.ZERO;
        BigDecimal F = T.multiply(commissionRate).setScale(0, RoundingMode.HALF_UP);
        BigDecimal E = T.subtract(F);
        BigDecimal N = E;

        BookingSettlementEntity settlement = BookingSettlementEntity.builder()
                .booking(booking)
                .totalAmount(T)
                .depositAmount(D)
                .cashAmount(C)
                .commissionAmount(F)
                .freelancerEarnings(E)
                .walletCreditedAmount(N)
                .commissionRate(commissionRate)
                .status("SETTLED")
                .settledAt(OffsetDateTime.now(VIETNAM_OFFSET))
                .build();
        settlementRepository.save(settlement);

        if (E.compareTo(BigDecimal.ZERO) > 0 && booking.getMua() != null) {
            Long freelancerUserId = booking.getMua().getUser().getId();
            WalletEntity freelancerWallet = walletRepository.findByUserIdWithLock(freelancerUserId)
                    .orElseGet(() -> {
                        WalletEntity newWallet = WalletEntity.builder()
                                .user(booking.getMua().getUser())
                                .availableBalance(BigDecimal.ZERO)
                                .frozenBalance(BigDecimal.ZERO)
                                .currency("VND")
                                .build();
                        return walletRepository.save(newWallet);
                    });

            String ledgerKey = "settle:credit:online:" + bookingId + ":" + freelancerUserId;
            if (!ledgerEntryRepository.existsByIdempotencyKey(ledgerKey)) {
                BigDecimal balanceBefore = freelancerWallet.getAvailableBalance();
                freelancerWallet.setAvailableBalance(balanceBefore.add(E));
                walletRepository.save(freelancerWallet);

                LedgerEntryEntity credit = LedgerEntryEntity.builder()
                        .referenceType("BOOKING_SETTLEMENT")
                        .referenceId(bookingId)
                        .wallet(freelancerWallet)
                        .entryType("CREDIT")
                        .amount(E)
                        .balanceAfter(freelancerWallet.getAvailableBalance())
                        .description("Quyết toán online booking #" + booking.getBookingCode())
                        .idempotencyKey(ledgerKey)
                        .build();
                ledgerEntryRepository.save(credit);
                log.info("[SettlementOnline] Credited full earnings {} VND to freelancer wallet (userId={}) for booking {}",
                        E, freelancerUserId, bookingId);
            }
        }

        // Release wallet hold
        List<WalletHoldEntity> activeHolds = walletHoldRepository.findAllByBookingIdAndStatus(bookingId, "ACTIVE");
        for (WalletHoldEntity hold : activeHolds) {
            hold.setStatus("CONSUMED");
            hold.setReleasedAt(OffsetDateTime.now(VIETNAM_OFFSET));
            walletHoldRepository.save(hold);
            log.info("[SettlementOnline] Released wallet hold {} for booking {}", hold.getId(), bookingId);
        }

        booking.setStatus(BookingStatus.PAID_OUT);
        bookingRepository.save(booking);

        log.info("[SettlementOnline] Booking {} settled online. T={} D={} F={} E={}", bookingId, T, D, F, E);
    }

    @Override
    @Transactional
    public void retryPendingSettlements() {
        // Placeholder: xử lý các settlement ở trạng thái PENDING > 5 phút
        log.debug("[Settlement] Retry pending settlements check.");
    }
}
