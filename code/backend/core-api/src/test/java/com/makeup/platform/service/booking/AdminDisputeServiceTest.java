package com.makeup.platform.service.booking;

import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.booking.*;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.entity.payment.BookingDepositEntity;
import com.makeup.platform.entity.wallet.*;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.payment.BookingDepositRepository;
import com.makeup.platform.repository.wallet.*;
import com.makeup.platform.mapper.admin.AdminDisputeMapper;
import com.makeup.platform.service.booking.impl.AdminDisputeServiceImpl;
import com.makeup.platform.service.wallet.BookingSettlementService;
import com.makeup.platform.dto.request.admin.ResolveDisputeReq;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.repository.MuaProfileRepository;

@ExtendWith(MockitoExtension.class)
class AdminDisputeServiceTest {
    @Mock BookingRepository bookings;
    @Mock UserRepository users;
    @Mock WalletRepository wallets;
    @Mock WalletHoldRepository holds;
    @Mock LedgerEntryRepository ledger;
    @Mock BookingDepositRepository deposits;
    @Mock DisputeStageService stages;
    @Mock BookingSettlementService settlement;
    @Mock AdminDisputeMapper mapper;
    @Mock BookingAuditService audit;
    @Mock MuaProfileRepository profiles;
    @InjectMocks AdminDisputeServiceImpl service;

    @ParameterizedTest
    @CsvSource({"APPROVE_REFUND_CUSTOMER,60000,0,REFUNDED", "APPROVE_COMPENSATION_MUA,0,60000,CONSUMED", "SPLIT_50_50,30000,30000,SPLIT_SETTLED"})
    void depositOnlyDisputeDistributesOnlyPaidDeposit(String resolution, String customerCredit, String workerCredit, String holdStatus) {
        var customer = new UserEntity(); customer.setId(1L);
        var worker = new UserEntity(); worker.setId(2L);
        var mua = new MuaProfileEntity(); mua.setUser(worker);
        var booking = new BookingEntity(); booking.setId(9L); booking.setCustomer(customer); booking.setMua(mua);
        booking.setStatus(BookingStatus.DISPUTED); booking.setTotalAmount(new BigDecimal("200000"));
        booking.setDepositAmount(new BigDecimal("60000"));
        var cw = WalletEntity.builder().availableBalance(BigDecimal.ZERO).frozenBalance(new BigDecimal("60000")).build();
        var mw = WalletEntity.builder().availableBalance(new BigDecimal("90000")).build();
        var hold = WalletHoldEntity.builder().amount(new BigDecimal("60000")).status("ACTIVE").build();
        when(bookings.findByIdForUpdate(9L)).thenReturn(Optional.of(booking));
        when(bookings.save(any())).thenAnswer(i -> i.getArgument(0));
        when(users.findById(3L)).thenReturn(Optional.of(new UserEntity()));
        when(deposits.findByBookingId(9L)).thenReturn(Optional.of(BookingDepositEntity.builder().paidAmount(new BigDecimal("60000")).build()));
        when(wallets.findByUserIdWithLock(1L)).thenReturn(Optional.of(cw));
        if (!resolution.equals("APPROVE_REFUND_CUSTOMER")) when(wallets.findByUserIdWithLock(2L)).thenReturn(Optional.of(mw));
        when(holds.findByBookingIdAndStatus(9L, "ACTIVE")).thenReturn(Optional.of(hold));
        service.resolveDispute(9L, 3L, ResolveDisputeReq.builder().resolution(resolution).note("Verified").build());
        assertEquals(0, cw.getAvailableBalance().compareTo(new BigDecimal(customerCredit)));
        assertEquals(0, mw.getAvailableBalance().compareTo(new BigDecimal("90000").add(new BigDecimal(workerCredit))));
        assertEquals(0, cw.getFrozenBalance().signum());
        assertEquals(holdStatus, hold.getStatus());
        verifyNoInteractions(settlement);
        verify(ledger, never()).save(argThat(e -> "BOOKING_CLAWBACK".equals(e.getReferenceType())));
        assertThrows(CustomBusinessException.class,
            () -> service.resolveDispute(9L, 3L, ResolveDisputeReq.builder().resolution(resolution).note("Retry").build()));
    }
}
