package com.makeup.platform.service.booking;

import com.makeup.platform.common.base.PageResponse;
import com.makeup.platform.dto.response.admin.AdminBookingOverviewStatsRes;
import com.makeup.platform.dto.response.admin.AdminBookingRes;
import org.springframework.data.domain.Pageable;

public interface AdminBookingService {

    PageResponse<AdminBookingRes> getAllBookings(String status, String keyword, Pageable pageable);

    AdminBookingRes getBookingDetail(Long id);

    AdminBookingOverviewStatsRes getBookingOverviewStats();
}
