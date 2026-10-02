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
        return toWalletRes(wallet, entries, null);
    }

    public CustomerWalletRes toWalletRes(WalletEntity wallet, List<LedgerEntryEntity> entries, java.util.Map<Long, String> bookingHoldStatusMap) {
        if (wallet == null) {
            return null;
        }

        List<CustomerWalletTransactionRes> txResList = new ArrayList<>();
        if (entries != null) {
            for (LedgerEntryEntity entry : entries) {
                if (entry != null) {
                    String holdStatus = null;
                    if ("BOOKING_DEPOSIT".equals(entry.getReferenceType()) && entry.getReferenceId() != null && bookingHoldStatusMap != null) {
                        holdStatus = bookingHoldStatusMap.get(entry.getReferenceId());
                    }
                    txResList.add(toTransactionRes(entry, holdStatus));
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
        return toTransactionRes(entry, null);
    }

    public CustomerWalletTransactionRes toTransactionRes(LedgerEntryEntity entry, String holdStatus) {
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
                .holdStatus(holdStatus)
                .createdAt(entry.getCreatedAt())
                .build();
    }
}
