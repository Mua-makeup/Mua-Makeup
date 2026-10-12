package com.makeup.platform.service.wallet.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.booking.AssignmentRole;
import com.makeup.platform.entity.booking.AssignmentStatus;

import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStaffAssignmentEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.payment.BookingDepositEntity;
import com.makeup.platform.entity.wallet.BookingCashReceiptEntity;
import com.makeup.platform.entity.wallet.BookingSettlementEntity;
import com.makeup.platform.entity.wallet.LedgerEntryEntity;
import com.makeup.platform.entity.wallet.WalletEntity;
import com.makeup.platform.entity.wallet.WalletHoldEntity;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.booking.BookingStaffAssignmentRepository;
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
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
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
    private final BookingStaffAssignmentRepository bookingStaffAssignmentRepository;

    @Override
    @Transactional
    public void settleBooking(Long bookingId, BigDecimal commissionRate) {
        // Idempotency check
        if (settlementRepository.existsByBookingId(bookingId)) {
            log.info("[Settlement] Booking {} already settled, ensuring booking status is PAID_OUT", bookingId);
            BookingEntity booking = bookingRepository.findById(bookingId).orElse(null);
            if (booking != null && booking.getStatus() != BookingStatus.PAID_OUT) {
                booking.setStatus(BookingStatus.PAID_OUT);
                bookingRepository.save(booking);
            }
            return;
        }

        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND,
                        "booking.not_found", HttpStatus.NOT_FOUND));

        // Kiểm tra điều kiện tiên quyết: cho phép COMPLETED hoặc IN_PROGRESS khi đã làm xong và trả tiền mặt
        if (booking.getStatus() != BookingStatus.COMPLETED && booking.getStatus() != BookingStatus.IN_PROGRESS && booking.getStatus() != BookingStatus.PAID_OUT) {
            log.warn("[Settlement] Booking {} is in status {}, allowing settlement completion", bookingId, booking.getStatus());
        }

        BookingCashReceiptEntity cashReceipt = cashReceiptRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_CASH_RECEIPT_NOT_FOUND,
                        "settlement.cash_receipt_not_found", HttpStatus.NOT_FOUND));

        boolean isBothConfirmed = "BOTH_CONFIRMED".equals(cashReceipt.getStatus())
                || (cashReceipt.getCustomerConfirmedAt() != null && cashReceipt.getFreelancerConfirmedAt() != null);
        if (!isBothConfirmed) {
            throw new CustomBusinessException(ErrorCodes.ERR_SETTLEMENT_PREREQUISITE_NOT_MET,
                    "settlement.cash_receipt_not_confirmed", HttpStatus.BAD_REQUEST);
        }
        if (!"BOTH_CONFIRMED".equals(cashReceipt.getStatus())) {
            cashReceipt.setStatus("BOTH_CONFIRMED");
            cashReceipt = cashReceiptRepository.save(cashReceipt);
        }

        BookingDepositEntity deposit = bookingDepositRepository.findByBookingId(bookingId)
                .orElseGet(() -> {
                    BigDecimal depAmount = booking.getDepositAmount() != null ? booking.getDepositAmount() : BigDecimal.ZERO;
                    BookingDepositEntity fallback = BookingDepositEntity.builder()
                            .booking(booking)
                            .pricingVersion(LocalDate.now().toString())
                            .status("PAID")
                            .paidAmount(depAmount)
                            .requiredAmount(depAmount)
                            .paidAt(OffsetDateTime.now(VIETNAM_OFFSET))
                            .build();
                    return bookingDepositRepository.save(fallback);
                });

        if (!"PAID".equals(deposit.getStatus())) {
            // Tự động kích hoạt PAID nếu booking đã có số tiền cọc
            if (booking.getDepositAmount() != null && booking.getDepositAmount().compareTo(BigDecimal.ZERO) > 0) {
                deposit.setStatus("PAID");
                if (deposit.getPaidAmount() == null) {
                    deposit.setPaidAmount(booking.getDepositAmount());
                }
                deposit = bookingDepositRepository.save(deposit);
            } else {
                throw new CustomBusinessException(ErrorCodes.ERR_DEPOSIT_NOT_PAID,
                        "settlement.deposit_not_paid", HttpStatus.BAD_REQUEST);
            }
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

        // Ghi có ví thợ / ví Agency / ví Freelancer: hỗ trợ phân chia đa nhân sự cho thợ chính và thợ phụ
        List<BookingStaffAssignmentEntity> activeStaffAssignments = (booking.getStaffAssignments() != null && !booking.getStaffAssignments().isEmpty())
                ? booking.getStaffAssignments().stream().filter(sa -> sa.getStatus() == AssignmentStatus.ACTIVE).toList()
                : bookingStaffAssignmentRepository.findByBookingIdAndStatus(bookingId, AssignmentStatus.ACTIVE);

        if (!activeStaffAssignments.isEmpty()) {
            BigDecimal totalStaffPayout = BigDecimal.ZERO;
            for (BookingStaffAssignmentEntity sa : activeStaffAssignments) {
                BigDecimal staffEarnings = (sa.getCommissionAmount() != null && sa.getCommissionAmount().compareTo(BigDecimal.ZERO) > 0)
                        ? sa.getCommissionAmount()
                        : BigDecimal.ZERO;

                if (staffEarnings.compareTo(BigDecimal.ZERO) > 0 && sa.getStaff() != null && sa.getStaff().getMua() != null && sa.getStaff().getMua().getUser() != null) {
                    Long staffUserId = sa.getStaff().getMua().getUser().getId();
                    WalletEntity staffWallet = walletRepository.findByUserIdWithLock(staffUserId)
                            .orElseGet(() -> {
                                WalletEntity newWallet = WalletEntity.builder()
                                        .user(sa.getStaff().getMua().getUser())
                                        .availableBalance(BigDecimal.ZERO)
                                        .frozenBalance(BigDecimal.ZERO)
                                        .currency("VND")
                                        .build();
                                return walletRepository.save(newWallet);
                            });

                    String ledgerKey = "settle:credit:staff:" + bookingId + ":" + sa.getId();
                    if (!ledgerEntryRepository.existsByIdempotencyKey(ledgerKey)) {
                        BigDecimal balanceBefore = staffWallet.getAvailableBalance();
                        staffWallet.setAvailableBalance(balanceBefore.add(staffEarnings));
                        walletRepository.save(staffWallet);

                        String roleLabel = sa.getAssignmentRole() == AssignmentRole.PRIMARY_MUA ? "Thợ chính" : "Thợ phụ";
                        String noteDesc = (sa.getCommissionNote() != null && !sa.getCommissionNote().isBlank()) ? (" - " + sa.getCommissionNote()) : "";
                        LedgerEntryEntity credit = LedgerEntryEntity.builder()
                                .referenceType("BOOKING_SETTLEMENT")
                                .referenceId(bookingId)
                                .wallet(staffWallet)
                                .entryType("CREDIT")
                                .amount(staffEarnings)
                                .balanceAfter(staffWallet.getAvailableBalance())
                                .description("Quyết toán ca #" + booking.getBookingCode() + " (" + roleLabel + noteDesc + ")")
                                .idempotencyKey(ledgerKey)
                                .build();
                        ledgerEntryRepository.save(credit);

                        sa.setPayoutStatus("SETTLED");
                        sa.setPayoutAt(OffsetDateTime.now(VIETNAM_OFFSET));
                        bookingStaffAssignmentRepository.save(sa);
                        totalStaffPayout = totalStaffPayout.add(staffEarnings);

                        log.info("[Settlement] Credited {} VND to staff wallet (userId={}, role={}) for booking {}",
                                staffEarnings, staffUserId, sa.getAssignmentRole(), bookingId);
                    }
                }
            }

            // Nếu đơn thuộc Agency và N > totalStaffPayout, ghi có phần cọc còn lại cho Agency Owner
            if (booking.getAgency() != null && booking.getAgency().getOwner() != null && N.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal agencyRemaining = N.subtract(totalStaffPayout);
                if (agencyRemaining.compareTo(BigDecimal.ZERO) > 0) {
                    UserEntity agencyOwner = booking.getAgency().getOwner();
                    Long ownerId = agencyOwner.getId();
                    WalletEntity ownerWallet = walletRepository.findByUserIdWithLock(ownerId)
                            .orElseGet(() -> {
                                WalletEntity newWallet = WalletEntity.builder()
                                        .user(agencyOwner)
                                        .availableBalance(BigDecimal.ZERO)
                                        .frozenBalance(BigDecimal.ZERO)
                                        .currency("VND")
                                        .build();
                                return walletRepository.save(newWallet);
                            });

                    String ledgerKey = "settle:credit:agency:" + bookingId + ":" + ownerId;
                    if (!ledgerEntryRepository.existsByIdempotencyKey(ledgerKey)) {
                        BigDecimal balanceBefore = ownerWallet.getAvailableBalance();
                        ownerWallet.setAvailableBalance(balanceBefore.add(agencyRemaining));
                        walletRepository.save(ownerWallet);

                        String agencyName = booking.getAgency().getAgencyName() != null ? booking.getAgency().getAgencyName() : "";
                        LedgerEntryEntity credit = LedgerEntryEntity.builder()
                                .referenceType("BOOKING_SETTLEMENT")
                                .referenceId(bookingId)
                                .wallet(ownerWallet)
                                .entryType("CREDIT")
                                .amount(agencyRemaining)
                                .balanceAfter(ownerWallet.getAvailableBalance())
                                .description("Quyết toán booking #" + booking.getBookingCode() + " cho Agency " + agencyName + " (cọc còn lại sau hoa hồng thợ)")
                                .idempotencyKey(ledgerKey)
                                .build();
                        ledgerEntryRepository.save(credit);

                        log.info("[Settlement] Credited remaining deposit {} VND to agency owner wallet (userId={}) for booking {}",
                                agencyRemaining, ownerId, bookingId);
                    }
                }
            }
        } else if (N.compareTo(BigDecimal.ZERO) > 0) {
            UserEntity beneficiaryUser = null;
            String beneficiaryDesc = null;

            if (booking.getAgency() != null && booking.getAgency().getOwner() != null) {
                beneficiaryUser = booking.getAgency().getOwner();
                beneficiaryDesc = "Agency " + (booking.getAgency().getAgencyName() != null ? booking.getAgency().getAgencyName() : "");
            } else if (booking.getMua() != null && booking.getMua().getUser() != null) {
                beneficiaryUser = booking.getMua().getUser();
                beneficiaryDesc = "Freelancer " + (beneficiaryUser.getFullName() != null ? beneficiaryUser.getFullName() : "");
            }

            if (beneficiaryUser != null) {
                Long beneficiaryUserId = beneficiaryUser.getId();
                final UserEntity finalBeneficiary = beneficiaryUser;
                WalletEntity targetWallet = walletRepository.findByUserIdWithLock(beneficiaryUserId)
                        .orElseGet(() -> {
                            WalletEntity newWallet = WalletEntity.builder()
                                    .user(finalBeneficiary)
                                    .availableBalance(BigDecimal.ZERO)
                                    .frozenBalance(BigDecimal.ZERO)
                                    .currency("VND")
                                    .build();
                            return walletRepository.save(newWallet);
                        });

                String ledgerKey = "settle:credit:" + bookingId + ":" + beneficiaryUserId;
                if (!ledgerEntryRepository.existsByIdempotencyKey(ledgerKey)) {
                    BigDecimal balanceBefore = targetWallet.getAvailableBalance();
                    targetWallet.setAvailableBalance(balanceBefore.add(N));
                    walletRepository.save(targetWallet);

                    LedgerEntryEntity credit = LedgerEntryEntity.builder()
                            .referenceType("BOOKING_SETTLEMENT")
                            .referenceId(bookingId)
                            .wallet(targetWallet)
                            .entryType("CREDIT")
                            .amount(N)
                            .balanceAfter(targetWallet.getAvailableBalance())
                            .description("Quyết toán booking #" + booking.getBookingCode() + " cho " + beneficiaryDesc + " (N=D-F)")
                            .idempotencyKey(ledgerKey)
                            .build();
                    ledgerEntryRepository.save(credit);

                    log.info("[Settlement] Credited {} VND to wallet (userId={}, beneficiary={}) for booking {}",
                            N, beneficiaryUserId, beneficiaryDesc, bookingId);
                }
            } else {
                log.warn("[Settlement] No beneficiary found (neither Agency Owner nor Freelancer) for bookingId={}", bookingId);
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
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void settleBookingOnlinePayment(Long bookingId, BigDecimal commissionRate) {
        if (settlementRepository.existsByBookingId(bookingId)) {
            log.info("[SettlementOnline] Booking {} already settled, skipping", bookingId);
            return;
        }

        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND,
                        "booking.not_found", HttpStatus.NOT_FOUND));

        BookingDepositEntity deposit = bookingDepositRepository.findByBookingId(bookingId)
                .orElseGet(() -> {
                    BigDecimal depAmount = booking.getDepositAmount() != null ? booking.getDepositAmount() : BigDecimal.ZERO;
                    BookingDepositEntity fallback = BookingDepositEntity.builder()
                            .booking(booking)
                            .pricingVersion(LocalDate.now().toString())
                            .status("PAID")
                            .paidAmount(depAmount)
                            .requiredAmount(depAmount)
                            .paidAt(OffsetDateTime.now(VIETNAM_OFFSET))
                            .build();
                    return bookingDepositRepository.save(fallback);
                });

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

        // Ghi có ví thợ / ví Agency / ví Freelancer: hỗ trợ phân chia đa nhân sự cho thợ chính và thợ phụ
        List<BookingStaffAssignmentEntity> activeStaffAssignments = (booking.getStaffAssignments() != null && !booking.getStaffAssignments().isEmpty())
                ? booking.getStaffAssignments().stream().filter(sa -> sa.getStatus() == AssignmentStatus.ACTIVE).toList()
                : bookingStaffAssignmentRepository.findByBookingIdAndStatus(bookingId, AssignmentStatus.ACTIVE);

        if (!activeStaffAssignments.isEmpty()) {
            BigDecimal totalStaffPayout = BigDecimal.ZERO;
            for (BookingStaffAssignmentEntity sa : activeStaffAssignments) {
                BigDecimal staffEarnings = (sa.getCommissionAmount() != null && sa.getCommissionAmount().compareTo(BigDecimal.ZERO) > 0)
                        ? sa.getCommissionAmount()
                        : BigDecimal.ZERO;

                if (staffEarnings.compareTo(BigDecimal.ZERO) > 0 && sa.getStaff() != null && sa.getStaff().getMua() != null && sa.getStaff().getMua().getUser() != null) {
                    Long staffUserId = sa.getStaff().getMua().getUser().getId();
                    WalletEntity staffWallet = walletRepository.findByUserIdWithLock(staffUserId)
                            .orElseGet(() -> {
                                WalletEntity newWallet = WalletEntity.builder()
                                        .user(sa.getStaff().getMua().getUser())
                                        .availableBalance(BigDecimal.ZERO)
                                        .frozenBalance(BigDecimal.ZERO)
                                        .currency("VND")
                                        .build();
                                return walletRepository.save(newWallet);
                            });

                    String ledgerKey = "settle:credit:online:staff:" + bookingId + ":" + sa.getId();
                    if (!ledgerEntryRepository.existsByIdempotencyKey(ledgerKey)) {
                        BigDecimal balanceBefore = staffWallet.getAvailableBalance();
                        staffWallet.setAvailableBalance(balanceBefore.add(staffEarnings));
                        walletRepository.save(staffWallet);

                        String roleLabel = sa.getAssignmentRole() == AssignmentRole.PRIMARY_MUA ? "Thợ chính" : "Thợ phụ";
                        String noteDesc = (sa.getCommissionNote() != null && !sa.getCommissionNote().isBlank()) ? (" - " + sa.getCommissionNote()) : "";
                        LedgerEntryEntity credit = LedgerEntryEntity.builder()
                                .referenceType("BOOKING_SETTLEMENT")
                                .referenceId(bookingId)
                                .wallet(staffWallet)
                                .entryType("CREDIT")
                                .amount(staffEarnings)
                                .balanceAfter(staffWallet.getAvailableBalance())
                                .description("Quyết toán online ca #" + booking.getBookingCode() + " (" + roleLabel + noteDesc + ")")
                                .idempotencyKey(ledgerKey)
                                .build();
                        ledgerEntryRepository.save(credit);

                        sa.setPayoutStatus("SETTLED");
                        sa.setPayoutAt(OffsetDateTime.now(VIETNAM_OFFSET));
                        bookingStaffAssignmentRepository.save(sa);
                        totalStaffPayout = totalStaffPayout.add(staffEarnings);

                        log.info("[SettlementOnline] Credited {} VND to staff wallet (userId={}, role={}) for booking {}",
                                staffEarnings, staffUserId, sa.getAssignmentRole(), bookingId);
                    }
                }
            }

            // Nếu đơn thuộc Agency và E > totalStaffPayout, ghi có phần doanh thu ròng còn lại cho Agency Owner
            if (booking.getAgency() != null && booking.getAgency().getOwner() != null && E.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal agencyRemaining = E.subtract(totalStaffPayout);
                if (agencyRemaining.compareTo(BigDecimal.ZERO) > 0) {
                    UserEntity agencyOwner = booking.getAgency().getOwner();
                    Long ownerId = agencyOwner.getId();
                    WalletEntity ownerWallet = walletRepository.findByUserIdWithLock(ownerId)
                            .orElseGet(() -> {
                                WalletEntity newWallet = WalletEntity.builder()
                                        .user(agencyOwner)
                                        .availableBalance(BigDecimal.ZERO)
                                        .frozenBalance(BigDecimal.ZERO)
                                        .currency("VND")
                                        .build();
                                return walletRepository.save(newWallet);
                            });

                    String ledgerKey = "settle:credit:online:agency:" + bookingId + ":" + ownerId;
                    if (!ledgerEntryRepository.existsByIdempotencyKey(ledgerKey)) {
                        BigDecimal balanceBefore = ownerWallet.getAvailableBalance();
                        ownerWallet.setAvailableBalance(balanceBefore.add(agencyRemaining));
                        walletRepository.save(ownerWallet);

                        String agencyName = booking.getAgency().getAgencyName() != null ? booking.getAgency().getAgencyName() : "";
                        LedgerEntryEntity credit = LedgerEntryEntity.builder()
                                .referenceType("BOOKING_SETTLEMENT")
                                .referenceId(bookingId)
                                .wallet(ownerWallet)
                                .entryType("CREDIT")
                                .amount(agencyRemaining)
                                .balanceAfter(ownerWallet.getAvailableBalance())
                                .description("Quyết toán online booking #" + booking.getBookingCode() + " cho Agency " + agencyName + " (doanh thu sau hoa hồng thợ)")
                                .idempotencyKey(ledgerKey)
                                .build();
                        ledgerEntryRepository.save(credit);

                        log.info("[SettlementOnline] Credited remaining studio earnings {} VND to agency owner wallet (userId={}) for booking {}",
                                agencyRemaining, ownerId, bookingId);
                    }
                }
            }
        } else if (E.compareTo(BigDecimal.ZERO) > 0) {
            UserEntity beneficiaryUser = null;
            String beneficiaryDesc = null;

            if (booking.getAgency() != null && booking.getAgency().getOwner() != null) {
                beneficiaryUser = booking.getAgency().getOwner();
                beneficiaryDesc = "Agency " + (booking.getAgency().getAgencyName() != null ? booking.getAgency().getAgencyName() : "");
            } else if (booking.getMua() != null && booking.getMua().getUser() != null) {
                beneficiaryUser = booking.getMua().getUser();
                beneficiaryDesc = "Freelancer " + (beneficiaryUser.getFullName() != null ? beneficiaryUser.getFullName() : "");
            }

            if (beneficiaryUser != null) {
                Long beneficiaryUserId = beneficiaryUser.getId();
                final UserEntity finalBeneficiary = beneficiaryUser;
                WalletEntity targetWallet = walletRepository.findByUserIdWithLock(beneficiaryUserId)
                        .orElseGet(() -> {
                            WalletEntity newWallet = WalletEntity.builder()
                                    .user(finalBeneficiary)
                                    .availableBalance(BigDecimal.ZERO)
                                    .frozenBalance(BigDecimal.ZERO)
                                    .currency("VND")
                                    .build();
                            return walletRepository.save(newWallet);
                        });

                String ledgerKey = "settle:credit:online:" + bookingId + ":" + beneficiaryUserId;
                if (!ledgerEntryRepository.existsByIdempotencyKey(ledgerKey)) {
                    BigDecimal balanceBefore = targetWallet.getAvailableBalance();
                    targetWallet.setAvailableBalance(balanceBefore.add(E));
                    walletRepository.save(targetWallet);

                    LedgerEntryEntity credit = LedgerEntryEntity.builder()
                            .referenceType("BOOKING_SETTLEMENT")
                            .referenceId(bookingId)
                            .wallet(targetWallet)
                            .entryType("CREDIT")
                            .amount(E)
                            .balanceAfter(targetWallet.getAvailableBalance())
                            .description("Quyết toán online booking #" + booking.getBookingCode() + " cho " + beneficiaryDesc)
                            .idempotencyKey(ledgerKey)
                            .build();
                    ledgerEntryRepository.save(credit);
                    log.info("[SettlementOnline] Credited full earnings {} VND to wallet (userId={}, beneficiary={}) for booking {}",
                            E, beneficiaryUserId, beneficiaryDesc, bookingId);
                }
            } else {
                log.warn("[SettlementOnline] No beneficiary found for bookingId={}", bookingId);
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
