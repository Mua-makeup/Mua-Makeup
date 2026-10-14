package com.makeup.platform.service.agency;

import com.makeup.platform.common.base.PageResponse;
import com.makeup.platform.dto.request.admin.ResolveDisputeReq;
import com.makeup.platform.dto.response.agency.AgencyDisputeRes;
import org.springframework.data.domain.Pageable;

public interface AgencyDisputeService {

    PageResponse<AgencyDisputeRes> getAgencyDisputes(Long agencyOwnerId, String status, String keyword, Pageable pageable);

    AgencyDisputeRes getAgencyDisputeDetail(Long agencyOwnerId, Long bookingId);

    AgencyDisputeRes resolveAgencyDispute(Long agencyOwnerId, Long bookingId, ResolveDisputeReq req);
}
