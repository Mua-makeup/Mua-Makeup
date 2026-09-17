package com.makeup.platform.controller.admin;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.response.admin.AdminBookingRes;
import com.makeup.platform.service.booking.AdminBookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/bookings")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminBookingController extends BaseController {

    private final AdminBookingService adminBookingService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AdminBookingRes>>> getAllBookings(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword
    ) {
        List<AdminBookingRes> bookings = adminBookingService.getAllBookings(status, keyword);
        return ok(bookings, "admin.bookings_fetch_success");
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminBookingRes>> getBookingDetail(@PathVariable Long id) {
        AdminBookingRes detail = adminBookingService.getBookingDetail(id);
        return ok(detail, "admin.booking_detail_fetch_success");
    }
}
