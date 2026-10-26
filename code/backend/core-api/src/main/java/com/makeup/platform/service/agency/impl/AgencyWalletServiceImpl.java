package com.makeup.platform.service.agency.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.response.wallet.AgencyWalletRes;
import com.makeup.platform.dto.response.wallet.CustomerWalletTransactionRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.wallet.WalletEntity;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.wallet.LedgerEntryRepository;
import com.makeup.platform.repository.wallet.WalletHoldRepository;
import com.makeup.platform.repository.wallet.WalletRepository;
import com.makeup.platform.service.agency.AgencyWalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgencyWalletServiceImpl implements AgencyWalletService {

    private final AgencyProfileRepository agencyProfileRepository;
    private final WalletRepository walletRepository;
    private final WalletHoldRepository walletHoldRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;

    @Override
    @Transactional(readOnly = true)
    public AgencyWalletRes getAgencyWalletInfo(Long agencyOwnerUserId) {
        AgencyProfileEntity agency = agencyProfileRepository.findByOwnerId(agencyOwnerUserId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_AGENCY_NOT_FOUND,
                        "agency.not_found", HttpStatus.NOT_FOUND));

        UserEntity ownerUser = agency.getOwner();
        if (ownerUser == null) {
            ownerUser = userRepository.findById(agencyOwnerUserId)
                    .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_USER_NOT_FOUND,
                            "auth.user_not_found", HttpStatus.NOT_FOUND));
        }

        final UserEntity finalOwner = ownerUser;
        WalletEntity wallet = walletRepository.findByUserId(agencyOwnerUserId)
                .orElseGet(() -> {
                    log.info("[AgencyWallet] Wallet not found for agency owner {}, creating default wallet", agencyOwnerUserId);
                    WalletEntity newWallet = WalletEntity.builder()
                            .user(finalOwner)
                            .availableBalance(BigDecimal.ZERO)
                            .frozenBalance(BigDecimal.ZERO)
                            .currency("VND")
                            .build();
                    return walletRepository.save(newWallet);
                });

        // 1. Tiền cọc đang giữ của các đơn đang hoạt động của Studio
        BigDecimal pendingEscrow = walletHoldRepository.sumActiveHoldsByAgencyId(agency.getId());
        if (pendingEscrow == null) {
            pendingEscrow = BigDecimal.ZERO;
        }

        // 2. Thống kê lũy kế các dòng tiền từ ledger_entries
        BigDecimal totalRevenueSettled = ledgerEntryRepository.sumSettledRevenueByWalletId(wallet.getId());
        BigDecimal totalClawback = ledgerEntryRepository.sumClawbackByWalletId(wallet.getId());
        BigDecimal totalOvertimePaid = ledgerEntryRepository.sumOvertimePaidByWalletId(wallet.getId());

        // 3. Danh sách bút toán giao dịch sổ cái mới nhất
        List<CustomerWalletTransactionRes> recentTransactions = ledgerEntryRepository
                .findAllByWalletIdOrderByCreatedAtDesc(wallet.getId(), PageRequest.of(0, 100))
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

        return AgencyWalletRes.builder()
                .walletId(wallet.getId())
                .agencyId(agency.getId())
                .agencyName(agency.getAgencyName())
                .availableBalance(wallet.getAvailableBalance() != null ? wallet.getAvailableBalance() : BigDecimal.ZERO)
                .frozenBalance(wallet.getFrozenBalance() != null ? wallet.getFrozenBalance() : BigDecimal.ZERO)
                .pendingEscrowAmount(pendingEscrow)
                .totalRevenueSettled(totalRevenueSettled != null ? totalRevenueSettled : BigDecimal.ZERO)
                .totalClawback(totalClawback != null ? totalClawback : BigDecimal.ZERO)
                .totalOvertimePaid(totalOvertimePaid != null ? totalOvertimePaid : BigDecimal.ZERO)
                .currency(wallet.getCurrency() != null ? wallet.getCurrency() : "VND")
                .recentTransactions(recentTransactions)
                .build();
    }
}
