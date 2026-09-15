package com.makeup.platform.service.agency;

import com.makeup.platform.dto.request.agency.AssignStaffStylesReq;
import com.makeup.platform.dto.response.agency.AssignedStyleRes;
import com.makeup.platform.dto.response.agency.StaffStylesRes;

import java.util.List;

public interface AgencyStaffStyleService {

    StaffStylesRes assignStylesToStaff(Long userId, Long staffId, AssignStaffStylesReq req);

    List<AssignedStyleRes> getStaffStyles(Long userId, Long staffId);
}
