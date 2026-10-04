package com.makeup.platform.mapper.wallet;

import com.makeup.platform.dto.response.wallet.CustomerWalletRes;
import com.makeup.platform.dto.response.wallet.CustomerWalletTransactionRes;
import com.makeup.platform.entity.wallet.LedgerEntryEntity;
import com.makeup.platform.entity.wallet.WalletEntity;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class CustomerWalletMapper {

    public CustomerWalletRes toWalletRes(WalletEntity wallet, List<LedgerEntryEntity> entries) {
        return toWalletRes(wallet, entries, null, null);
    }

    public CustomerWalletRes toWalletRes(WalletEntity wallet, List<LedgerEntryEntity> entries, java.util.Map<Long, String> bookingHoldStatusMap) {
        return toWalletRes(wallet, entries, bookingHoldStatusMap, null);
    }

    public CustomerWalletRes toWalletRes(WalletEntity wallet, List<LedgerEntryEntity> entries,
                                        Map<Long, String> bookingHoldStatusMap,
                                        Map<Long, String> bookingCodeMap) {
        if (wallet == null) {
            return null;
        }

        List<CustomerWalletTransactionRes> txResList = new ArrayList<>();
        if (entries != null) {
            for (LedgerEntryEntity entry : entries) {
                if (entry != null) {
                    String holdStatus = null;
                    String bookingCode = null;
                    if (entry.getReferenceId() != null) {
                        if (bookingHoldStatusMap != null) {
                            holdStatus = bookingHoldStatusMap.get(entry.getReferenceId());
                        }
                        if (bookingCodeMap != null) {
                            bookingCode = bookingCodeMap.get(entry.getReferenceId());
                        }
                    }
                    txResList.add(toTransactionRes(entry, holdStatus, bookingCode));
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
        return toTransactionRes(entry, null, null);
    }

    public CustomerWalletTransactionRes toTransactionRes(LedgerEntryEntity entry, String holdStatus) {
        return toTransactionRes(entry, holdStatus, null);
    }

    public CustomerWalletTransactionRes toTransactionRes(LedgerEntryEntity entry, String holdStatus, String bookingCode) {
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
                .holdStatus("BOOKING_FINAL_PAYMENT".equals(entry.getReferenceType()) ? null : holdStatus)
                .bookingCode(bookingCode)
                .createdAt(entry.getCreatedAt())
                .build();
    }
}
