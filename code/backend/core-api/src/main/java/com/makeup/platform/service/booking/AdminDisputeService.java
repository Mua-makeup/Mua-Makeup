package com.makeup.platform.service.booking;

import com.makeup.platform.common.base.PageResponse;
import com.makeup.platform.dto.request.admin.ResolveDisputeReq;
import com.makeup.platform.dto.response.admin.AdminDisputeRes;
import com.makeup.platform.dto.response.admin.AdminDisputeStatsRes;
import org.springframework.data.domain.Pageable;

public interface AdminDisputeService {

    PageResponse<AdminDisputeRes> getAllDisputes(String status, String keyword, Pageable pageable);

    AdminDisputeStatsRes getDisputeStats();

    AdminDisputeRes getDisputeDetail(Long bookingId);

    AdminDisputeRes resolveDispute(Long bookingId, Long adminUserId, ResolveDisputeReq req);
}
