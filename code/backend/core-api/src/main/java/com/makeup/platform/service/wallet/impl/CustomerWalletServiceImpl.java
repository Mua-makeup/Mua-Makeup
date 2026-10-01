package com.makeup.platform.service.wallet.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.response.wallet.CustomerWalletRes;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.wallet.LedgerEntryEntity;
import com.makeup.platform.entity.wallet.WalletEntity;
import com.makeup.platform.mapper.wallet.CustomerWalletMapper;
import com.makeup.platform.repository.UserRepository;
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
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomerWalletServiceImpl implements CustomerWalletService {

    private final WalletRepository walletRepository;
    private final WalletHoldRepository walletHoldRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final UserRepository userRepository;
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

        BigDecimal activeHolds = walletHoldRepository.sumActiveHoldsByWalletId(wallet.getId());
        if (activeHolds != null) {
            wallet.setFrozenBalance(activeHolds);
        } else if (wallet.getFrozenBalance() == null) {
            wallet.setFrozenBalance(BigDecimal.ZERO);
        }

        Page<LedgerEntryEntity> recentEntriesPage = ledgerEntryRepository
                .findAllByWalletIdOrderByCreatedAtDesc(wallet.getId(), PageRequest.of(0, 20));

        List<LedgerEntryEntity> entries = recentEntriesPage.getContent();

        return customerWalletMapper.toWalletRes(wallet, entries);
    }
}
