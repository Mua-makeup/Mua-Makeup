package com.makeup.platform.repository.booking.projection;

import com.makeup.platform.entity.booking.BookingStatus;
import java.math.BigDecimal;

public interface BookingStatusAggregate {
    BookingStatus getStatus();
    Boolean getNeedsEmergencyReassignment();
    Long getBookingCount();
    BigDecimal getTotalAmount();
}
