package com.makeup.platform.service.customer;

import com.makeup.platform.dto.response.booking.CustomerBookingItemRes;

import java.util.List;

public interface CustomerBookingQueryService {
    List<CustomerBookingItemRes> getMyBookings(Long customerId, String statusGroup);
}
