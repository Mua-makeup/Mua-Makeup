package com.makeup.platform.controller.mua;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.response.mua.AvailableTimeSlotRes;
import com.makeup.platform.service.mua.MUACalendarService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/mua")
@RequiredArgsConstructor
public class MUACalendarQueryController extends BaseController {

    private final MUACalendarService muaCalendarService;

    @GetMapping("/{muaId}/available-slots")
    public ResponseEntity<ApiResponse<AvailableTimeSlotRes>> getAvailableSlots(
            @PathVariable Long muaId,
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(value = "duration_minutes", required = false, defaultValue = "90") Integer durationMinutes,
            @RequestParam(value = "step_minutes", required = false, defaultValue = "30") Integer stepMinutes) {

        AvailableTimeSlotRes res = muaCalendarService.getAvailableSlots(muaId, date, durationMinutes, stepMinutes);
        return okWithKey(res, "calendar.slots_fetch_success");
    }
}
