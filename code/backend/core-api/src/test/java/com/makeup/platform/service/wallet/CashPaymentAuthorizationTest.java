package com.makeup.platform.service.wallet;

import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.wallet.CashPaymentConfirmationReq;
import com.makeup.platform.entity.booking.BookingEntity;
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
    @InjectMocks CashPaymentServiceImpl service;
    @Test void unrelatedWorkerCannotConfirmReceiptOrSettle() {
        when(bookings.findById(1L)).thenReturn(Optional.of(new BookingEntity()));
        assertThrows(CustomBusinessException.class,()->service.confirmByWorker(1L,9L,new CashPaymentConfirmationReq()));
        verifyNoInteractions(receipts,settlement);
    }
    @Test void unrelatedWorkerCannotDeclineReceipt() {
        when(bookings.findById(1L)).thenReturn(Optional.of(new BookingEntity()));
        assertThrows(CustomBusinessException.class,()->service.declineByWorker(1L,9L,"reason"));
        verifyNoInteractions(receipts,settlement);
    }
    @Test void missingBookingCannotCreateReceipt() {
        assertThrows(CustomBusinessException.class,()->service.confirmByCustomer(1L,9L,new CashPaymentConfirmationReq()));
        verifyNoInteractions(receipts,settlement);
    }
}
