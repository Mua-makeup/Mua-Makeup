package com.makeup.platform.service.payment;

import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.entity.payment.PaymentTransactionEntity;
import com.makeup.platform.repository.payment.PaymentTransactionRepository;
import com.makeup.platform.service.payment.gateway.*;
import com.makeup.platform.service.payment.impl.FinalPaymentReconciliationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class FinalPaymentReconciliationServiceTest {
    private final PaymentTransactionRepository payments = mock(PaymentTransactionRepository.class);
    private final PaymentGatewayRegistry gateways = mock(PaymentGatewayRegistry.class);
    private final PaymentGatewayStrategy gateway = mock(MomoGatewayStrategy.class);
    private final BookingDepositService deposits = mock(BookingDepositService.class);
    private final FinalPaymentReconciliationService service = new FinalPaymentReconciliationService(payments, gateways, deposits);
    private PaymentTransactionEntity payment;

    @BeforeEach void setup() {
        when(gateway.normalizeAmount(any(BigDecimal.class))).thenCallRealMethod();
        payment = PaymentTransactionEntity.builder().paymentCode("FINAL-1").paymentGateway("MOMO")
                .purpose("BOOKING_FINAL_PAYMENT").amount(new BigDecimal("700000")).build();
        payment.setId(1L);
        when(payments.findByPaymentCodeWithLock("FINAL-1")).thenReturn(Optional.of(payment));
        when(gateways.getStrategy("MOMO")).thenReturn(gateway);
    }

    private GatewayPaymentResult result(BigDecimal amount) {
        return GatewayPaymentResult.builder().successful(true).paymentCode("FINAL-1").gatewayCode("MOMO")
                .gatewayTransactionId("gateway-123").amount(amount).build();
    }

    @Test void recoversSuccessfulPaymentWithoutWebhook() {
        when(gateway.queryTransaction(payment)).thenReturn(result(payment.getAmount()));
        service.reconcile("FINAL-1");
        assertEquals("SUCCESS", payment.getStatus());
        assertEquals("gateway-123", payment.getGatewayTransactionId());
        assertNotNull(payment.getPaidAt());
        verify(deposits).applyFinalPayment(1L);
    }

    @Test void pendingGatewayResultDoesNotPostMoney() {
        when(gateway.queryTransaction(payment)).thenReturn(GatewayPaymentResult.builder().successful(false).build());
        service.reconcile("FINAL-1");
        assertEquals("PENDING", payment.getStatus());
        verifyNoInteractions(deposits);
    }

    @Test void acceptsAmountRoundedForMomoCheckout() {
        payment.setAmount(new BigDecimal("527011.80"));
        when(gateway.queryTransaction(payment)).thenReturn(result(new BigDecimal("527012")));
        service.reconcile("FINAL-1");
        assertEquals("SUCCESS", payment.getStatus());
        assertEquals(new BigDecimal("527011.80"), payment.getAmount());
        verify(deposits).applyFinalPayment(1L);
    }

    @Test void rejectsMismatchedAmount() {
        when(gateway.queryTransaction(payment)).thenReturn(result(BigDecimal.ONE));
        assertThrows(CustomBusinessException.class, () -> service.reconcile("FINAL-1"));
        assertEquals("PENDING", payment.getStatus());
        verifyNoInteractions(deposits);
    }

    @Test void rejectsMissingAmountAndWrongPaymentIdentity() {
        when(gateway.queryTransaction(payment)).thenReturn(result(null));
        assertThrows(CustomBusinessException.class, () -> service.reconcile("FINAL-1"));
        var wrong = result(payment.getAmount());
        wrong.setPaymentCode("ANOTHER-PAYMENT");
        when(gateway.queryTransaction(payment)).thenReturn(wrong);
        assertThrows(CustomBusinessException.class, () -> service.reconcile("FINAL-1"));
        verifyNoInteractions(deposits);
    }

    @Test void retriesPostingForAlreadyConfirmedPayment() {
        payment.setStatus("SUCCESS");
        payment.setApplicationStatus("REVIEW_REQUIRED");
        service.reconcile("FINAL-1");
        verifyNoInteractions(gateway);
        verify(deposits).applyFinalPayment(1L);
    }

    @Test void repairsLegacyAppliedPaymentWithoutCustomerLedger() {
        payment.setStatus("SUCCESS");
        payment.setApplicationStatus("APPLIED");
        service.reconcile("FINAL-1");
        verify(deposits).applyFinalPayment(1L);
    }

    @Test void repeatedCompletedPaymentDoesNotPostAgain() {
        payment.setStatus("SUCCESS");
        payment.setApplicationStatus("APPLIED");
        payment.setWalletPostingStatus("POSTED");
        service.reconcile("FINAL-1");
        verifyNoInteractions(gateway, deposits);
    }
}
