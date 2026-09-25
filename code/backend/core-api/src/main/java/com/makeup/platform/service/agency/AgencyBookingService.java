package com.makeup.platform.service.agency;

import com.makeup.platform.common.base.PageResponse;
import com.makeup.platform.dto.response.agency.AgencyBookingOverviewStatsRes;
import com.makeup.platform.dto.response.agency.AgencyBookingRes;
import org.springframework.data.domain.Pageable;

public interface AgencyBookingService {

    PageResponse<AgencyBookingRes> getAgencyBookings(Long ownerUserId, String status, String keyword, Pageable pageable);

    AgencyBookingOverviewStatsRes getAgencyBookingOverviewStats(Long ownerUserId);
}
