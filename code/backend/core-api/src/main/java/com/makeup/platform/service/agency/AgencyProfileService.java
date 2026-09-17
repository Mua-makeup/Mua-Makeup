package com.makeup.platform.service.agency;

import com.makeup.platform.dto.request.agency.UpdateAgencyProfileReq;
import com.makeup.platform.dto.request.agency.UpdateCommissionReq;
import com.makeup.platform.dto.response.agency.AgencyLocationRes;
import com.makeup.platform.dto.response.agency.AgencyProfileRes;

public interface AgencyProfileService {

    AgencyProfileRes getMyAgencyProfile(Long userId);

    AgencyProfileRes getAgencyProfileById(Long agencyId);

    AgencyProfileRes updateAgencyProfile(Long userId, UpdateAgencyProfileReq req);

    AgencyProfileRes updateCommissionRate(Long userId, UpdateCommissionReq req);

    AgencyLocationRes getAgencyLocation(Long agencyId);

    java.util.List<AgencyProfileRes> getAllAgenciesForAdmin(String search, Boolean isVerified);

    AgencyProfileRes verifyAgency(Long agencyId, boolean isVerified);
}
