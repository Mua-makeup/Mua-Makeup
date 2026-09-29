package com.makeup.platform.service.booking;

import com.makeup.platform.dto.response.booking.FreelancerBookingItemRes;

import java.time.LocalDate;
import java.util.List;

public interface FreelancerBookingService {
    List<FreelancerBookingItemRes> getMyAssignedBookings(Long userId, LocalDate date, String statusGroup);
}
