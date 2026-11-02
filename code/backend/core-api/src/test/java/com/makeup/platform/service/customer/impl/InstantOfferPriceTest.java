package com.makeup.platform.service.customer.impl;

import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.repository.booking.BookingRepository;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.math.BigDecimal;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class InstantOfferPriceTest {
    @Test
    void dispatchedQuoteReplacesProvisionalPriceBeforeAcceptance() {
        var service = mock(CustomerInstantBookingServiceImpl.class, CALLS_REAL_METHODS);
        var repository = mock(BookingRepository.class);
        ReflectionTestUtils.setField(service, "bookingRepository", repository);
        var booking = BookingEntity.builder()
                .serviceSubtotal(new BigDecimal("500000"))
                .surchargeFee(new BigDecimal("400000"))
                .totalAmount(new BigDecimal("900000"))
                .depositAmount(new BigDecimal("270000")).build();
        ReflectionTestUtils.invokeMethod(service, "persistOfferPrice", booking, Map.of(
                "basePrice", new BigDecimal("50000"),
                "emergencySurchargeFee", new BigDecimal("150000"),
                "totalAmount", new BigDecimal("200000")));
        assertEquals(0, booking.getServiceSubtotal().compareTo(new BigDecimal("50000")));
        assertEquals(0, booking.getSurchargeFee().compareTo(new BigDecimal("150000")));
        assertEquals(0, booking.getTotalAmount().compareTo(new BigDecimal("200000")));
        assertEquals(0, booking.getDepositAmount().compareTo(new BigDecimal("60000")));
        assertEquals(BigDecimal.ONE, booking.getSurgeMultiplier());
        verify(repository).save(booking);
    }
}
