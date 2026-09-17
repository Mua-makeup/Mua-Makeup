package com.makeup.platform.service.booking;

import com.makeup.platform.dto.request.booking.TransitionBookingStateReq;
import com.makeup.platform.dto.response.booking.BookingCompletionPhotoRes;
import com.makeup.platform.dto.response.booking.BookingStateTransitionRes;
import com.makeup.platform.dto.response.booking.BookingStatusDetailRes;

import org.springframework.web.multipart.MultipartFile;

public interface BookingStateMachineService {

    BookingStateTransitionRes transitionState(Long bookingId, Long userId, TransitionBookingStateReq req);

    BookingCompletionPhotoRes uploadCompletionPhoto(Long bookingId, Long userId, MultipartFile file);

    BookingStatusDetailRes getBookingStatusDetail(Long bookingId);
}
