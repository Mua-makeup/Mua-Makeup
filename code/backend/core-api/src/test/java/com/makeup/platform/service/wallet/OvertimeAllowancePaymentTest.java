package com.makeup.platform.service.wallet;

import com.makeup.platform.entity.agency.*;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.entity.wallet.*;
import com.makeup.platform.repository.AgencyStaffOvertimeReportRepository;
import com.makeup.platform.repository.wallet.*;
import com.makeup.platform.service.interaction.NotificationService;
import com.makeup.platform.service.wallet.impl.OvertimeAllowancePaymentService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OvertimeAllowancePaymentTest {
    @Mock AgencyStaffOvertimeReportRepository reports;
    @Mock WalletRepository wallets;
    @Mock LedgerEntryRepository ledger;
    @Mock NotificationService notifications;
    @InjectMocks OvertimeAllowancePaymentService service;
    AgencyStaffOvertimeReportEntity report;
    WalletEntity source, destination;
    List<LedgerEntryEntity> entries = new ArrayList<>();
    static BigDecimal money(long value) { return BigDecimal.valueOf(value); }

    @BeforeEach void setup() {
        var owner = new UserEntity(); owner.setId(1L);
        var worker = new UserEntity(); worker.setId(2L);
        var mua = new MuaProfileEntity(); mua.setUser(worker);
        report = AgencyStaffOvertimeReportEntity.builder().agency(AgencyProfileEntity.builder().owner(owner).build())
                .staff(AgencyStaffEntity.builder().mua(mua).build()).bookingId(48L).overtimeMinutes(30)
                .status(OvertimeReportStatus.APPROVED_WAIVED).penaltyAmountApplied(money(150000)).build();
        report.setId(7L);
        source = WalletEntity.builder().user(owner).availableBalance(money(200000)).build();
        destination = WalletEntity.builder().user(worker).availableBalance(money(10000)).build();
        when(reports.findByIdForPayment(7L)).thenReturn(Optional.of(report));
        lenient().when(wallets.findByUserIdWithLock(1L)).thenReturn(Optional.of(source));
        lenient().when(wallets.findByUserIdWithLock(2L)).thenReturn(Optional.of(destination));
        lenient().when(ledger.findByReferenceIdAndReferenceTypeAndEntryType(eq(7L), anyString(), anyString()))
                .thenAnswer(i -> entries.stream().filter(e -> e.getReferenceType().equals(i.getArgument(1))
                        && e.getEntryType().equals(i.getArgument(2))).toList());
        lenient().when(ledger.save(any())).thenAnswer(i -> { var entry = (LedgerEntryEntity)i.getArgument(0); entries.add(entry); return entry; });
    }

    @ParameterizedTest @ValueSource(longs = {0, 50000, 149999})
    void insufficientFundsNeverDebitPartiallyOrCreditWorker(long balance) {
        source.setAvailableBalance(money(balance));
        assertEquals(OvertimeAllowancePaymentStatus.PENDING_FUNDS, service.pay(7L));
        assertEquals(money(balance), source.getAvailableBalance());
        assertEquals(money(10000), destination.getAvailableBalance());
        verify(wallets, never()).save(any());
        verify(ledger, never()).save(any());
        verifyNoInteractions(notifications);
    }

    @Test void laterSettlementFundsPayExactlyOnce() {
        source.setAvailableBalance(money(50000));
        assertEquals(OvertimeAllowancePaymentStatus.PENDING_FUNDS, service.pay(7L));
        source.setAvailableBalance(money(150000));
        assertEquals(OvertimeAllowancePaymentStatus.PAID, service.pay(7L));
        assertEquals(OvertimeAllowancePaymentStatus.PAID, service.pay(7L));
        assertEquals(BigDecimal.ZERO, source.getAvailableBalance());
        assertEquals(money(160000), destination.getAvailableBalance());
        assertEquals(2, entries.size());
        assertEquals(entries.get(0).getAmount(), entries.get(1).getAmount());
        verify(notifications, times(1)).createOvertimeApprovedNotification(any(), any(), any(), any(), eq(money(150000)));
    }

    @Test void historicalPartialDebitRequiresReconciliationAndNeverPaysAgain() {
        entries.add(LedgerEntryEntity.builder().referenceType("OVERTIME_PAYMENT").entryType("DEBIT").amount(money(50000)).build());
        entries.add(LedgerEntryEntity.builder().referenceType("OVERTIME_ALLOWANCE").entryType("CREDIT").amount(money(150000)).build());
        assertEquals(OvertimeAllowancePaymentStatus.RECONCILIATION_REQUIRED, service.pay(7L));
        verifyNoInteractions(wallets, notifications);
        verify(ledger, never()).save(any());
    }

    @Test void historicalUnfundedCreditIsNotChargedAutomatically() {
        entries.add(LedgerEntryEntity.builder().referenceType("OVERTIME_ALLOWANCE").entryType("CREDIT").amount(money(150000)).build());
        assertEquals(OvertimeAllowancePaymentStatus.RECONCILIATION_REQUIRED, service.pay(7L));
        verifyNoInteractions(wallets, notifications);
    }

    @Test void historicalBalancedPaymentIsAlreadyPaid() {
        entries.add(LedgerEntryEntity.builder().referenceType("OVERTIME_PAYMENT").entryType("DEBIT").amount(money(150000)).build());
        entries.add(LedgerEntryEntity.builder().referenceType("OVERTIME_ALLOWANCE").entryType("CREDIT").amount(money(150000)).build());
        assertEquals(OvertimeAllowancePaymentStatus.PAID, service.pay(7L));
        verifyNoInteractions(wallets, notifications);
    }

    @Test void failureWritingCreditPropagatesForTransactionRollbackAndDoesNotNotify() {
        doAnswer(i -> {
            LedgerEntryEntity entry = i.getArgument(0);
            if (entry.getEntryType().equals("CREDIT")) throw new IllegalStateException("ledger failure");
            return entry;
        }).when(ledger).save(any());
        assertThrows(IllegalStateException.class, () -> service.pay(7L));
        verifyNoInteractions(notifications);
    }

    @Test void unapprovedReportCannotTransferMoney() {
        report.setStatus(OvertimeReportStatus.PENDING_AGENCY_REVIEW);
        assertEquals(OvertimeAllowancePaymentStatus.NOT_APPLICABLE, service.pay(7L));
        verifyNoInteractions(wallets, ledger, notifications);
    }
    @Test void notificationWaitsForSuccessfulCommit() {
        TransactionSynchronizationManager.initSynchronization();
        try {
            assertEquals(OvertimeAllowancePaymentStatus.PAID, service.pay(7L));
            verifyNoInteractions(notifications);
            for (var callback : TransactionSynchronizationManager.getSynchronizations()) {
                callback.afterCommit();
            }
            verify(notifications).createOvertimeApprovedNotification(any(), any(), any(), any(), eq(money(150000)));
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

}
