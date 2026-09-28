package com.makeup.platform.service.payment.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.entity.payment.PaymentTransactionEntity;
import com.makeup.platform.repository.payment.PaymentTransactionRepository;
import com.makeup.platform.service.payment.PaymentWebhookProcessor;
import com.makeup.platform.service.payment.gateway.GatewayPaymentResult;
import com.makeup.platform.service.payment.gateway.PaymentGatewayRegistry;
import com.makeup.platform.service.payment.gateway.PaymentGatewayStrategy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentWebhookProcessorImpl implements PaymentWebhookProcessor {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final PaymentGatewayRegistry gatewayRegistry;
    private final PaymentTransactionRepository paymentTransactionRepository;

    @Override
    @Transactional
    public Object processWebhook(String gatewayCode, Map<String, String> queryParams, String rawBody) {
        PaymentGatewayStrategy strategy = gatewayRegistry.getStrategy(gatewayCode);

        GatewayPaymentResult result = strategy.verifyAndParseCallback(queryParams, rawBody);
        if (result == null || result.getPaymentCode() == null) {
            log.warn("Failed to parse valid payment code from callback for gateway: {}", gatewayCode);
            throw new CustomBusinessException(ErrorCodes.ERR_PAYMENT_TRANSACTION_NOT_FOUND, "ERR_PAYMENT_TRANSACTION_NOT_FOUND");
        }

        PaymentTransactionEntity transaction = paymentTransactionRepository.findByPaymentCodeWithLock(result.getPaymentCode())
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_PAYMENT_TRANSACTION_NOT_FOUND, "ERR_PAYMENT_TRANSACTION_NOT_FOUND"));

        // Idempotency: Kiểm tra nếu giao dịch đã có kết quả trước đó
        if (!"PENDING".equalsIgnoreCase(transaction.getStatus())) {
            log.info("Payment {} already processed with status: {}. Returning ACK to gateway.", transaction.getPaymentCode(), transaction.getStatus());
            return strategy.callbackAcknowledgement(result);
        }

        // Kiểm tra đối soát số tiền
        if (result.getAmount() != null && transaction.getAmount().compareTo(result.getAmount()) != 0) {
            log.error("Amount mismatch for payment {}: expected {}, received {}", transaction.getPaymentCode(), transaction.getAmount(), result.getAmount());
            throw new CustomBusinessException(ErrorCodes.ERR_PAYMENT_AMOUNT_MISMATCH, "ERR_PAYMENT_AMOUNT_MISMATCH");
        }

        transaction.setGatewayRequestId(result.getGatewayRequestId());
        transaction.setGatewayTransactionId(result.getGatewayTransactionId());

        if (result.isSuccessful()) {
            transaction.setStatus("SUCCESS");
            transaction.setPaidAt(result.getPaidAt() != null ? result.getPaidAt() : OffsetDateTime.now(VIETNAM_ZONE));
            // Lưu ý: walletPostingStatus vẫn giữ nguyên là NOT_POSTED (chờ hạch toán sổ cái ở Mốc 2)
            log.info("Payment {} confirmed SUCCESS from gateway {}. Ready for ledger posting.", transaction.getPaymentCode(), gatewayCode);
        } else {
            transaction.setStatus("FAILED");
            log.warn("Payment {} FAILED from gateway {}. Response code: {}", transaction.getPaymentCode(), gatewayCode, result.getResponseCode());
        }

        paymentTransactionRepository.save(transaction);

        return strategy.callbackAcknowledgement(result);
    }
}
