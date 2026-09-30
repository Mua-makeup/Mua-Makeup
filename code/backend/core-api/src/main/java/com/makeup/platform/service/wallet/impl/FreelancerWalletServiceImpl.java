package com.makeup.platform.service.wallet.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.response.wallet.FreelancerWalletRes;
import com.makeup.platform.entity.wallet.WalletEntity;
import com.makeup.platform.repository.wallet.WalletHoldRepository;
import com.makeup.platform.repository.wallet.WalletRepository;
import com.makeup.platform.service.wallet.FreelancerWalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Slf4j
@Service
@RequiredArgsConstructor
public class FreelancerWalletServiceImpl implements FreelancerWalletService {

    private final WalletRepository walletRepository;
    private final WalletHoldRepository walletHoldRepository;

    @Override
    @Transactional(readOnly = true)
    public FreelancerWalletRes getWalletInfo(Long muaUserId) {
        WalletEntity wallet = walletRepository.findByUserId(muaUserId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_WALLET_NOT_FOUND,
                        "wallet.not_found", HttpStatus.NOT_FOUND));

        BigDecimal depositsHeld = walletHoldRepository.sumActiveHoldsByMuaUserId(muaUserId);

        return FreelancerWalletRes.builder()
                .walletId(wallet.getId())
                .availableBalance(wallet.getAvailableBalance())
                .frozenBalance(wallet.getFrozenBalance())
                .bookingDepositsHeld(depositsHeld)
                .currency(wallet.getCurrency())
                .build();
    }
}
