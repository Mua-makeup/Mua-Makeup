package com.makeup.platform.controller.agency;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.response.agency.AgencyBookingRes;
import com.makeup.platform.service.agency.AgencyBookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/agency/bookings")
@RequiredArgsConstructor
@PreAuthorize("hasRole('AGENCY_ADMIN')")
public class AgencyBookingController extends BaseController {

    private final AgencyBookingService agencyBookingService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AgencyBookingRes>>> getAgencyBookings(
            @AuthenticationPrincipal Long userId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword
    ) {
        List<AgencyBookingRes> bookings = agencyBookingService.getAgencyBookings(userId, status, keyword);
        return ok(bookings, "agency.bookings_fetch_success");
    }
}
