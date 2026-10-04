package com.makeup.platform.service.payment;

import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.payment.BookingDepositEntity;
import com.makeup.platform.entity.payment.PaymentTransactionEntity;
import com.makeup.platform.entity.wallet.LedgerEntryEntity;
import com.makeup.platform.entity.wallet.WalletEntity;
import com.makeup.platform.repository.payment.*;
import com.makeup.platform.repository.wallet.*;
import com.makeup.platform.service.payment.impl.BookingDepositServiceImpl;
import com.makeup.platform.service.wallet.BookingSettlementService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import java.math.BigDecimal;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FinalPaymentPostingTest {
    @Mock PaymentTransactionRepository payments;
    @Mock BookingDepositRepository deposits;
    @Mock WalletRepository wallets;
    @Mock LedgerEntryRepository ledger;
    @Mock BookingSettlementService settlement;
    @Mock SimpMessagingTemplate messaging;
    @InjectMocks BookingDepositServiceImpl service;

    @Test void postsCustomerExpenseWithoutDebitingWalletAndDoesNotDuplicateOnRetry() {
        var user = new UserEntity(); user.setId(5L);
        var booking = new BookingEntity(); booking.setId(9L); booking.setBookingCode("BK-9");
        booking.setCustomer(user); booking.setTotalAmount(new BigDecimal("1000000"));
        var deposit = BookingDepositEntity.builder().booking(booking).status("PAID").paidAmount(new BigDecimal("300000")).build();
        var payment = PaymentTransactionEntity.builder().booking(booking).user(user).purpose("BOOKING_FINAL_PAYMENT")
                .status("SUCCESS").amount(new BigDecimal("700000")).paymentGateway("MOMO").build();
        payment.setId(7L);
        var wallet = WalletEntity.builder().user(user).availableBalance(new BigDecimal("120000")).build();
        when(payments.findById(7L)).thenReturn(Optional.of(payment));
        when(deposits.findByBookingIdWithLock(9L)).thenReturn(Optional.of(deposit));
        when(wallets.findByUserIdWithLock(5L)).thenReturn(Optional.of(wallet));

        service.applyFinalPayment(7L);
        service.applyFinalPayment(7L);

        var entry = ArgumentCaptor.forClass(LedgerEntryEntity.class);
        verify(ledger, times(1)).save(entry.capture());
        assertEquals("BOOKING_FINAL_PAYMENT", entry.getValue().getReferenceType());
        assertEquals(new BigDecimal("700000"), entry.getValue().getAmount());
        assertEquals(new BigDecimal("120000"), wallet.getAvailableBalance());
        assertEquals("POSTED", payment.getWalletPostingStatus());
        assertEquals("APPLIED", payment.getApplicationStatus());
        verify(settlement, times(1)).settleBookingOnlinePayment(9L, new BigDecimal("0.20"));
    }
}
