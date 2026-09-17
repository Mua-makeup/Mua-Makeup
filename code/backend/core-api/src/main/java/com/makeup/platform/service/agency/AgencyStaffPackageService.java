package com.makeup.platform.service.agency;

import com.makeup.platform.dto.request.agency.AssignStaffPackagesReq;
import com.makeup.platform.dto.response.agency.StaffPackagesRes;

public interface AgencyStaffPackageService {

    StaffPackagesRes assignPackagesToStaff(Long userId, AssignStaffPackagesReq req);

    StaffPackagesRes getStaffPackages(Long userId, Long staffId);
}
