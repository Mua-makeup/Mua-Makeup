package com.makeup.platform.service.agency;

import com.makeup.platform.dto.request.agency.ConfigureShiftReq;
import com.makeup.platform.dto.response.agency.ShiftDetailRes;
import com.makeup.platform.dto.response.agency.WeeklyShiftMatrixRes;

import java.util.List;

public interface AgencyShiftService {

    ShiftDetailRes createShift(Long userId, ConfigureShiftReq req);

    WeeklyShiftMatrixRes getWeeklyShiftMatrix(Long userId);

    ShiftDetailRes updateShift(Long userId, Long shiftId, ConfigureShiftReq req);

    List<ShiftDetailRes> getStaffShifts(Long userId, Long staffId);

    void deleteShift(Long userId, Long shiftId);
}
