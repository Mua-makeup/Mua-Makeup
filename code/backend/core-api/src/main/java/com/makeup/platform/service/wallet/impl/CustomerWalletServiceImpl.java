package com.makeup.platform.service.wallet.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.response.wallet.CustomerWalletRes;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.payment.BookingDepositEntity;
import com.makeup.platform.entity.wallet.LedgerEntryEntity;
import com.makeup.platform.entity.wallet.WalletEntity;
import com.makeup.platform.entity.wallet.WalletHoldEntity;
import com.makeup.platform.mapper.wallet.CustomerWalletMapper;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.payment.BookingDepositRepository;
import com.makeup.platform.repository.wallet.LedgerEntryRepository;
import com.makeup.platform.repository.wallet.WalletHoldRepository;
import com.makeup.platform.repository.wallet.WalletRepository;
import com.makeup.platform.service.wallet.CustomerWalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomerWalletServiceImpl implements CustomerWalletService {

    private final WalletRepository walletRepository;
    private final WalletHoldRepository walletHoldRepository;
    private final BookingDepositRepository bookingDepositRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final CustomerWalletMapper customerWalletMapper;

    @Override
    @Transactional
    public CustomerWalletRes getWalletInfo(Long customerUserId) {
        WalletEntity wallet = walletRepository.findByUserId(customerUserId)
                .orElseGet(() -> {
                    UserEntity user = userRepository.findById(customerUserId)
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

        // 1. Đồng bộ và xác nhận lại trạng thái của các khoản cọc/hold nếu đơn đã xong hoặc hủy
        List<WalletHoldEntity> rawActiveHolds = walletHoldRepository.findAllByWalletIdAndStatus(wallet.getId(), "ACTIVE");
        for (WalletHoldEntity hold : rawActiveHolds) {
            BookingEntity b = hold.getBooking();
            if (b != null) {
                if (b.getStatus() == BookingStatus.COMPLETED || b.getStatus() == BookingStatus.PAID_OUT) {
                    hold.setStatus("CONSUMED");
                    hold.setReleasedAt(OffsetDateTime.now());
                    walletHoldRepository.save(hold);
                } else if (b.getStatus() == BookingStatus.CANCELLED || b.getStatus() == BookingStatus.CANCELLED_EXPIRED) {
                    String depStatus = hold.getDeposit() != null ? hold.getDeposit().getStatus() : null;
                    if ("COMPENSATED_TO_MUA".equalsIgnoreCase(depStatus) || "FORFEITED".equalsIgnoreCase(depStatus)) {
                        hold.setStatus("COMPENSATED_TO_MUA");
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

        // 2. CHỈ tính tổng tiền đang cọc của các đơn ĐANG HOẠT ĐỘNG (chưa hoàn thành)
        BigDecimal activeHolds = walletHoldRepository.sumActiveHoldsByWalletId(wallet.getId());
        wallet.setFrozenBalance(activeHolds != null ? activeHolds : BigDecimal.ZERO);
        walletRepository.save(wallet);

        // 3. Nạp lịch sử biến động số dư kèm trạng thái cọc
        Page<LedgerEntryEntity> recentEntriesPage = ledgerEntryRepository
                .findAllByWalletIdOrderByCreatedAtDesc(wallet.getId(), PageRequest.of(0, 20));

        List<LedgerEntryEntity> entries = recentEntriesPage.getContent();

        Map<Long, String> bookingHoldStatusMap = new HashMap<>();
        Map<Long, String> bookingCodeMap = new HashMap<>();
        for (LedgerEntryEntity entry : entries) {
            if (entry.getReferenceId() != null) {
                Long bookingId = entry.getReferenceId();
                String resolvedStatus = null;

                // Ưu tiên tra cứu trạng thái chính thức trong bảng booking_deposits
                Optional<BookingDepositEntity> depOpt = bookingDepositRepository.findByBookingId(bookingId);
                if (depOpt.isPresent()) {
                    String ds = depOpt.get().getStatus();
                    if ("COMPENSATED_TO_MUA".equalsIgnoreCase(ds) || "FORFEITED".equalsIgnoreCase(ds)) {
                        resolvedStatus = "COMPENSATED_TO_MUA";
                    } else if ("REFUNDED".equalsIgnoreCase(ds)) {
                        resolvedStatus = "REFUNDED";
                    } else if ("PAID".equalsIgnoreCase(ds) || "CONSUMED".equalsIgnoreCase(ds)) {
                        resolvedStatus = "CONSUMED";
                    }
                }

                // Tra cứu thông tin BookingEntity
                Optional<BookingEntity> bOpt = bookingRepository.findById(bookingId);
                if (bOpt.isPresent()) {
                    bookingCodeMap.put(bookingId, bOpt.get().getBookingCode());
                    if (resolvedStatus == null) {
                        BookingStatus bStatus = bOpt.get().getStatus();
                        if (bStatus == BookingStatus.COMPLETED || bStatus == BookingStatus.PAID_OUT) {
                            resolvedStatus = "CONSUMED";
                        } else if (bStatus == BookingStatus.CANCELLED || bStatus == BookingStatus.CANCELLED_EXPIRED) {
                            resolvedStatus = "REFUNDED";
                        }
                    }
                }

                // Nếu chưa xác định thì tra cứu theo WalletHoldEntity
                if (resolvedStatus == null) {
                    resolvedStatus = walletHoldRepository.findTopByBookingIdOrderByIdDesc(bookingId)
                            .map(WalletHoldEntity::getStatus)
                            .orElse("ACTIVE");
                }

                bookingHoldStatusMap.put(bookingId, resolvedStatus);
            }
        }

        return customerWalletMapper.toWalletRes(wallet, entries, bookingHoldStatusMap, bookingCodeMap);
    }
}
