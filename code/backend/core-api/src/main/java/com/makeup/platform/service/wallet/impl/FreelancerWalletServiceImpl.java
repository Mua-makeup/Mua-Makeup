package com.makeup.platform.service.wallet.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.response.wallet.FreelancerBookingDepositItemRes;
import com.makeup.platform.dto.response.wallet.FreelancerWalletRes;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStatus;
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
}
