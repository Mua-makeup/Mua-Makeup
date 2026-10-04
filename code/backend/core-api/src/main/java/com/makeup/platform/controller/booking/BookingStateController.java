package com.makeup.platform.controller.booking;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.common.utils.SecurityContextUtils;
import com.makeup.platform.dto.request.booking.TransitionBookingStateReq;
import com.makeup.platform.dto.response.booking.BookingCompletionPhotoRes;
import com.makeup.platform.dto.response.booking.BookingStateTransitionRes;
import com.makeup.platform.dto.response.booking.BookingStatusDetailRes;
import com.makeup.platform.service.booking.BookingStateMachineService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

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

    @GetMapping("/{bookingId}/status")
    public ResponseEntity<ApiResponse<BookingStatusDetailRes>> getBookingStatus(
            @PathVariable Long bookingId) {
        BookingStatusDetailRes res = bookingStateMachineService.getBookingStatusDetail(bookingId);
        return ok(res, "booking.status_retrieved");
    }

    @PostMapping("/{bookingId}/request-cancel-trip")
    public ResponseEntity<ApiResponse<Void>> requestCancelTrip(
            @PathVariable Long bookingId,
            @RequestBody(required = false) Map<String, String> body) {
        Long userId = SecurityContextUtils.getCurrentUserId();
        String reason = body != null ? body.get("reason") : "Khách yêu cầu hủy khi thợ đang di chuyển";
        bookingStateMachineService.requestCancelTripByCustomer(bookingId, userId, reason);
        return ok(null, "booking.cancel_requested_sent");
    }

    @PostMapping("/{bookingId}/confirm-cancel-compensation")
    public ResponseEntity<ApiResponse<BookingStateTransitionRes>> confirmCancelCompensation(
            @PathVariable Long bookingId) {
        Long userId = SecurityContextUtils.getCurrentUserId();
        BookingStateTransitionRes res = bookingStateMachineService.confirmCancelCompensationByMua(bookingId, userId);
        return ok(res, "booking.cancel_compensation_confirmed");
    }

    @PostMapping("/{bookingId}/reject-cancel-compensation")
    public ResponseEntity<ApiResponse<Void>> rejectCancelCompensation(
            @PathVariable Long bookingId,
            @RequestBody(required = false) Map<String, String> body) {
        Long userId = SecurityContextUtils.getCurrentUserId();
        String reason = body != null ? body.get("reason") : null;
        bookingStateMachineService.rejectCancelCompensationByMua(bookingId, userId, reason);
        return ok(null, "booking.cancel_compensation_rejected");
    }
}
