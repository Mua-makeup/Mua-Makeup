package com.makeup.platform.service.agency;

import com.makeup.platform.dto.request.agency.UpdateAgencyProfileReq;
import com.makeup.platform.dto.request.agency.UpdateCommissionReq;
import com.makeup.platform.dto.response.agency.AgencyProfileRes;

public interface AgencyProfileService {

    AgencyProfileRes getMyAgencyProfile(Long userId);

    AgencyProfileRes getAgencyProfileById(Long agencyId);

    AgencyProfileRes updateAgencyProfile(Long userId, UpdateAgencyProfileReq req);

    AgencyProfileRes updateCommissionRate(Long userId, UpdateCommissionReq req);
}
