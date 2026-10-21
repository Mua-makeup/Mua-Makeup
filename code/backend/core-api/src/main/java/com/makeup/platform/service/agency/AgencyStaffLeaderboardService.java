package com.makeup.platform.service.agency;

import com.makeup.platform.dto.response.agency.StaffLeaderboardRes;

public interface AgencyStaffLeaderboardService {

    StaffLeaderboardRes getStaffLeaderboard(Long currentUserId, String period);
}
