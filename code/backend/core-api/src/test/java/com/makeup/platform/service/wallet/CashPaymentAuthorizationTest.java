package com.makeup.platform.service.wallet;

import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.wallet.CashPaymentConfirmationReq;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.entity.wallet.BookingCashReceiptEntity;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.repository.booking.BookingStaffAssignmentRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.wallet.BookingCashReceiptRepository;
import com.makeup.platform.service.wallet.impl.CashPaymentServiceImpl;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CashPaymentAuthorizationTest {
    @Mock BookingRepository bookings;
    @Mock BookingCashReceiptRepository receipts;
    @Mock BookingSettlementService settlement;
    @Mock UserRepository users;
    @Mock BookingStaffAssignmentRepository assignments;
    @InjectMocks CashPaymentServiceImpl service;
    @Test void unrelatedWorkerCannotConfirmReceiptOrSettle() {
        when(bookings.findByIdForUpdate(1L)).thenReturn(Optional.of(new BookingEntity()));
        assertThrows(CustomBusinessException.class,()->service.confirmByWorker(1L,9L,new CashPaymentConfirmationReq()));
        verifyNoInteractions(receipts,settlement);
    }
    @Test void unrelatedWorkerCannotDeclineReceipt() {
        when(bookings.findByIdForUpdate(1L)).thenReturn(Optional.of(new BookingEntity()));
        assertThrows(CustomBusinessException.class,()->service.declineByWorker(1L,9L,"reason"));
        verifyNoInteractions(receipts,settlement);
    }
    @Test void missingBookingCannotCreateReceipt() {
        assertThrows(CustomBusinessException.class,()->service.confirmByCustomer(1L,9L,new CashPaymentConfirmationReq()));
        verify(receipts, never()).save(any());
        verifyNoInteractions(settlement);
    }
    @Test void existingReceiptCannotBypassCustomerOwnership() {
        var owner = new UserEntity(); owner.setId(2L);
        var booking = new BookingEntity(); booking.setCustomer(owner);
        when(bookings.findByIdForUpdate(1L)).thenReturn(Optional.of(booking));
        assertThrows(CustomBusinessException.class, () -> service.confirmByCustomer(1L,9L,new CashPaymentConfirmationReq()));
        verifyNoInteractions(receipts, settlement);
    }
    @Test void unrelatedUserCannotReadReceipt() {
        when(bookings.findById(1L)).thenReturn(Optional.of(new BookingEntity()));
        assertThrows(CustomBusinessException.class, () -> service.getStatus(1L,9L));
        verifyNoInteractions(receipts);
    }
    @Test void workerConfirmationDoesNotInventCustomerConfirmation() {
        var worker = new UserEntity(); worker.setId(9L);
        var mua = new MuaProfileEntity(); mua.setUser(worker);
        var booking = new BookingEntity(); booking.setMua(mua);
        booking.setStatus(BookingStatus.COMPLETED);
        var receipt = BookingCashReceiptEntity.builder().booking(booking).status("PENDING").build();
        when(bookings.findByIdForUpdate(1L)).thenReturn(Optional.of(booking));
        when(bookings.findById(1L)).thenReturn(Optional.of(booking));
        when(users.findById(9L)).thenReturn(Optional.of(worker));
        when(receipts.findByBookingIdWithLock(1L)).thenReturn(Optional.of(receipt));
        service.confirmByWorker(1L,9L,new CashPaymentConfirmationReq());
        assertNotNull(receipt.getFreelancerConfirmedAt());
        assertNull(receipt.getCustomerConfirmedAt());
        verifyNoInteractions(settlement);
    }
}
