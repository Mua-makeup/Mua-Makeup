package com.makeup.platform.service.payment.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.repository.payment.PaymentTransactionRepository;
import com.makeup.platform.service.payment.BookingDepositService;
import com.makeup.platform.service.payment.gateway.PaymentGatewayRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.OffsetDateTime;

@Service
@RequiredArgsConstructor
public class FinalPaymentReconciliationService {
    private final PaymentTransactionRepository payments;
    private final PaymentGatewayRegistry gateways;
    private final BookingDepositService deposits;

    // The payment lock also serializes this path with a delayed gateway callback.
    @Transactional
    public void reconcile(String paymentCode) {
        var payment = payments.findByPaymentCodeWithLock(paymentCode).orElseThrow();
        if (!"BOOKING_FINAL_PAYMENT".equals(payment.getPurpose()) ||
                ("APPLIED".equals(payment.getApplicationStatus()) && "POSTED".equals(payment.getWalletPostingStatus()))) return;
        if (!"SUCCESS".equals(payment.getStatus())) {
            var strategy = gateways.getStrategy(payment.getPaymentGateway());
            var result = strategy.queryTransaction(payment);
            if (result == null || !result.isSuccessful()) return;
            if (!paymentCode.equals(result.getPaymentCode()) ||
                    !payment.getPaymentGateway().equals(result.getGatewayCode()) ||
                    result.getAmount() == null || strategy.normalizeAmount(payment.getAmount()).compareTo(result.getAmount()) != 0) {
                throw new CustomBusinessException(ErrorCodes.ERR_PAYMENT_AMOUNT_MISMATCH, "ERR_PAYMENT_AMOUNT_MISMATCH");
            }
            payment.setStatus("SUCCESS");
            payment.setPaidAt(result.getPaidAt() != null ? result.getPaidAt() : OffsetDateTime.now());
            payment.setGatewayTransactionId(result.getGatewayTransactionId());
            payment.setGatewayRequestId(result.getGatewayRequestId());
            payments.save(payment);
        }
        deposits.applyFinalPayment(payment.getId());
    }
}
