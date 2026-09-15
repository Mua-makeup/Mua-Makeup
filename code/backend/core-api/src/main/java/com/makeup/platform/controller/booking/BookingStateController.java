package com.makeup.platform.controller.booking;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.common.utils.SecurityContextUtils;
import com.makeup.platform.dto.request.booking.TransitionBookingStateReq;
import com.makeup.platform.dto.response.booking.BookingStateTransitionRes;
import com.makeup.platform.service.booking.BookingStateMachineService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
public class BookingStateController extends BaseController {

    private final BookingStateMachineService bookingStateMachineService;

    @PostMapping("/{bookingId}/transition")
    public ResponseEntity<ApiResponse<BookingStateTransitionRes>> transitionState(
            @PathVariable Long bookingId,
            @Valid @RequestBody TransitionBookingStateReq req) {
        Long userId = SecurityContextUtils.getCurrentUserId();
        BookingStateTransitionRes res = bookingStateMachineService.transitionState(bookingId, userId, req);
        return ok(res, "booking.transition_success");
    }
}
