package com.makeup.platform.mapper.wallet;

import com.makeup.platform.dto.response.wallet.CustomerWalletRes;
import com.makeup.platform.dto.response.wallet.CustomerWalletTransactionRes;
import com.makeup.platform.entity.wallet.LedgerEntryEntity;
import com.makeup.platform.entity.wallet.WalletEntity;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class CustomerWalletMapper {

    public CustomerWalletRes toWalletRes(WalletEntity wallet, List<LedgerEntryEntity> entries) {
        if (wallet == null) {
            return null;
        }

        List<CustomerWalletTransactionRes> txResList = new ArrayList<>();
        if (entries != null) {
            for (LedgerEntryEntity entry : entries) {
                if (entry != null) {
                    txResList.add(toTransactionRes(entry));
                }
            }
        }

        return CustomerWalletRes.builder()
                .walletId(wallet.getId())
                .availableBalance(wallet.getAvailableBalance())
                .frozenBalance(wallet.getFrozenBalance())
                .currency(wallet.getCurrency())
                .recentTransactions(txResList)
                .build();
    }

    public CustomerWalletTransactionRes toTransactionRes(LedgerEntryEntity entry) {
        if (entry == null) {
            return null;
        }

        return CustomerWalletTransactionRes.builder()
                .id(entry.getId())
                .entryType(entry.getEntryType())
                .amount(entry.getAmount())
                .balanceAfter(entry.getBalanceAfter())
                .referenceType(entry.getReferenceType())
                .referenceId(entry.getReferenceId())
                .description(entry.getDescription())
                .createdAt(entry.getCreatedAt())
                .build();
    }
}
