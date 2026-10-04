package com.makeup.platform.service.payment;

import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.booking.*;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.entity.payment.BookingDepositEntity;
import com.makeup.platform.entity.wallet.*;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.payment.BookingDepositRepository;
import com.makeup.platform.repository.wallet.*;
import com.makeup.platform.service.wallet.impl.BookingSettlementServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FinalPaymentSettlementTest {
    @Mock BookingRepository bookings;
    @Mock BookingDepositRepository deposits;
    @Mock BookingSettlementRepository settlements;
    @Mock WalletRepository wallets;
    @Mock WalletHoldRepository holds;
    @Mock LedgerEntryRepository ledger;
    @InjectMocks BookingSettlementServiceImpl service;

    @Test void creditsFreelancerEarningsAndLedgerExactlyOnce() {
        var user = new UserEntity(); user.setId(5L);
        var mua = new MuaProfileEntity(); mua.setUser(user);
        var booking = new BookingEntity(); booking.setId(9L); booking.setMua(mua);
        booking.setStatus(BookingStatus.COMPLETED); booking.setTotalAmount(new BigDecimal("1000000"));
        var deposit = BookingDepositEntity.builder().status("PAID").paidAmount(new BigDecimal("300000")).build();
        var wallet = WalletEntity.builder().availableBalance(new BigDecimal("100000")).build();
        when(deposits.findByBookingIdWithLock(9L)).thenReturn(Optional.of(deposit));
        when(deposits.findByBookingId(9L)).thenReturn(Optional.of(deposit));
        when(bookings.findById(9L)).thenReturn(Optional.of(booking));
        when(wallets.findByUserIdWithLock(5L)).thenReturn(Optional.of(wallet));
        when(holds.findAllByBookingIdAndStatus(9L, "ACTIVE")).thenReturn(List.of());
        when(settlements.existsByBookingId(9L)).thenReturn(false, true);

        service.settleBookingOnlinePayment(9L, new BigDecimal("0.20"));
        service.settleBookingOnlinePayment(9L, new BigDecimal("0.20"));

        assertEquals(new BigDecimal("900000"), wallet.getAvailableBalance());
        assertEquals(BookingStatus.PAID_OUT, booking.getStatus());
        var entry = ArgumentCaptor.forClass(LedgerEntryEntity.class);
        verify(ledger, times(1)).save(entry.capture());
        assertEquals(new BigDecimal("800000"), entry.getValue().getAmount());
        assertEquals("CREDIT", entry.getValue().getEntryType());
        verify(settlements, times(1)).save(any());
    }
}
