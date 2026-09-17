package com.makeup.platform.mapper.telemetry;

import com.makeup.platform.dto.response.telemetry.NearbyProviderRes;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.entity.telemetry.AgencyBranchEntity;
import com.makeup.platform.entity.telemetry.ProviderType;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;

@Component
public class TelemetryProviderMapper {

    public NearbyProviderRes fromSummaryMap(Map<String, Object> summary) {
        if (summary == null) {
            return null;
        }

        NearbyProviderRes res = new NearbyProviderRes();
        if (summary.containsKey("providerId")) {
            res.setProviderId(Long.valueOf(summary.get("providerId").toString()));
        }
        if (summary.containsKey("providerType")) {
            res.setProviderType(ProviderType.valueOf(summary.get("providerType").toString()));
        }
        if (summary.containsKey("code")) {
            res.setCode(summary.get("code").toString());
        }
        if (summary.containsKey("fullName")) {
            res.setFullName(summary.get("fullName").toString());
        }
        if (summary.containsKey("avatarUrl") && summary.get("avatarUrl") != null) {
            res.setAvatarUrl(summary.get("avatarUrl").toString());
        }
        if (summary.containsKey("ratingAvg")) {
            res.setRatingAvg(BigDecimal.valueOf(Double.parseDouble(summary.get("ratingAvg").toString())));
        }
        if (summary.containsKey("startingPrice")) {
            res.setStartingPrice(BigDecimal.valueOf(Double.parseDouble(summary.get("startingPrice").toString())));
        }
        return res;
    }

    public NearbyProviderRes fromMuaEntity(MuaProfileEntity mua, BigDecimal startingPrice) {
        if (mua == null) {
            return null;
        }

        return NearbyProviderRes.builder()
                .providerId(mua.getId())
                .providerType(ProviderType.FREELANCE_MUA)
                .code(mua.getMuaCode())
                .fullName(mua.getUser() != null ? mua.getUser().getFullName() : "MUA " + mua.getMuaCode())
                .avatarUrl(mua.getUser() != null ? mua.getUser().getAvatarUrl() : null)
                .ratingAvg(mua.getRatingAvg())
                .startingPrice(startingPrice != null ? startingPrice : BigDecimal.valueOf(350000))
                .build();
    }

    public NearbyProviderRes fromAgencyBranch(AgencyBranchEntity branch, double distanceKm, double[] fuzzedCoordinates) {
        if (branch == null) {
            return null;
        }

        return NearbyProviderRes.builder()
                .providerId(branch.getId())
                .providerType(ProviderType.AGENCY_STUDIO)
                .code("STUDIO_" + branch.getAgencyId())
                .fullName(branch.getBranchName())
                .avatarUrl(null)
                .distanceKm(BigDecimal.valueOf(distanceKm).setScale(2, RoundingMode.HALF_UP).doubleValue())
                .ratingAvg(BigDecimal.valueOf(5.0))
                .startingPrice(BigDecimal.valueOf(500000))
                .fuzzedLatitude(fuzzedCoordinates != null && fuzzedCoordinates.length >= 2 ? fuzzedCoordinates[0] : null)
                .fuzzedLongitude(fuzzedCoordinates != null && fuzzedCoordinates.length >= 2 ? fuzzedCoordinates[1] : null)
                .build();
    }
}
