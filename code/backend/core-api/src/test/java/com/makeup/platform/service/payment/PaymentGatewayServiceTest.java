package com.makeup.platform.service.payment;

import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.payment.CreatePaymentIntentReq;
import com.makeup.platform.dto.response.payment.PaymentCheckoutRes;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.payment.PaymentTransactionEntity;
import com.makeup.platform.mapper.payment.PaymentMapper;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.repository.payment.PaymentTransactionRepository;
import com.makeup.platform.service.payment.gateway.*;
import com.makeup.platform.service.payment.impl.PaymentGatewayServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentGatewayServiceTest {
    @Mock UserRepository users;
    @Mock PaymentTransactionRepository payments;
    @Mock PaymentGatewayRegistry gateways;
    @Mock PaymentMapper mapper;
    @Mock PaymentGatewayStrategy strategy;
    @InjectMocks PaymentGatewayServiceImpl service;

    @Test void missingUserCannotCreatePayment() {
        assertThrows(CustomBusinessException.class, () -> service.createPaymentIntent(1L, new CreatePaymentIntentReq(), "127.0.0.1"));
        verifyNoInteractions(payments, gateways);
    }
    @Test void customerCannotReadAnotherCustomersPayment() {
        var user = new UserEntity(); user.setId(2L);
        when(payments.findByPaymentCode("PAY-1")).thenReturn(Optional.of(PaymentTransactionEntity.builder().user(user).build()));
        var ex = assertThrows(CustomBusinessException.class, () -> service.getPaymentDetail("PAY-1", 1L));
        assertEquals("ERR_PAYMENT_UNAUTHORIZED", ex.getErrorCode());
        verifyNoInteractions(mapper);
    }
    @Test void unknownPaymentIsRejected() {
        assertThrows(CustomBusinessException.class, () -> service.getPaymentDetail("missing", 1L));
        verifyNoInteractions(mapper);
    }
    @Test void ownerCanReadPayment() {
        var user = new UserEntity(); user.setId(1L);
        var payment = PaymentTransactionEntity.builder().user(user).build();
        when(payments.findByPaymentCode("PAY-1")).thenReturn(Optional.of(payment));
        service.getPaymentDetail("PAY-1", 1L);
        verify(mapper).toPaymentDetailRes(payment);
    }
    @Test void checkoutPersistsPendingPaymentWithoutPostingMoney() {
        var user = new UserEntity(); user.setId(1L);
        var request = new CreatePaymentIntentReq(); request.setGatewayCode("MOMO"); request.setAmount(new BigDecimal("100000"));
        var checkout = PaymentCheckoutRes.builder().paymentUrl("https://example.test/pay").build();
        when(users.findById(1L)).thenReturn(Optional.of(user));
        when(gateways.getStrategy("MOMO")).thenReturn(strategy);
        when(strategy.gatewayCode()).thenReturn("MOMO");
        when(payments.save(any())).thenAnswer(i -> i.getArgument(0));
        when(strategy.createCheckout(any(), eq("127.0.0.1"))).thenReturn(checkout);
        assertSame(checkout, service.createPaymentIntent(1L, request, "127.0.0.1"));
        var captor = ArgumentCaptor.forClass(PaymentTransactionEntity.class);
        verify(payments, times(2)).save(captor.capture());
        var payment = captor.getValue();
        assertEquals("PENDING", payment.getStatus());
        assertEquals("NOT_POSTED", payment.getWalletPostingStatus());
        assertEquals(request.getAmount(), payment.getAmount());
        assertEquals(checkout.getPaymentUrl(), payment.getPaymentUrl());
        assertTrue(payment.getPaymentCode().matches("PAY-\\d{8}-[0-9A-F]{6}"));
    }
}
