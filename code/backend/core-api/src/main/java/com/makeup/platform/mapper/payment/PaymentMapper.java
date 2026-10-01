package com.makeup.platform.mapper.payment;

import com.makeup.platform.dto.response.payment.PaymentDetailRes;
import com.makeup.platform.entity.payment.PaymentTransactionEntity;
import org.springframework.stereotype.Component;

import java.time.ZoneOffset;

@Component
public class PaymentMapper {

    public PaymentDetailRes toPaymentDetailRes(PaymentTransactionEntity entity) {
        if (entity == null) {
            return null;
        }

        return PaymentDetailRes.builder()
                .paymentCode(entity.getPaymentCode())
                .gatewayCode(entity.getPaymentGateway())
                .amount(entity.getAmount())
                .status(entity.getStatus())
                .walletPostingStatus(entity.getWalletPostingStatus())
                .paymentUrl(entity.getPaymentUrl())
                .qrCodeUrl(entity.getQrCodeUrl())
                .paidAt(entity.getPaidAt())
                .walletPostedAt(entity.getWalletPostedAt())
                .createdAt(entity.getCreatedAt() != null ? entity.getCreatedAt().atOffset(ZoneOffset.UTC) : null)
                .build();
    }
}
