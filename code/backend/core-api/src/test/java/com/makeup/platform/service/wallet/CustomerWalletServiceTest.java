package com.makeup.platform.service.wallet;

import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.booking.*;
import com.makeup.platform.entity.payment.BookingDepositEntity;
import com.makeup.platform.entity.wallet.*;
import com.makeup.platform.mapper.wallet.CustomerWalletMapper;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.payment.BookingDepositRepository;
import com.makeup.platform.repository.wallet.*;
import com.makeup.platform.service.wallet.impl.CustomerWalletServiceImpl;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CustomerWalletServiceTest {
    @Mock WalletRepository wallets;
    @Mock WalletHoldRepository holds;
    @Mock BookingDepositRepository deposits;
    @Mock LedgerEntryRepository ledger;
    @Mock UserRepository users;
    @Mock BookingRepository bookings;
    @Mock CustomerWalletMapper mapper;
    @InjectMocks CustomerWalletServiceImpl service;

    @ParameterizedTest
    @CsvSource({"COMPLETED,PAID,CONSUMED", "PAID_OUT,PAID,CONSUMED", "DISPUTE_COMPENSATED,PAID,CONSUMED",
        "CANCELLED,PAID,REFUNDED", "CANCELLED_EXPIRED,PAID,REFUNDED", "DISPUTE_REFUNDED,PAID,REFUNDED",
        "CANCELLED,FORFEITED,CONSUMED", "CANCELLED,COMPENSATED_TO_MUA,CONSUMED"})
    void terminalBookingReconcilesHoldWithoutCreditingMoneyTwice(BookingStatus state, String depositState, String expected) {
        var wallet = WalletEntity.builder().id(9L).availableBalance(new BigDecimal("12345")).build();
        var booking = new BookingEntity(); booking.setStatus(state);
        var deposit = BookingDepositEntity.builder().status(depositState).build();
        var hold = WalletHoldEntity.builder().booking(booking).deposit(deposit).status("ACTIVE").build();
        when(wallets.findByUserId(1L)).thenReturn(Optional.of(wallet));
        when(holds.findAllByWalletIdAndStatus(9L, "ACTIVE")).thenReturn(List.of(hold));
        when(ledger.findAllByWalletIdOrderByCreatedAtDesc(eq(9L), any())).thenReturn(Page.empty());
        service.getWalletInfo(1L);
        assertEquals(expected, hold.getStatus());
        assertNotNull(hold.getReleasedAt());
        assertEquals(new BigDecimal("12345"), wallet.getAvailableBalance());
        assertEquals(BigDecimal.ZERO, wallet.getFrozenBalance());
        verify(ledger, never()).save(any());
        if (expected.equals("REFUNDED")) assertEquals("REFUNDED", deposit.getStatus());
    }

    @Test void activeHoldRemainsFrozen() {
        var wallet = WalletEntity.builder().id(9L).build();
        var booking = new BookingEntity(); booking.setStatus(BookingStatus.ACCEPTED);
        var hold = WalletHoldEntity.builder().booking(booking).status("ACTIVE").build();
        when(wallets.findByUserId(1L)).thenReturn(Optional.of(wallet));
        when(holds.findAllByWalletIdAndStatus(9L, "ACTIVE")).thenReturn(List.of(hold));
        when(holds.sumActiveHoldsByWalletId(9L)).thenReturn(new BigDecimal("300000"));
        when(ledger.findAllByWalletIdOrderByCreatedAtDesc(eq(9L), any())).thenReturn(Page.empty());
        service.getWalletInfo(1L);
        assertEquals("ACTIVE", hold.getStatus());
        assertNull(hold.getReleasedAt());
        assertEquals(new BigDecimal("300000"), wallet.getFrozenBalance());
        verify(holds, never()).save(any());
    }
}
