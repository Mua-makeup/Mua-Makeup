package com.makeup.platform.service.catalog;

import com.makeup.platform.dto.request.catalog.CalculateSurchargeReq;
import com.makeup.platform.dto.request.catalog.ConfigureSurchargeReq;
import com.makeup.platform.dto.response.catalog.SurchargeCalculationRes;
import com.makeup.platform.dto.response.catalog.SurchargeDetailRes;

import java.util.List;

public interface SurchargeService {

    SurchargeDetailRes configureSurcharge(Long userId, ConfigureSurchargeReq req);

    SurchargeDetailRes updateSurcharge(Long userId, Long surchargeId, ConfigureSurchargeReq req);

    void deleteSurcharge(Long userId, Long surchargeId);

    List<SurchargeDetailRes> listMySurcharges(Long userId);

    List<SurchargeDetailRes> listSurchargesByOwner(Long agencyId, Long muaId);

    SurchargeCalculationRes calculateSurcharges(CalculateSurchargeReq req);
}
