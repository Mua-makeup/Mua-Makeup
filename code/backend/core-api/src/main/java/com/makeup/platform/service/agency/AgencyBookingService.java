package com.makeup.platform.service.agency;

import com.makeup.platform.dto.response.agency.AgencyBookingRes;

import java.util.List;

public interface AgencyBookingService {

    List<AgencyBookingRes> getAgencyBookings(Long ownerUserId, String status, String keyword);
}
