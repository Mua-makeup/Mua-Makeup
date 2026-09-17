package com.makeup.platform.controller.booking;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.response.booking.BookingHistoryRes;
import com.makeup.platform.service.booking.BookingAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
public class BookingHistoryController extends BaseController {

    private final BookingAuditService bookingAuditService;

    @GetMapping("/{bookingId}/history")
    public ResponseEntity<ApiResponse<BookingHistoryRes>> getBookingHistory(@PathVariable Long bookingId) {
        BookingHistoryRes res = bookingAuditService.getBookingHistory(bookingId);
        return ok(res, "booking.history_fetch_success");
    }
}
