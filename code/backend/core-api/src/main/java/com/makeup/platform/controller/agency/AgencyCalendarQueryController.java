package com.makeup.platform.controller.agency;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.response.mua.AvailableTimeSlotRes;
import com.makeup.platform.dto.response.mua.CalendarDayOverviewRes;
import com.makeup.platform.service.agency.AgencyCalendarService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping({"/api/v1/agencies", "/api/v1/agency"})
@RequiredArgsConstructor
public class AgencyCalendarQueryController extends BaseController {

    private final AgencyCalendarService agencyCalendarService;

    @GetMapping("/{agencyId}/calendar-days")
    public ResponseEntity<ApiResponse<List<CalendarDayOverviewRes>>> getCalendarDays(
            @PathVariable Long agencyId,
            @RequestParam(value = "start_date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(value = "days", required = false, defaultValue = "30") Integer days,
            @RequestParam(value = "duration_minutes", required = false, defaultValue = "60") Integer durationMinutes) {

        List<CalendarDayOverviewRes> res = agencyCalendarService.getAgencyCalendarDaysOverview(agencyId, startDate, days, durationMinutes);
        return okWithKey(res, "calendar.days_fetch_success");
    }

    @GetMapping("/{agencyId}/available-slots")
    public ResponseEntity<ApiResponse<AvailableTimeSlotRes>> getAvailableSlots(
            @PathVariable Long agencyId,
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(value = "duration_minutes", required = false, defaultValue = "60") Integer durationMinutes,
            @RequestParam(value = "step_minutes", required = false, defaultValue = "15") Integer stepMinutes) {

        AvailableTimeSlotRes res = agencyCalendarService.getAgencyAvailableSlots(agencyId, date, durationMinutes, stepMinutes);
        return okWithKey(res, "calendar.slots_fetch_success");
    }
}
