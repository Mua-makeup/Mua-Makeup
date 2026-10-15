package com.makeup.platform.service.wallet.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.response.wallet.FreelancerBookingDepositItemRes;
import com.makeup.platform.dto.response.wallet.FreelancerWalletRes;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.wallet.LedgerEntryEntity;
import com.makeup.platform.entity.wallet.WalletEntity;
import com.makeup.platform.entity.wallet.WalletHoldEntity;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.payment.BookingDepositRepository;
import com.makeup.platform.repository.wallet.WalletHoldRepository;
import com.makeup.platform.repository.wallet.WalletRepository;
import com.makeup.platform.service.wallet.FreelancerWalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.makeup.platform.entity.agency.AgencyStaffOvertimeReportEntity;
import com.makeup.platform.entity.agency.OvertimeReportStatus;
import com.makeup.platform.repository.AgencyStaffOvertimeReportRepository;
import com.makeup.platform.dto.response.wallet.CustomerWalletTransactionRes;
import com.makeup.platform.repository.wallet.LedgerEntryRepository;
import org.springframework.data.domain.PageRequest;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FreelancerWalletServiceImpl implements FreelancerWalletService {

    private final WalletRepository walletRepository;
    private final WalletHoldRepository walletHoldRepository;
    private final BookingDepositRepository bookingDepositRepository;
    private final UserRepository userRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final BookingRepository bookingRepository;
    private final AgencyStaffOvertimeReportRepository agencyStaffOvertimeReportRepository;

    @Override
    @Transactional
    public FreelancerWalletRes getWalletInfo(Long muaUserId) {
        // Tự động khởi tạo ví rỗng nếu user chưa có ví trong hệ thống (chống lỗi 404)
        WalletEntity wallet = walletRepository.findByUserId(muaUserId)
                .orElseGet(() -> {
                    log.info("[FreelancerWallet] Wallet not found for user {}, auto-initializing default wallet", muaUserId);
                    UserEntity user = userRepository.findById(muaUserId)
                            .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_USER_NOT_FOUND,
                                    "auth.user_not_found", HttpStatus.NOT_FOUND));

                    WalletEntity newWallet = WalletEntity.builder()
                            .user(user)
                            .availableBalance(BigDecimal.ZERO)
                            .frozenBalance(BigDecimal.ZERO)
                            .currency("VND")
                            .build();
                    return walletRepository.save(newWallet);
                });

        // 0. Đồng bộ các khoản phụ cấp tăng ca đã được duyệt của các đơn đã hoàn tất nhưng chưa ghi có vào ví thợ
        syncPendingOvertimeAllowances(muaUserId, wallet);

        // 1. Đồng bộ và xác nhận lại trạng thái của các khoản cọc nếu đơn đã xong hoặc hủy
        List<WalletHoldEntity> rawActiveHolds = walletHoldRepository.findAllByMuaUserIdAndStatus(muaUserId, "ACTIVE");
        for (WalletHoldEntity hold : rawActiveHolds) {
            BookingEntity b = hold.getBooking();
            if (b != null) {
                if (b.getStatus() == BookingStatus.COMPLETED || b.getStatus() == BookingStatus.PAID_OUT || b.getStatus() == BookingStatus.DISPUTE_COMPENSATED) {
                    hold.setStatus("CONSUMED");
                    hold.setReleasedAt(OffsetDateTime.now());
                    walletHoldRepository.save(hold);
                } else if (b.getStatus() == BookingStatus.CANCELLED || b.getStatus() == BookingStatus.CANCELLED_EXPIRED || b.getStatus() == BookingStatus.DISPUTE_REFUNDED) {
                    String depStatus = hold.getDeposit() != null ? hold.getDeposit().getStatus() : null;
                    if ("COMPENSATED_TO_MUA".equalsIgnoreCase(depStatus) || "FORFEITED".equalsIgnoreCase(depStatus)) {
                        hold.setStatus("CONSUMED");
                    } else {
                        hold.setStatus("REFUNDED");
                        if (hold.getDeposit() != null && !"REFUNDED".equals(hold.getDeposit().getStatus())) {
                            hold.getDeposit().setStatus("REFUNDED");
                            bookingDepositRepository.save(hold.getDeposit());
                        }
                    }
                    hold.setReleasedAt(OffsetDateTime.now());
                    walletHoldRepository.save(hold);
                }
            }
        }

        // 2. CHỈ tính tổng tiền đang cọc của các đơn ĐANG HOẠT ĐỘNG
        BigDecimal depositsHeld = walletHoldRepository.sumActiveHoldsByMuaUserId(muaUserId);
        if (depositsHeld == null) {
            depositsHeld = BigDecimal.ZERO;
        }

        // 3. CHỈ trả về danh sách các khoản cọc đang giữ của các đơn chưa hoàn thành
        List<FreelancerBookingDepositItemRes> heldDeposits = walletHoldRepository.findActiveHoldsByMuaUserId(muaUserId)
                .stream()
                .map(h -> FreelancerBookingDepositItemRes.builder()
                        .depositId(h.getDeposit() != null ? h.getDeposit().getId() : null)
                        .bookingId(h.getBooking() != null ? h.getBooking().getId() : null)
                        .bookingCode(h.getBooking() != null ? h.getBooking().getBookingCode() : null)
                        .bookingType(h.getBooking() != null && h.getBooking().getBookingType() != null ? h.getBooking().getBookingType().name() : null)
                        .customerName(h.getBooking() != null && h.getBooking().getCustomer() != null ? h.getBooking().getCustomer().getFullName() : "Khách Hàng")
                        .amount(h.getAmount())
                        .depositAmount(h.getAmount())
                        .depositStatus(h.getStatus())
                        .paidAt(h.getDeposit() != null ? h.getDeposit().getPaidAt() : null)
                        .createdAt(h.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        // 4. Lấy lịch sử biến động số dư (bút toán cộng tiền vào ví thợ từ ledger_entries)
        List<CustomerWalletTransactionRes> recentTransactions = ledgerEntryRepository
                .findAllByWalletIdOrderByCreatedAtDesc(wallet.getId(), PageRequest.of(0, 50))
                .stream()
                .map(e -> {
                    String bCode = null;
                    if (e.getReferenceId() != null) {
                        bCode = bookingRepository.findById(e.getReferenceId())
                                .map(BookingEntity::getBookingCode)
                                .orElse(null);
                    }
                    return CustomerWalletTransactionRes.builder()
                            .id(e.getId())
                            .entryType(e.getEntryType())
                            .amount(e.getAmount())
                            .balanceAfter(e.getBalanceAfter())
                            .referenceType(e.getReferenceType())
                            .referenceId(e.getReferenceId())
                            .bookingCode(bCode)
                            .description(e.getDescription())
                            .createdAt(e.getCreatedAt())
                            .build();
                })
                .collect(Collectors.toList());

        return FreelancerWalletRes.builder()
                .walletId(wallet.getId())
                .availableBalance(wallet.getAvailableBalance() != null ? wallet.getAvailableBalance() : BigDecimal.ZERO)
                .frozenBalance(wallet.getFrozenBalance() != null ? wallet.getFrozenBalance() : BigDecimal.ZERO)
                .bookingDepositsHeld(depositsHeld)
                .currency(wallet.getCurrency() != null ? wallet.getCurrency() : "VND")
                .heldDeposits(heldDeposits)
                .recentTransactions(recentTransactions)
                .build();
    }

    private void syncPendingOvertimeAllowances(Long muaUserId, WalletEntity staffWallet) {
        try {
            List<AgencyStaffOvertimeReportEntity> allReports = agencyStaffOvertimeReportRepository.findAll();
            for (AgencyStaffOvertimeReportEntity ot : allReports) {
                if (ot.getStatus() == OvertimeReportStatus.APPROVED_WAIVED && ot.getPenaltyAmountApplied() != null
                        && ot.getPenaltyAmountApplied().compareTo(BigDecimal.ZERO) > 0) {

                    if (ot.getStaff() != null && ot.getStaff().getMua() != null && ot.getStaff().getMua().getUser() != null
                            && ot.getStaff().getMua().getUser().getId().equals(muaUserId)) {

                        String creditKey = "ot:credit:booking:" + ot.getBookingId() + ":staff:" + muaUserId;
                        String debitKey = "ot:debit:booking:" + ot.getBookingId() + ":staff:" + muaUserId;

                        if (!ledgerEntryRepository.existsByIdempotencyKey(creditKey)) {
                            BookingEntity booking = bookingRepository.findById(ot.getBookingId()).orElse(null);
                            if (booking != null && (booking.getStatus() == BookingStatus.COMPLETED || booking.getStatus() == BookingStatus.PAID_OUT)) {
                                BigDecimal allowance = ot.getPenaltyAmountApplied();

                                // 1. Trừ ví Studio nếu chưa trừ
                                if (ot.getAgency() != null && ot.getAgency().getOwner() != null && !ledgerEntryRepository.existsByIdempotencyKey(debitKey)) {
                                    UserEntity owner = ot.getAgency().getOwner();
                                    walletRepository.findByUserIdWithLock(owner.getId()).ifPresent(ownerWallet -> {
                                        BigDecimal bBefore = ownerWallet.getAvailableBalance() != null ? ownerWallet.getAvailableBalance() : BigDecimal.ZERO;
                                        BigDecimal deductAmount = bBefore.min(allowance);
                                        if (deductAmount.compareTo(BigDecimal.ZERO) > 0) {
                                            ownerWallet.setAvailableBalance(bBefore.subtract(deductAmount));
                                            walletRepository.save(ownerWallet);

                                            String sName = ot.getStaff().getMua().getUser().getFullName();
                                            LedgerEntryEntity debitEntry = LedgerEntryEntity.builder()
                                                    .referenceType("OVERTIME_PAYMENT")
                                                    .referenceId(ot.getId())
                                                    .wallet(ownerWallet)
                                                    .entryType("DEBIT")
                                                    .amount(deductAmount)
                                                    .balanceAfter(ownerWallet.getAvailableBalance())
                                                    .description(String.format("Chi trả phụ cấp làm thêm giờ đơn #%s cho thợ %s (-%s đ)",
                                                            booking.getBookingCode(), sName, String.format("%,d", deductAmount.longValue())))
                                                    .idempotencyKey(debitKey)
                                                    .build();
                                            ledgerEntryRepository.save(debitEntry);
                                            log.info("[FreelancerWallet] Debited pending overtime {} VND from agency owner userId={}", deductAmount, owner.getId());
                                        } else {
                                            log.warn("[FreelancerWallet] Agency owner userId={} has insufficient balance ({}) for overtime allowance {}, skipping debit to prevent constraint violation",
                                                    owner.getId(), bBefore, allowance);
                                        }
                                    });
                                }

                                // 2. Cộng ví thợ
                                BigDecimal curBalance = staffWallet.getAvailableBalance() != null ? staffWallet.getAvailableBalance() : BigDecimal.ZERO;
                                staffWallet.setAvailableBalance(curBalance.add(allowance));
                                walletRepository.save(staffWallet);

                                LedgerEntryEntity creditEntry = LedgerEntryEntity.builder()
                                        .referenceType("OVERTIME_ALLOWANCE")
                                        .referenceId(ot.getId())
                                        .wallet(staffWallet)
                                        .entryType("CREDIT")
                                        .amount(allowance)
                                        .balanceAfter(staffWallet.getAvailableBalance())
                                        .description(String.format("Nhận phụ cấp làm thêm giờ đơn #%s (+%d phút) từ Studio (+%s đ)",
                                                booking.getBookingCode(), ot.getOvertimeMinutes(), String.format("%,d", allowance.longValue())))
                                        .idempotencyKey(creditKey)
                                        .build();
                                ledgerEntryRepository.save(creditEntry);

                                log.info("[FreelancerWallet] Synced pending overtime allowance {} VND for staff userId={} reportId={}",
                                        allowance, muaUserId, ot.getId());
                            }
                        }
                    }
                }
            }
        } catch (Exception ex) {
            log.warn("[FreelancerWallet] Could not sync overtime allowances for user {}: {}", muaUserId, ex.getMessage());
        }
    }
}
