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
import com.makeup.platform.entity.agency.AgencyStaffOvertimeReportEntity;
import com.makeup.platform.entity.agency.OvertimeReportStatus;
import com.makeup.platform.repository.AgencyStaffOvertimeReportRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.booking.BookingStaffAssignmentRepository;
import com.makeup.platform.repository.mua.MUACalendarRepository;
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
    private final AgencyStaffOvertimeReportRepository agencyStaffOvertimeReportRepository;
    private final MUACalendarRepository muaCalendarRepository;

    @Override
    @Transactional
    public void settleBooking(Long bookingId, BigDecimal commissionRate) {
        guardStudioSettlement(bookingId);
        // Idempotency check
        if (settlementRepository.existsByBookingId(bookingId)) {
            log.info("[Settlement] Booking {} already settled, ensuring booking status is PAID_OUT", bookingId);
            BookingEntity booking = bookingRepository.findById(bookingId).orElse(null);
            if (booking != null && booking.getStatus() != BookingStatus.PAID_OUT) {
                booking.setStatus(BookingStatus.PAID_OUT);
                bookingRepository.save(booking);
            }
            try {
                muaCalendarRepository.deleteByBookingId(bookingId);
            } catch (Exception ignored) {}
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

        // Tính T/D/C/F/E
        // T: tổng hóa đơn cuối
        BigDecimal T = booking.getTotalAmount();
        // D: tiền cọc (có thể = 0 nếu thanh toán tiền mặt toàn bộ)
        BigDecimal D = deposit.getPaidAmount() != null ? deposit.getPaidAmount() : BigDecimal.ZERO;
        // C: tiền mặt khách trả thợ (xác nhận bởi cả hai)
        BigDecimal C = cashReceipt.getExpectedAmount() != null ? cashReceipt.getExpectedAmount() : BigDecimal.ZERO;
        // F: phí nền tảng
        BigDecimal F = T.multiply(commissionRate).setScale(0, RoundingMode.HALF_UP);
        // E: doanh thu ròng sau phí nền tảng = T - F
        // Đây là tổng phải phân chia cho thợ + studio
        BigDecimal E = T.subtract(F);

        // Xác định trạng thái settlement:
        // - Khi có tiền mặt (C > 0): luôn SETTLED vì khách đã trả thực tế.
        // - Chỉ PENDING_FEE_COLLECTION khi không có tiền mặt VÀ cọc không đủ bù phí (D < F).
        boolean hasCashPayment = C.compareTo(BigDecimal.ZERO) > 0;
        BigDecimal N = D.subtract(F); // Giá trị tham chiếu nội bộ, dùng để kiểm tra escrow coverage

        String settlementStatus;
        String failureReason = null;

        if (!hasCashPayment && N.compareTo(BigDecimal.ZERO) < 0) {
            log.warn("[Settlement] Booking {} has N={} < 0 and no cash payment. commissionRate={}, D={}, F={}. Setting PENDING_FEE_COLLECTION.",
                    bookingId, N, commissionRate, D, F);
            settlementStatus = "PENDING_FEE_COLLECTION";
            failureReason = "commission_exceeds_deposit_N=" + N;
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
                if (sa.getStaff() != null && sa.getStaff().getMua() != null && sa.getStaff().getMua().getUser() != null) {
                    BigDecimal staffEarnings = (sa.getCommissionAmount() != null && sa.getCommissionAmount().compareTo(BigDecimal.ZERO) > 0)
                            ? sa.getCommissionAmount()
                            : (sa.getCommissionRate() != null && sa.getCommissionRate().compareTo(BigDecimal.ZERO) > 0
                                    ? T.multiply(sa.getCommissionRate()).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
                                    : BigDecimal.ZERO);

                    if (staffEarnings.compareTo(BigDecimal.ZERO) > 0) {
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
                            String rawNote = sa.getCommissionNote() != null ? sa.getCommissionNote().trim() : "";
                            String detailPart;
                            if (!rawNote.isEmpty()) {
                                if (rawNote.startsWith(roleLabel) || rawNote.startsWith("Thợ chính") || rawNote.startsWith("Thợ phụ")
                                        || rawNote.startsWith("Lead Artist") || rawNote.startsWith("Assistant Artist")) {
                                    detailPart = rawNote;
                                } else {
                                    detailPart = roleLabel + " - " + rawNote;
                                }
                            } else {
                                BigDecimal rate = sa.getCommissionRate() != null ? sa.getCommissionRate() : BigDecimal.ZERO;
                                detailPart = roleLabel + " (" + rate + "%)";
                            }

                            LedgerEntryEntity credit = LedgerEntryEntity.builder()
                                    .referenceType("BOOKING_SETTLEMENT")
                                    .referenceId(bookingId)
                                    .wallet(staffWallet)
                                    .entryType("CREDIT")
                                    .amount(staffEarnings)
                                    .balanceAfter(staffWallet.getAvailableBalance())
                                    .description("Quyết toán ca #" + booking.getBookingCode() + " (" + detailPart + ")")
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
            }

            // Ghi có phần doanh thu studio = E - totalStaffPayout
            // Công thức: Doanh thu Studio = T - F - tổng_hoa_hồng_thợ
            // Dùng E (= T - F) thay vì N (= D - F) để đúng cả trường hợp tiền mặt (D = 0)
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

                    String ledgerKey = "settle:credit:agency:" + bookingId + ":" + ownerId;
                    if (!ledgerEntryRepository.existsByIdempotencyKey(ledgerKey)) {
                        BigDecimal balanceBefore = ownerWallet.getAvailableBalance() != null ? ownerWallet.getAvailableBalance() : BigDecimal.ZERO;
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
                                .description("Quyết toán booking #" + booking.getBookingCode() + " cho Agency " + agencyName + " (doanh thu studio = T-F-hoa_hồng_thợ)")
                                .idempotencyKey(ledgerKey)
                                .build();
                        ledgerEntryRepository.save(credit);

                        log.info("[Settlement] Credited remaining deposit {} VND to agency owner wallet (userId={}) for booking {}",
                                agencyRemaining, ownerId, bookingId);
                    }
                }
            }

            // Tự động quyết toán phụ cấp tăng ca độc lập: trừ ví Studio và cộng ví Thợ
            processOvertimeAllowances(booking);
        } else if (E.compareTo(BigDecimal.ZERO) > 0) {
            // Trường hợp không có staff assignment: ghi toàn bộ E (= T - F) vào ví owner
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
                    targetWallet.setAvailableBalance(balanceBefore.add(E));
                    walletRepository.save(targetWallet);

                    LedgerEntryEntity credit = LedgerEntryEntity.builder()
                            .referenceType("BOOKING_SETTLEMENT")
                            .referenceId(bookingId)
                            .wallet(targetWallet)
                            .entryType("CREDIT")
                            .amount(E)
                            .balanceAfter(targetWallet.getAvailableBalance())
                            .description("Quyết toán booking #" + booking.getBookingCode() + " cho " + beneficiaryDesc + " (E=T-F, tiền mặt)")
                            .idempotencyKey(ledgerKey)
                            .build();
                    ledgerEntryRepository.save(credit);

                    log.info("[Settlement] Credited {} VND to wallet (userId={}, beneficiary={}) for booking {}",
                            E, beneficiaryUserId, beneficiaryDesc, bookingId);
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

        try {
            muaCalendarRepository.deleteByBookingId(bookingId);
            log.info("[Settlement] Released calendar slots for settled bookingId={}", bookingId);
        } catch (Exception ex) {
            log.warn("[Settlement] Failed to delete calendar slots for bookingId={}: {}", bookingId, ex.getMessage());
        }

        log.info("[Settlement] Booking {} settled. T={} D={} C={} F={} E={} hasCash={} Status={}",
                bookingId, T, D, C, F, E, hasCashPayment, settlementStatus);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void settleBookingOnlinePayment(Long bookingId, BigDecimal commissionRate) {
        settleBookingOnlinePaymentInTransaction(bookingId, commissionRate);
    }

    @Override
    @Transactional
    public void settleBookingOnlinePaymentInTransaction(Long bookingId, BigDecimal commissionRate) {
        guardStudioSettlement(bookingId);
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
                if (sa.getStaff() != null && sa.getStaff().getMua() != null && sa.getStaff().getMua().getUser() != null) {
                    BigDecimal staffEarnings = (sa.getCommissionAmount() != null && sa.getCommissionAmount().compareTo(BigDecimal.ZERO) > 0)
                            ? sa.getCommissionAmount()
                            : (sa.getCommissionRate() != null && sa.getCommissionRate().compareTo(BigDecimal.ZERO) > 0
                                    ? T.multiply(sa.getCommissionRate()).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
                                    : BigDecimal.ZERO);

                    if (staffEarnings.compareTo(BigDecimal.ZERO) > 0) {
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
                            String rawNote = sa.getCommissionNote() != null ? sa.getCommissionNote().trim() : "";
                            String detailPart;
                            if (!rawNote.isEmpty()) {
                                if (rawNote.startsWith(roleLabel) || rawNote.startsWith("Thợ chính") || rawNote.startsWith("Thợ phụ")
                                        || rawNote.startsWith("Lead Artist") || rawNote.startsWith("Assistant Artist")) {
                                    detailPart = rawNote;
                                } else {
                                    detailPart = roleLabel + " - " + rawNote;
                                }
                            } else {
                                BigDecimal rate = sa.getCommissionRate() != null ? sa.getCommissionRate() : BigDecimal.ZERO;
                                detailPart = roleLabel + " (" + rate + "%)";
                            }

                            LedgerEntryEntity credit = LedgerEntryEntity.builder()
                                    .referenceType("BOOKING_SETTLEMENT")
                                    .referenceId(bookingId)
                                    .wallet(staffWallet)
                                    .entryType("CREDIT")
                                    .amount(staffEarnings)
                                    .balanceAfter(staffWallet.getAvailableBalance())
                                    .description("Quyết toán online ca #" + booking.getBookingCode() + " (" + detailPart + ")")
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

            // Tự động quyết toán phụ cấp tăng ca độc lập: trừ ví Studio và cộng ví Thợ
            processOvertimeAllowances(booking);
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

        try {
            muaCalendarRepository.deleteByBookingId(bookingId);
            log.info("[SettlementOnline] Released calendar slots for settled bookingId={}", bookingId);
        } catch (Exception ex) {
            log.warn("[SettlementOnline] Failed to delete calendar slots for bookingId={}: {}", bookingId, ex.getMessage());
        }

        log.info("[SettlementOnline] Booking {} settled online. T={} D={} F={} E={}", bookingId, T, D, F, E);
    }

    @Override
    @Transactional
    public void retryPendingSettlements() {
        // Placeholder: xử lý các settlement ở trạng thái PENDING > 5 phút
        log.debug("[Settlement] Retry pending settlements check.");
    }

    @Override
    @Transactional
    public void processOvertimeAllowancesForBooking(Long bookingId) {
        if (bookingId == null) return;
        bookingRepository.findById(bookingId).ifPresent(this::processOvertimeAllowances);
    }

    private void processOvertimeAllowances(BookingEntity booking) {
        if (booking == null || booking.getAgency() == null || booking.getAgency().getOwner() == null) {
            return;
        }
        UserEntity agencyOwner = booking.getAgency().getOwner();
        Long ownerId = agencyOwner.getId();

        try {
            List<AgencyStaffOvertimeReportEntity> otReports = agencyStaffOvertimeReportRepository.findByBookingId(booking.getId());
            if (otReports == null || otReports.isEmpty()) {
                return;
            }

            for (AgencyStaffOvertimeReportEntity ot : otReports) {
                if (ot.getStatus() == OvertimeReportStatus.APPROVED_WAIVED && ot.getPenaltyAmountApplied() != null
                        && ot.getPenaltyAmountApplied().compareTo(BigDecimal.ZERO) > 0) {

                    BigDecimal allowanceAmount = ot.getPenaltyAmountApplied();
                    Long staffUserId = (ot.getStaff() != null && ot.getStaff().getMua() != null && ot.getStaff().getMua().getUser() != null)
                            ? ot.getStaff().getMua().getUser().getId() : (ot.getStaff() != null ? ot.getStaff().getId() : ot.getId());
                    String debitKey = "ot:debit:booking:" + booking.getId() + ":staff:" + staffUserId;
                    String creditKey = "ot:credit:booking:" + booking.getId() + ":staff:" + staffUserId;

                    String staffName = (ot.getStaff() != null && ot.getStaff().getMua() != null && ot.getStaff().getMua().getUser() != null)
                            ? ot.getStaff().getMua().getUser().getFullName() : "nhân sự";

                    // 1. Trừ tiền từ Ví Studio (Agency Owner Wallet - DEBIT)
                    if (!ledgerEntryRepository.existsByIdempotencyKey(debitKey)) {
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

                        BigDecimal ownerBalanceBefore = ownerWallet.getAvailableBalance() != null ? ownerWallet.getAvailableBalance() : BigDecimal.ZERO;
                        BigDecimal deductAmount = ownerBalanceBefore.min(allowanceAmount);
                        if (deductAmount.compareTo(BigDecimal.ZERO) > 0) {
                            ownerWallet.setAvailableBalance(ownerBalanceBefore.subtract(deductAmount));
                            walletRepository.save(ownerWallet);

                            LedgerEntryEntity debitEntry = LedgerEntryEntity.builder()
                                    .referenceType("OVERTIME_PAYMENT")
                                    .referenceId(ot.getId())
                                    .wallet(ownerWallet)
                                    .entryType("DEBIT")
                                    .amount(deductAmount)
                                    .balanceAfter(ownerWallet.getAvailableBalance())
                                    .description(String.format("Chi trả phụ cấp làm thêm giờ đơn #%s cho thợ %s (-%s đ)",
                                            booking.getBookingCode(), staffName, String.format("%,d", deductAmount.longValue())))
                                    .idempotencyKey(debitKey)
                                    .build();
                            ledgerEntryRepository.save(debitEntry);
                            log.info("[Settlement] Debited overtime allowance {} VND from agency owner userId={} for reportId={}",
                                    deductAmount, ownerId, ot.getId());
                        } else {
                            log.warn("[Settlement] Agency owner userId={} has insufficient balance ({}) for overtime allowance {}, skipping debit to satisfy non-negative check",
                                    ownerId, ownerBalanceBefore, allowanceAmount);
                        }
                    }

                    // 2. Cộng tiền vào Ví Thợ (Staff Wallet - CREDIT)
                    if (ot.getStaff() != null && ot.getStaff().getMua() != null && ot.getStaff().getMua().getUser() != null) {
                        UserEntity staffUser = ot.getStaff().getMua().getUser();
                        if (!ledgerEntryRepository.existsByIdempotencyKey(creditKey)) {
                            WalletEntity staffWallet = walletRepository.findByUserIdWithLock(staffUser.getId())
                                    .orElseGet(() -> {
                                        WalletEntity newWallet = WalletEntity.builder()
                                                .user(staffUser)
                                                .availableBalance(BigDecimal.ZERO)
                                                .frozenBalance(BigDecimal.ZERO)
                                                .currency("VND")
                                                .build();
                                        return walletRepository.save(newWallet);
                                    });

                            BigDecimal staffBalanceBefore = staffWallet.getAvailableBalance() != null ? staffWallet.getAvailableBalance() : BigDecimal.ZERO;
                            staffWallet.setAvailableBalance(staffBalanceBefore.add(allowanceAmount));
                            walletRepository.save(staffWallet);

                            LedgerEntryEntity creditEntry = LedgerEntryEntity.builder()
                                    .referenceType("OVERTIME_ALLOWANCE")
                                    .referenceId(ot.getId())
                                    .wallet(staffWallet)
                                    .entryType("CREDIT")
                                    .amount(allowanceAmount)
                                    .balanceAfter(staffWallet.getAvailableBalance())
                                    .description(String.format("Nhận phụ cấp làm thêm giờ đơn #%s (+%d phút) từ Studio (+%s đ)",
                                            booking.getBookingCode(), ot.getOvertimeMinutes(), String.format("%,d", allowanceAmount.longValue())))
                                    .idempotencyKey(creditKey)
                                    .build();
                            ledgerEntryRepository.save(creditEntry);
                            log.info("[Settlement] Credited overtime allowance {} VND to staff userId={} for reportId={}",
                                    allowanceAmount, staffUser.getId(), ot.getId());
                        }
                    }
                }
            }
        } catch (Exception ex) {
            log.error("[Settlement] Error processing overtime allowances for booking {}: {}", booking.getId(), ex.getMessage(), ex);
        }
    }
    private void guardStudioSettlement(Long bookingId) {
        var booking = bookingRepository.findById(bookingId).orElse(null);
        if (booking != null && booking.getAgency() != null) {
            booking = bookingRepository.findByIdForUpdate(bookingId).orElseThrow();
            if (booking.getStatus() != BookingStatus.COMPLETED && booking.getStatus() != BookingStatus.PAID_OUT) {
                throw new CustomBusinessException(ErrorCodes.ERR_INVALID_STATE_TRANSITION,
                        "dispute.payment_reconciliation_required", HttpStatus.CONFLICT);
            }
        }
    }
}
