package com.makeup.platform.service.agency;


import org.springframework.data.domain.Pageable;

import com.makeup.platform.common.base.PageResponse;
import com.makeup.platform.dto.request.agency.UpdateAgencyProfileReq;
import com.makeup.platform.dto.request.agency.UpdateCommissionReq;
import com.makeup.platform.dto.response.agency.AgencyLocationRes;
import com.makeup.platform.dto.response.agency.AgencyProfileRes;
import com.makeup.platform.dto.request.admin.AdminCreateAgencyReq;

public interface AgencyProfileService {

    AgencyProfileRes getMyAgencyProfile(Long userId);

    AgencyProfileRes getAgencyProfileById(Long agencyId);

    AgencyProfileRes updateAgencyProfile(Long userId, UpdateAgencyProfileReq req);

    AgencyProfileRes updateCommissionRate(Long userId, UpdateCommissionReq req);

    AgencyLocationRes getAgencyLocation(Long agencyId);

    PageResponse<AgencyProfileRes> getAllAgenciesForAdmin(String search, Boolean isVerified, Pageable pageable);

    AgencyProfileRes verifyAgency(Long agencyId, boolean isVerified);

    AgencyProfileRes uploadLogo(Long userId, org.springframework.web.multipart.MultipartFile file);

    AgencyProfileRes createAgencyByAdmin(AdminCreateAgencyReq req);
}

