package com.makeup.platform.service.booking;

import com.makeup.platform.entity.booking.*;
import com.makeup.platform.repository.booking.BookingHistoryRepository;
import com.makeup.platform.repository.wallet.BookingSettlementRepository;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DisputeStageServiceTest {
    @Test void pricesAndUploadedPhotoDoNotProveCompletion() {
        var history = mock(BookingHistoryRepository.class);
        var settlements = mock(BookingSettlementRepository.class);
        var service = new DisputeStageService(history, settlements);
        var booking = new BookingEntity(); booking.setId(1L); booking.setStatus(BookingStatus.DISPUTED);
        booking.setTotalAmount(new BigDecimal("200000")); booking.setDepositAmount(new BigDecimal("60000"));
        booking.setCompletionPhotoUrl("uploaded-before-completion.jpg");
        assertFalse(service.isCompletedService(booking));
        when(history.existsByBookingIdAndToStatusIn(eq(1L), anyList())).thenReturn(true);
        assertTrue(service.isCompletedService(booking));
    }
    @Test void settlementProvesCompletionWithoutPhoto() {
        var history = mock(BookingHistoryRepository.class);
        var settlements = mock(BookingSettlementRepository.class);
        var booking = new BookingEntity(); booking.setId(1L); booking.setStatus(BookingStatus.DISPUTED);
        when(settlements.existsByBookingId(1L)).thenReturn(true);
        assertTrue(new DisputeStageService(history, settlements).isCompletedService(booking));
    }
}
