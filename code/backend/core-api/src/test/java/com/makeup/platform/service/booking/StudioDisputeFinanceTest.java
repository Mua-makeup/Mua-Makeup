package com.makeup.platform.service.booking;

import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.payment.BookingDepositEntity;
import com.makeup.platform.entity.payment.PaymentTransactionEntity;
import com.makeup.platform.entity.wallet.BookingCashReceiptEntity;
import com.makeup.platform.entity.wallet.BookingSettlementEntity;
import com.makeup.platform.entity.wallet.LedgerEntryEntity;
import com.makeup.platform.entity.wallet.WalletEntity;
import com.makeup.platform.entity.wallet.WalletHoldEntity;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.payment.BookingDepositRepository;
import com.makeup.platform.repository.payment.PaymentTransactionRepository;
import com.makeup.platform.repository.wallet.BookingCashReceiptRepository;
import com.makeup.platform.repository.wallet.BookingSettlementRepository;
import com.makeup.platform.repository.wallet.LedgerEntryRepository;
import com.makeup.platform.repository.wallet.WalletHoldRepository;
import com.makeup.platform.repository.wallet.WalletRepository;
import com.makeup.platform.service.wallet.BookingSettlementService;
import com.makeup.platform.service.wallet.PlatformFeeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StudioDisputeFinanceTest {
    @Mock DisputeStageService stages;
    @Mock BookingDepositRepository deposits;
    @Mock PaymentTransactionRepository payments;
    @Mock BookingCashReceiptRepository receipts;
    @Mock BookingSettlementRepository settlements;
    @Mock LedgerEntryRepository ledger;
    @Mock WalletRepository wallets;
    @Mock WalletHoldRepository holds;
    @Mock BookingRepository bookings;
    @Mock BookingSettlementService settlementService;
    @Mock PlatformFeeService platformFeeService;
    @InjectMocks StudioDisputeFinanceService service;

    BookingEntity booking;
    WalletEntity customerWallet, ownerWallet;
    BookingDepositEntity deposit;

    @BeforeEach void setup() {
        var customer = new UserEntity(); customer.setId(1L);
        var owner = new UserEntity(); owner.setId(2L);
        var agency = new AgencyProfileEntity(); agency.setOwner(owner);
        booking = new BookingEntity(); booking.setId(9L); booking.setCustomer(customer); booking.setAgency(agency);
        booking.setStatus(BookingStatus.DISPUTED); booking.setTotalAmount(n(200000)); booking.setDepositAmount(n(60000));
        deposit = BookingDepositEntity.builder().paidAmount(n(60000)).status("PAID").build();
        when(deposits.findByBookingId(9L)).thenReturn(Optional.of(deposit));
        customerWallet = WalletEntity.builder().user(customer).availableBalance(n(0)).frozenBalance(n(60000)).build();
        ownerWallet = WalletEntity.builder().user(owner).availableBalance(n(90000)).frozenBalance(n(0)).build();
        lenient().when(platformFeeService.getRate()).thenReturn(new BigDecimal("0.15"));
        lenient().when(platformFeeService.rateFor(any())).thenReturn(new BigDecimal("0.15"));
    }

    void walletsAndHold() {
        when(wallets.findByUserIdWithLock(1L)).thenReturn(Optional.of(customerWallet));
        when(wallets.findByUserIdWithLock(2L)).thenReturn(Optional.of(ownerWallet));
        when(holds.findAllByBookingIdAndStatus(9L, "ACTIVE")).thenReturn(List.of(
            WalletHoldEntity.builder().wallet(customerWallet).amount(n(60000)).status("ACTIVE").build()));
    }

    static BigDecimal n(long value) { return BigDecimal.valueOf(value); }

    @ParameterizedTest
    @CsvSource({"APPROVE_REFUND_CUSTOMER,60000,90000,DISPUTE_REFUNDED", "APPROVE_COMPENSATION_MUA,0,150000,DISPUTE_COMPENSATED", "SPLIT_50_50,30000,120000,DISPUTE_REFUNDED"})
    void distributesOnlyDepositToCustomerAndStudio(String action, long customer, long owner, String status) {
        walletsAndHold();
        assertEquals(BookingStatus.valueOf(status), service.resolve(booking, action, "test"));
        assertEquals(n(customer), customerWallet.getAvailableBalance());
        assertEquals(n(owner), ownerWallet.getAvailableBalance());
        assertEquals(n(0), customerWallet.getFrozenBalance());
        verifyNoInteractions(settlementService);
    }

    @Test void completedButUnpaidRefundsOnlyDeposit() {
        when(stages.isCompletedService(booking)).thenReturn(true); walletsAndHold();
        assertEquals("COMPLETED_UNPAID", service.inspect(booking).stage());
        service.resolve(booking, "REFUND", "test");
        assertEquals(n(60000), customerWallet.getAvailableBalance());
        assertEquals(n(90000), ownerWallet.getAvailableBalance());
    }

    @Test void completedUnpaidUpheldRemainsPayable() {
        when(stages.isCompletedService(booking)).thenReturn(true);
        assertEquals(BookingStatus.COMPLETED, service.resolve(booking, "APPROVE_COMPENSATION_MUA", "test"));
        verifyNoInteractions(wallets, settlementService);
    }

    @Test void paidUnsettledRefundsPaidOnlineWithoutClawback() {
        when(stages.isCompletedService(booking)).thenReturn(true); walletsAndHold();
        var payment = PaymentTransactionEntity.builder().purpose("BOOKING_FINAL_PAYMENT").amount(n(140000)).build();
        when(payments.findByBookingIdAndStatus(9L, "SUCCESS")).thenReturn(List.of(payment));
        assertEquals("PAID_UNSETTLED", service.inspect(booking).stage());
        service.resolve(booking, "REFUND", "test");
        assertEquals(n(200000), customerWallet.getAvailableBalance());
        assertEquals(n(90000), ownerWallet.getAvailableBalance());
        assertEquals("REFUNDED", payment.getApplicationStatus());
    }

    @ParameterizedTest
    @ValueSource(longs = {0, 10000})
    void settledRefundRecoversActualPayoutAndLeavesOtherHoldsAlone(long correctedFee) {
        when(stages.isCompletedService(booking)).thenReturn(true);
        var payment = PaymentTransactionEntity.builder().purpose("BOOKING_FINAL_PAYMENT").amount(n(140000)).build();
        when(payments.findByBookingIdAndStatus(9L, "SUCCESS")).thenReturn(List.of(payment));
        var settlement = BookingSettlementEntity.builder().status("SETTLED").walletCreditedAmount(n(160000)).commissionAmount(n(40000)).build();
        when(settlements.findByBookingId(9L)).thenReturn(Optional.of(settlement));
        ownerWallet.setAvailableBalance(n(180000));
        when(wallets.findByUserIdWithLock(1L)).thenReturn(Optional.of(customerWallet));
        when(wallets.findByUserIdWithLock(2L)).thenReturn(Optional.of(ownerWallet));
        when(ledger.findByReferenceIdAndReferenceTypeAndEntryType(9L, "BOOKING_SETTLEMENT", "CREDIT"))
            .thenReturn(List.of(LedgerEntryEntity.builder().wallet(ownerWallet).amount(n(160000 + correctedFee)).build()));
        if (correctedFee > 0) when(ledger.findByReferenceIdAndReferenceTypeAndEntryType(9L, "BOOKING_SETTLEMENT", "DEBIT"))
            .thenReturn(List.of(LedgerEntryEntity.builder().wallet(ownerWallet).amount(n(correctedFee)).idempotencyKey("studio_fee20:9").build()));
        service.resolve(booking, "REFUND", "test");
        assertEquals(n(200000), customerWallet.getAvailableBalance());
        assertEquals(n(20000), ownerWallet.getAvailableBalance());
        assertEquals(n(60000), customerWallet.getFrozenBalance());
    }

    @Test void rejectsSplitAfterCompletion() {
        when(stages.isCompletedService(booking)).thenReturn(true);
        assertThrows(RuntimeException.class, () -> service.resolve(booking, "SPLIT_50_50", "test"));
        verifyNoInteractions(wallets);
    }

    @Test void insufficientRecoveryDoesNotCreditCustomerOrWriteLedger() {
        when(stages.isCompletedService(booking)).thenReturn(true);
        when(payments.findByBookingIdAndStatus(9L, "SUCCESS")).thenReturn(List.of(
            PaymentTransactionEntity.builder().purpose("BOOKING_FINAL_PAYMENT").amount(n(140000)).build()));
        when(settlements.findByBookingId(9L)).thenReturn(Optional.of(BookingSettlementEntity.builder()
            .status("SETTLED").walletCreditedAmount(n(160000)).commissionAmount(n(40000)).build()));
        when(ledger.findByReferenceIdAndReferenceTypeAndEntryType(9L, "BOOKING_SETTLEMENT", "CREDIT"))
            .thenReturn(List.of(LedgerEntryEntity.builder().wallet(ownerWallet).amount(n(160000)).build()));
        when(wallets.findByUserIdWithLock(1L)).thenReturn(Optional.of(customerWallet));
        when(wallets.findByUserIdWithLock(2L)).thenReturn(Optional.of(ownerWallet));
        assertThrows(CustomBusinessException.class,
            () -> service.resolve(booking, "REFUND", "test"));
        assertEquals(n(0), customerWallet.getAvailableBalance());
        assertEquals(n(90000), ownerWallet.getAvailableBalance());
        verify(ledger, never()).save(any());
    }

    @Test void cashRemittedToPlatformRefundsWithoutChargingCollectorAgain() {
        when(stages.isCompletedService(booking)).thenReturn(true);
        var receipt = BookingCashReceiptEntity.builder().status("BOTH_CONFIRMED")
            .expectedAmount(n(140000)).customerConfirmedAt(OffsetDateTime.now())
            .freelancerConfirmedAt(OffsetDateTime.now()).freelancerUser(booking.getAgency().getOwner()).build();
        when(receipts.findByBookingId(9L)).thenReturn(Optional.of(receipt));
        ownerWallet.setAvailableBalance(n(180000)); walletsAndHold();
        service.resolve(booking, "REFUND", "test");
        assertEquals(n(200000), customerWallet.getAvailableBalance());
        assertEquals(n(180000), ownerWallet.getAvailableBalance());
        assertEquals("CANCELLED", receipt.getStatus());
    }

    @Test void failedSettlementDoesNotReportPaidOut() {
        when(stages.isCompletedService(booking)).thenReturn(true);
        when(payments.findByBookingIdAndStatus(9L, "SUCCESS")).thenReturn(List.of(
            PaymentTransactionEntity.builder().purpose("BOOKING_FINAL_PAYMENT").amount(n(140000)).build()));
        doThrow(new IllegalStateException("settlement failed")).when(settlementService)
            .settleBookingOnlinePaymentInTransaction(eq(9L), any());
        assertThrows(IllegalStateException.class, () -> service.resolve(booking, "APPROVE_COMPENSATION_MUA", "test"));
        verifyNoInteractions(wallets);
    }

    @Test void paidUnsettledUpheldTriggersSettlementAndReturnsPaidOut() {
        when(stages.isCompletedService(booking)).thenReturn(true);
        when(payments.findByBookingIdAndStatus(9L, "SUCCESS")).thenReturn(List.of(
            PaymentTransactionEntity.builder().purpose("BOOKING_FINAL_PAYMENT").amount(n(140000)).build()));
        when(settlements.findByBookingId(9L)).thenReturn(
            Optional.empty(),
            Optional.empty(),
            Optional.of(BookingSettlementEntity.builder().status("SETTLED").build()));
        assertEquals(BookingStatus.PAID_OUT, service.resolve(booking, "APPROVE_COMPENSATION_MUA", "test"));
        verify(settlementService).settleBookingOnlinePaymentInTransaction(eq(9L), any());
        verify(bookings).save(booking);
    }

    @Test void rejectsDuplicateResolutionBeforeChangingMoney() {
        when(ledger.existsByIdempotencyKey("studio_dispute:9:refund")).thenReturn(true);
        assertThrows(RuntimeException.class, () -> service.resolve(booking, "REFUND", "test"));
        verifyNoInteractions(wallets);
    }

    @ParameterizedTest
    @CsvSource({"35000,42500,25000,OK", "34000,42500,60000,RECONCILE", "35000,42000,60000,RECONCILE", "35000,42500,24000,INSUFFICIENT"})
    void cashSettlementWithGrossWalletCredits(long snapshotCash, long totalCredits, long workerBalance, String outcome) {
        // Reproduce the cash writer's T-F credits versus D-F settlement snapshot.
        booking.setTotalAmount(n(50000));
        booking.setDepositAmount(n(15000));
        deposit.setPaidAmount(n(15000));
        when(stages.isCompletedService(booking)).thenReturn(true);
        var worker = new UserEntity(); worker.setId(3L);
        var workerWallet = WalletEntity.builder().user(worker).availableBalance(n(workerBalance)).frozenBalance(n(0)).build();
        when(receipts.findByBookingId(9L)).thenReturn(Optional.of(
            BookingCashReceiptEntity.builder().status("BOTH_CONFIRMED")
                .expectedAmount(n(35000)).customerConfirmedAt(OffsetDateTime.now())
                .freelancerConfirmedAt(OffsetDateTime.now())
                .freelancerUser(worker).build()));
        when(settlements.findByBookingId(9L)).thenReturn(Optional.of(
            BookingSettlementEntity.builder().status("SETTLED")
                .totalAmount(n(50000)).depositAmount(n(15000)).cashAmount(n(snapshotCash))
                .walletCreditedAmount(n(7500)).commissionAmount(n(7500)).build()));
        when(ledger.findByReferenceIdAndReferenceTypeAndEntryType(9L, "BOOKING_SETTLEMENT", "CREDIT"))
            .thenReturn(List.of(LedgerEntryEntity.builder().wallet(ownerWallet).amount(n(totalCredits - 25000)).build(),
                LedgerEntryEntity.builder().wallet(workerWallet).amount(n(25000)).build()));

        assertEquals(n(50000), service.inspect(booking).paidAmount());
        assertEquals("SETTLED", service.inspect(booking).stage());
        if (!"RECONCILE".equals(outcome)) {
            when(wallets.findByUserIdWithLock(1L)).thenReturn(Optional.of(customerWallet));
            when(wallets.findByUserIdWithLock(2L)).thenReturn(Optional.of(ownerWallet));
            when(wallets.findByUserIdWithLock(3L)).thenReturn(Optional.of(workerWallet));
        }
        if ("OK".equals(outcome)) {
            assertEquals(BookingStatus.DISPUTE_REFUNDED, service.resolve(booking, "REFUND", "test"));
            assertEquals(n(50000), customerWallet.getAvailableBalance());
            assertEquals(n(72500), ownerWallet.getAvailableBalance());
            assertEquals(n(0), workerWallet.getAvailableBalance());
            verifyNoInteractions(settlementService);
        } else {
            var error = assertThrows(CustomBusinessException.class,
                () -> service.resolve(booking, "REFUND", "test"));
            assertEquals("RECONCILE".equals(outcome) ? "dispute.payment_reconciliation_required"
                : "dispute.insufficient_recovery_balance", error.getMessage());
            assertEquals(n(0), customerWallet.getAvailableBalance());
            assertEquals(n(90000), ownerWallet.getAvailableBalance());
            verify(ledger, never()).save(any());
        }
    }

    @Test void customerConfirmationAloneDoesNotProveCashWasReceived() {
        when(stages.isCompletedService(booking)).thenReturn(true);
        when(receipts.findByBookingId(9L)).thenReturn(Optional.of(
            BookingCashReceiptEntity.builder().status("PENDING")
                .expectedAmount(n(140000)).customerConfirmedAt(OffsetDateTime.now()).build()));
        var financials = service.inspect(booking);
        assertEquals("COMPLETED_UNPAID", financials.stage());
        assertEquals(n(60000), financials.paidAmount());
        assertEquals(n(0), financials.cashAmount());
    }
}
