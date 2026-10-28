package com.makeup.platform.service.agency;


import org.springframework.data.domain.Pageable;

import com.makeup.platform.common.base.PageResponse;
import com.makeup.platform.dto.request.agency.UpdateAgencyProfileReq;
import com.makeup.platform.dto.request.agency.UpdateCommissionReq;
import com.makeup.platform.dto.response.agency.AgencyLocationRes;
import com.makeup.platform.dto.response.agency.AgencyProfileRes;
import com.makeup.platform.dto.request.admin.AdminCreateAgencyReq;
import java.util.List;
import org.springframework.web.multipart.MultipartFile;

public interface AgencyProfileService {

    AgencyProfileRes getMyAgencyProfile(Long userId);

    AgencyProfileRes getAgencyProfileById(Long agencyId);

    AgencyProfileRes updateAgencyProfile(Long userId, UpdateAgencyProfileReq req);

    AgencyProfileRes updateCommissionRate(Long userId, UpdateCommissionReq req);

    AgencyLocationRes getAgencyLocation(Long agencyId);

    PageResponse<AgencyProfileRes> getAllAgenciesForAdmin(String search, Boolean isVerified, Pageable pageable);

    AgencyProfileRes verifyAgency(Long agencyId, boolean isVerified);

    AgencyProfileRes uploadLogo(Long userId, MultipartFile file);

    AgencyProfileRes createAgencyByAdmin(AdminCreateAgencyReq req);

    List<AgencyProfileRes> getPublicAgencies(Integer limit);
}

