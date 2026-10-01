package com.makeup.platform.service.payment.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.entity.payment.PaymentTransactionEntity;
import com.makeup.platform.repository.payment.PaymentTransactionRepository;
import com.makeup.platform.service.payment.BookingDepositService;
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
    private final BookingDepositService bookingDepositService;

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
            log.info("Payment {} confirmed SUCCESS from gateway {}. Ready for deposit application.", transaction.getPaymentCode(), gatewayCode);
        } else {
            transaction.setStatus("FAILED");
            log.warn("Payment {} FAILED from gateway {}. Response code: {}", transaction.getPaymentCode(), gatewayCode, result.getResponseCode());
        }

        PaymentTransactionEntity savedTransaction = paymentTransactionRepository.save(transaction);

        // Áp dụng cọc nếu là BOOKING_DEPOSIT và SUCCESS
        if (result.isSuccessful() && "BOOKING_DEPOSIT".equals(savedTransaction.getPurpose())) {
            try {
                bookingDepositService.applyDepositFromPayment(savedTransaction.getId());
            } catch (Exception e) {
                // Lỗi ghi sổ: giữ bằng chứng gateway đã thu, retry qua scheduler
                log.error("Failed to apply deposit for payment {}. Marking REVIEW_REQUIRED.", savedTransaction.getId(), e);
                savedTransaction.setApplicationStatus("REVIEW_REQUIRED");
                savedTransaction.setApplicationError(e.getMessage() != null ? e.getMessage().substring(0, Math.min(255, e.getMessage().length())) : "unknown_error");
                paymentTransactionRepository.save(savedTransaction);
            }
        }

        // Quyết toán online nếu là BOOKING_FINAL_PAYMENT và SUCCESS
        if (result.isSuccessful() && "BOOKING_FINAL_PAYMENT".equals(savedTransaction.getPurpose())) {
            try {
                bookingDepositService.applyFinalPayment(savedTransaction.getId());
            } catch (Exception e) {
                log.error("Failed to apply final payment for payment {}. Marking REVIEW_REQUIRED.", savedTransaction.getId(), e);
                savedTransaction.setApplicationStatus("REVIEW_REQUIRED");
                savedTransaction.setApplicationError(e.getMessage() != null ? e.getMessage().substring(0, Math.min(255, e.getMessage().length())) : "unknown_error");
                paymentTransactionRepository.save(savedTransaction);
            }
        }

        return strategy.callbackAcknowledgement(result);
    }
}
