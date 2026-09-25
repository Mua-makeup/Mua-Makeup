package com.makeup.platform.controller.freelancer;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.utils.SecurityContextUtils;
import com.makeup.platform.dto.request.mua.BlockCalendarSlotReq;
import com.makeup.platform.dto.response.mua.MUACalendarSlotRes;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.service.mua.MUACalendarService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/freelancer/calendar")
@RequiredArgsConstructor
public class FreelancerCalendarController extends BaseController {

    private final MUACalendarService muaCalendarService;
    private final MuaProfileRepository muaProfileRepository;

    @PostMapping("/block")
    @PreAuthorize("hasAnyRole('FREELANCE_MUA', 'AGENCY_STAFF')")
    public ResponseEntity<ApiResponse<MUACalendarSlotRes>> blockPersonalSlot(
            @Valid @RequestBody BlockCalendarSlotReq req) {
        Long userId = SecurityContextUtils.getCurrentUserId();
        MuaProfileEntity muaProfile = muaProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_MUA_PROFILE_NOT_FOUND, "mua.profile_not_found"));

        MUACalendarSlotRes res = muaCalendarService.blockPersonalSlot(muaProfile.getId(), req);
        return createdWithKey(res, "calendar.slot_blocked_success");
    }

    @DeleteMapping("/block/{calendarId}")
    @PreAuthorize("hasAnyRole('FREELANCE_MUA', 'AGENCY_STAFF')")
    public ResponseEntity<ApiResponse<Void>> unblockPersonalSlot(
            @PathVariable Long calendarId) {
        Long userId = SecurityContextUtils.getCurrentUserId();
        MuaProfileEntity muaProfile = muaProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_MUA_PROFILE_NOT_FOUND, "mua.profile_not_found"));

        muaCalendarService.unblockPersonalSlot(muaProfile.getId(), calendarId);
        return okWithKey(null, "calendar.slot_unblocked_success");
    }
}
