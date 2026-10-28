package com.makeup.platform.service.payment;

import com.makeup.platform.entity.payment.PaymentTransactionEntity;
import com.makeup.platform.repository.payment.PaymentTransactionRepository;
import com.makeup.platform.service.payment.gateway.*;
import com.makeup.platform.service.payment.impl.PaymentWebhookProcessorImpl;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentWebhookLifecycleTest {
    @Mock PaymentGatewayRegistry registry;
    @Mock PaymentGatewayStrategy gateway;
    @Mock PaymentTransactionRepository payments;
    @Mock BookingDepositService deposits;
    @InjectMocks PaymentWebhookProcessorImpl service;
    PaymentTransactionEntity setupPayment(String state, boolean success, String purpose) {
        var payment=PaymentTransactionEntity.builder().paymentCode("PAY-1").status(state).purpose(purpose).amount(new BigDecimal("100000")).build(); payment.setId(1L);
        when(registry.getStrategy("VNPAY")).thenReturn(gateway);
        when(gateway.verifyAndParseCallback(anyMap(),any())).thenReturn(GatewayPaymentResult.builder().paymentCode("PAY-1").amount(new BigDecimal("100000")).successful(success).build());
        when(payments.findByPaymentCodeWithLock("PAY-1")).thenReturn(Optional.of(payment));
        return payment;
    }
    @ParameterizedTest @ValueSource(strings={"SUCCESS","FAILED"})
    void repeatedCallbackDoesNotPostMoneyAgain(String status) {
        setupPayment(status,true,"BOOKING_DEPOSIT"); service.processWebhook("VNPAY",Map.of(),null);
        verify(payments,never()).save(any()); verifyNoInteractions(deposits); verify(gateway).callbackAcknowledgement(any());
    }
    @Test void declinedPaymentNeverAppliesDeposit() {
        var payment=setupPayment("PENDING",false,"BOOKING_DEPOSIT");
        when(gateway.normalizeAmount(payment.getAmount())).thenReturn(payment.getAmount()); when(payments.save(payment)).thenReturn(payment);
        service.processWebhook("VNPAY",Map.of(),null);
        assertEquals("FAILED",payment.getStatus()); assertNull(payment.getPaidAt()); verifyNoInteractions(deposits);
    }
    @ParameterizedTest @ValueSource(strings={"BOOKING_DEPOSIT","BOOKING_FINAL_PAYMENT"})
    void postingFailureRetainsGatewayEvidenceForReconciliation(String purpose) {
        var payment=setupPayment("PENDING",true,purpose);
        when(gateway.normalizeAmount(payment.getAmount())).thenReturn(payment.getAmount()); when(payments.save(payment)).thenReturn(payment);
        if(purpose.equals("BOOKING_DEPOSIT")) doThrow(new IllegalStateException("x".repeat(400))).when(deposits).applyDepositFromPayment(1L);
        else doThrow(new IllegalStateException("x".repeat(400))).when(deposits).applyFinalPayment(1L);
        service.processWebhook("VNPAY",Map.of(),null);
        assertEquals("SUCCESS",payment.getStatus()); assertNotNull(payment.getPaidAt());
        assertEquals("REVIEW_REQUIRED",payment.getApplicationStatus()); assertEquals(255,payment.getApplicationError().length());
        verify(gateway).callbackAcknowledgement(any());
    }
}
