package com.makeup.platform.service.agency;

import com.makeup.platform.dto.response.mua.AvailableTimeSlotRes;
import com.makeup.platform.dto.response.mua.CalendarDayOverviewRes;

import java.time.LocalDate;
import java.util.List;

public interface AgencyCalendarService {

    List<CalendarDayOverviewRes> getAgencyCalendarDaysOverview(Long agencyId, LocalDate startDate, Integer days, Integer durationMinutes);

    AvailableTimeSlotRes getAgencyAvailableSlots(Long agencyId, LocalDate date, Integer durationMinutes, Integer stepMinutes);
}
