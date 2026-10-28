package com.makeup.platform.service.payment;

import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.repository.AgencyStaffOvertimeReportRepository;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import com.makeup.platform.entity.booking.*;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.entity.payment.BookingDepositEntity;
import com.makeup.platform.entity.wallet.*;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.payment.BookingDepositRepository;
import com.makeup.platform.repository.wallet.*;
import com.makeup.platform.service.wallet.impl.BookingSettlementServiceImpl;
import com.makeup.platform.service.wallet.PlatformFeeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.makeup.platform.repository.booking.BookingStaffAssignmentRepository;

@ExtendWith(MockitoExtension.class)
class FinalPaymentSettlementTest {
    @Mock BookingRepository bookings;
    @Mock BookingStaffAssignmentRepository staffAssignments;
    @Mock BookingDepositRepository deposits;
    @Mock BookingSettlementRepository settlements;
    @Mock WalletRepository wallets;
    @Mock WalletHoldRepository holds;
    @Mock LedgerEntryRepository ledger;
    @Mock BookingCashReceiptRepository receipts;
    @Mock AgencyStaffOvertimeReportRepository overtimeReports;
    @Mock PlatformFeeService platformFeeService;
    @InjectMocks BookingSettlementServiceImpl service;

    @BeforeEach void setUp() {
        lenient().when(platformFeeService.rateFor(any())).thenReturn(new BigDecimal("0.20"));
        lenient().when(platformFeeService.getRate()).thenReturn(new BigDecimal("0.20"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"CASH", "ONLINE", "ONLINE_IN_TRANSACTION"})
    void studioAlwaysChargesTwentyPercentAndCreditsCorrectSplit(String method) {
        var owner = new UserEntity(); owner.setId(5L);
        var worker = new UserEntity(); worker.setId(6L);
        var agency = new AgencyProfileEntity(); agency.setOwner(owner);
        var mua = new MuaProfileEntity(); mua.setUser(worker);
        var staff = new AgencyStaffEntity(); staff.setMua(mua);
        var assignment = new BookingStaffAssignmentEntity(); assignment.setId(11L);
        assignment.setStaff(staff); assignment.setStatus(AssignmentStatus.ACTIVE);
        assignment.setAssignmentRole(AssignmentRole.PRIMARY_MUA);
        assignment.setCommissionAmount(new BigDecimal("25000"));
        var booking = new BookingEntity(); booking.setId(9L); booking.setAgency(agency);
        booking.setStatus(BookingStatus.COMPLETED); booking.setTotalAmount(new BigDecimal("50000"));
        booking.setDepositAmount(new BigDecimal("15000"));
        var deposit = BookingDepositEntity.builder().status("PAID").paidAmount(new BigDecimal("15000")).build();
        var ownerWallet = WalletEntity.builder().user(owner).availableBalance(BigDecimal.ZERO).build();
        var workerWallet = WalletEntity.builder().user(worker).availableBalance(BigDecimal.ZERO).build();
        when(bookings.findById(9L)).thenReturn(Optional.of(booking));
        when(bookings.findByIdForUpdate(9L)).thenReturn(Optional.of(booking));
        when(deposits.findByBookingId(9L)).thenReturn(Optional.of(deposit));
        when(staffAssignments.findByBookingIdAndStatus(9L, AssignmentStatus.ACTIVE)).thenReturn(List.of(assignment));
        when(wallets.findByUserIdWithLock(5L)).thenReturn(Optional.of(ownerWallet));
        when(wallets.findByUserIdWithLock(6L)).thenReturn(Optional.of(workerWallet));
        when(settlements.existsByBookingId(9L)).thenReturn(false, true);
                if ("CASH".equals(method)) {
            when(receipts.findByBookingId(9L)).thenReturn(Optional.of(BookingCashReceiptEntity.builder()
                .status("BOTH_CONFIRMED").expectedAmount(new BigDecimal("35000")).build()));
        }
        // A legacy caller still passing 15% must not change the Studio contract.
        for (int attempt = 0; attempt < 2; attempt++) {
            switch (method) {
                case "CASH" -> service.settleBooking(9L, new BigDecimal("0.15"));
                case "ONLINE" -> service.settleBookingOnlinePayment(9L, new BigDecimal("0.15"));
                default -> service.settleBookingOnlinePaymentInTransaction(9L, new BigDecimal("0.15"));
            }
        }
        var snapshot = ArgumentCaptor.forClass(BookingSettlementEntity.class);
        verify(settlements, times(1)).save(snapshot.capture());
        assertEquals(0, new BigDecimal("0.20").compareTo(snapshot.getValue().getCommissionRate()));
        assertEquals(new BigDecimal("10000"), snapshot.getValue().getCommissionAmount());
        assertEquals(new BigDecimal("15000"), ownerWallet.getAvailableBalance());
        assertEquals(new BigDecimal("25000"), workerWallet.getAvailableBalance());
        verify(ledger, times(2)).save(any());
    }

    @Test void creditsFreelancerEarningsAndLedgerExactlyOnce() {
        var user = new UserEntity(); user.setId(5L);
        var mua = new MuaProfileEntity(); mua.setUser(user);
        var booking = new BookingEntity(); booking.setId(9L); booking.setMua(mua);
        booking.setStatus(BookingStatus.COMPLETED); booking.setTotalAmount(new BigDecimal("1000000"));
        var deposit = BookingDepositEntity.builder().status("PAID").paidAmount(new BigDecimal("300000")).build();
        var wallet = WalletEntity.builder().availableBalance(new BigDecimal("100000")).build();
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
