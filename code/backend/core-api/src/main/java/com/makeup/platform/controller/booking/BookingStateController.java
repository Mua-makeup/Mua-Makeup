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

import com.makeup.platform.dto.response.booking.BookingCompletionPhotoRes;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

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

    @PostMapping(value = "/{bookingId}/completion-photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<BookingCompletionPhotoRes>> uploadCompletionPhoto(
            @PathVariable Long bookingId,
            @RequestParam("file") MultipartFile file) {
        Long userId = SecurityContextUtils.getCurrentUserId();
        BookingCompletionPhotoRes res = bookingStateMachineService.uploadCompletionPhoto(bookingId, userId, file);
        return ok(res, "booking.completion_photo_upload_success");
    }
}
