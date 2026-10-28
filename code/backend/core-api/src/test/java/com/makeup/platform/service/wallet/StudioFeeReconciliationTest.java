package com.makeup.platform.service.wallet;

import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.booking.*;
import com.makeup.platform.entity.wallet.*;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.wallet.*;
import com.makeup.platform.service.booking.StudioDisputeFinanceService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StudioFeeReconciliationTest {
    @Mock BookingRepository bookings;
    @Mock BookingSettlementRepository settlements;
    @Mock LedgerEntryRepository ledger;
    @Mock WalletRepository wallets;
    @Mock StudioDisputeFinanceService finance;
    @InjectMocks StudioFeeReconciliationService service;
    static BigDecimal n(long x) { return BigDecimal.valueOf(x); }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(longs = {17500, 2000})
    void correctsOnlyOwnerAndRetryCannotDeductAgain(long initialBalance) {
        var owner = new UserEntity(); owner.setId(2L);
        var worker = new UserEntity(); worker.setId(3L);
        var agency = new AgencyProfileEntity(); agency.setOwner(owner);
        var booking = new BookingEntity(); booking.setId(9L); booking.setAgency(agency); booking.setStatus(BookingStatus.PAID_OUT);
        var snapshot = BookingSettlementEntity.builder().status("SETTLED").totalAmount(n(50000))
                .depositAmount(n(15000)).cashAmount(n(35000)).commissionRate(new BigDecimal("0.15"))
                .commissionAmount(n(7500)).walletCreditedAmount(n(7500)).build();
        var ownerWallet = WalletEntity.builder().user(owner).availableBalance(n(initialBalance)).build();
        var workerWallet = WalletEntity.builder().user(worker).availableBalance(n(25000)).build();
        when(bookings.findById(9L)).thenReturn(Optional.of(booking));
        when(bookings.findByIdForUpdate(9L)).thenReturn(Optional.of(booking));
        when(settlements.findByBookingId(9L)).thenReturn(Optional.of(snapshot));
        when(finance.inspect(booking)).thenReturn(new StudioDisputeFinanceService.Financials("SETTLED", true,n(15000),n(50000),n(35000),true));
        when(ledger.findByReferenceIdAndReferenceTypeAndEntryType(9L,"BOOKING_SETTLEMENT","CREDIT"))
                .thenReturn(List.of(LedgerEntryEntity.builder().wallet(ownerWallet).amount(n(17500)).build(),
                        LedgerEntryEntity.builder().wallet(workerWallet).amount(n(25000)).build()));
        when(wallets.findByUserIdWithLock(2L)).thenReturn(Optional.of(ownerWallet));
        when(ledger.existsByIdempotencyKey("studio_fee20:9")).thenReturn(false, true);
        assertEquals(n(2500), service.preview(9L).recoveryAmount());
        if (initialBalance < 2500) {
            assertThrows(CustomBusinessException.class, () -> service.correct(9L, 99L, n(7500)));
            assertEquals(n(initialBalance), ownerWallet.getAvailableBalance());
            assertEquals(n(7500), snapshot.getCommissionAmount());
            verify(ledger, never()).save(any());
            return;
        }
        service.correct(9L, 99L, n(7500));
        service.correct(9L, 99L, n(7500));
        assertEquals(n(15000), ownerWallet.getAvailableBalance());
        assertEquals(n(25000), workerWallet.getAvailableBalance());
        assertEquals(n(10000), snapshot.getCommissionAmount());
        assertEquals(n(40000), snapshot.getWalletCreditedAmount());
        var adjustment = ArgumentCaptor.forClass(LedgerEntryEntity.class);
        verify(ledger, times(1)).save(adjustment.capture());
        assertEquals("DEBIT", adjustment.getValue().getEntryType());
        assertEquals(n(2500), adjustment.getValue().getAmount());
        verify(wallets, never()).findByUserIdWithLock(3L);
    }

    @Test void stalePreviewCannotChangeMoney() {
        var booking = new BookingEntity(); booking.setAgency(new AgencyProfileEntity()); booking.setStatus(BookingStatus.PAID_OUT);
        when(bookings.findById(9L)).thenReturn(Optional.of(booking));
        when(bookings.findByIdForUpdate(9L)).thenReturn(Optional.of(booking));
        when(settlements.findByBookingId(9L)).thenReturn(Optional.of(BookingSettlementEntity.builder()
                .status("SETTLED").totalAmount(n(50000)).commissionAmount(n(7500)).build()));
        assertThrows(CustomBusinessException.class, () -> service.correct(9L,99L,n(6000)));
        verifyNoInteractions(wallets, finance);
        verify(ledger, never()).save(any());
    }
}
