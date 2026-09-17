package com.makeup.platform.service.booking;

import com.makeup.platform.dto.response.admin.AdminBookingRes;

import java.util.List;

public interface AdminBookingService {

    List<AdminBookingRes> getAllBookings(String status, String keyword);

    AdminBookingRes getBookingDetail(Long id);
}
