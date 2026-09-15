package com.makeup.platform.service.booking;

import com.makeup.platform.dto.response.booking.BookingHistoryRes;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingHistoryEntity;
import com.makeup.platform.entity.booking.BookingStatus;

import java.util.List;

public interface BookingAuditService {

    BookingHistoryEntity logTransition(BookingEntity booking, BookingStatus fromStatus, BookingStatus toStatus, Long changedByUserId, String note);

    BookingHistoryEntity logTransition(Long bookingId, BookingStatus fromStatus, BookingStatus toStatus, Long changedByUserId, String note);

    BookingHistoryRes getBookingHistory(Long bookingId);
}
