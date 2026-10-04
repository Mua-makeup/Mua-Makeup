package com.makeup.platform.service.payment;

import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.entity.payment.PaymentTransactionEntity;
import com.makeup.platform.repository.payment.PaymentTransactionRepository;
import com.makeup.platform.service.payment.gateway.*;
import com.makeup.platform.service.payment.impl.PaymentWebhookProcessorImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PaymentWebhookAmountTest {
    private final PaymentGatewayRegistry gateways = mock(PaymentGatewayRegistry.class);
    private final MomoGatewayStrategy momo = mock(MomoGatewayStrategy.class);
    private final PaymentTransactionRepository payments = mock(PaymentTransactionRepository.class);
    private final BookingDepositService deposits = mock(BookingDepositService.class);
    private final PaymentWebhookProcessorImpl service = new PaymentWebhookProcessorImpl(gateways, payments, deposits);
    private PaymentTransactionEntity payment;

    @BeforeEach void setup() {
        payment = PaymentTransactionEntity.builder().paymentCode("DEP-1").status("PENDING")
                .purpose("BOOKING_DEPOSIT").amount(new BigDecimal("527011.80")).build();
        payment.setId(1L);
        when(gateways.getStrategy("momo")).thenReturn(momo);
        when(momo.normalizeAmount(any(BigDecimal.class))).thenCallRealMethod();
        when(payments.findByPaymentCodeWithLock("DEP-1")).thenReturn(Optional.of(payment));
        when(payments.save(payment)).thenReturn(payment);
    }

    private void callback(BigDecimal amount) {
        when(momo.verifyAndParseCallback(Map.of(), "body")).thenReturn(GatewayPaymentResult.builder()
                .paymentCode("DEP-1").amount(amount).successful(true).build());
        service.processWebhook("momo", Map.of(), "body");
    }

    @Test void acceptsExactCheckoutRoundingAndAppliesDepositOnce() {
        callback(new BigDecimal("527012"));
        callback(new BigDecimal("527012"));
        assertEquals("SUCCESS", payment.getStatus());
        assertEquals(new BigDecimal("527011.80"), payment.getAmount());
        verify(deposits, times(1)).applyDepositFromPayment(1L);
    }

    @Test void rejectsWrongAmountWithoutApplyingDeposit() {
        assertThrows(CustomBusinessException.class, () -> callback(new BigDecimal("527011")));
        assertEquals("PENDING", payment.getStatus());
        verifyNoInteractions(deposits);
    }

    @Test void rejectsMissingAmountWithoutApplyingDeposit() {
        assertThrows(CustomBusinessException.class, () -> callback(null));
        verifyNoInteractions(deposits);
    }
}
