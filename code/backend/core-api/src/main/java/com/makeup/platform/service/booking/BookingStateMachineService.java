package com.makeup.platform.service.booking;

import com.makeup.platform.dto.request.booking.TransitionBookingStateReq;
import com.makeup.platform.dto.response.booking.BookingStateTransitionRes;

public interface BookingStateMachineService {

    BookingStateTransitionRes transitionState(Long bookingId, Long userId, TransitionBookingStateReq req);
}
