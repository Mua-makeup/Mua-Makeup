package com.makeup.platform.mapper.mua;

import com.makeup.platform.dto.response.mua.CertificateRes;
import com.makeup.platform.dto.response.mua.MuaProfileRes;
import com.makeup.platform.dto.response.mua.MuaStyleRes;
import com.makeup.platform.entity.mua.MuaCertificateItem;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.entity.mua.MuaStyleEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Collections;
import java.util.List;

@Component
@RequiredArgsConstructor
public class MuaProfileMapper {

    private final MuaStyleMapper styleMapper;

    public CertificateRes toCertificateRes(MuaCertificateItem cert) {
        if (cert == null) {
            return null;
        }
        String status = cert.getStatus();
        if (status == null) {
            status = Boolean.TRUE.equals(cert.getIsVerified()) ? "VERIFIED" : "PENDING";
        }
        return CertificateRes.builder()
                .certName(cert.getCertName())
                .imageUrl(cert.getImageUrl())
                .isVerified(cert.getIsVerified())
                .status(status)
                .notes(cert.getNotes())
                .uploadedAt(cert.getUploadedAt())
                .build();
    }

    public List<CertificateRes> toCertificateResList(Collection<MuaCertificateItem> certs) {
        if (certs == null || certs.isEmpty()) {
            return Collections.emptyList();
        }
        return certs.stream().map(this::toCertificateRes).toList();
    }

    public MuaProfileRes toProfileRes(MuaProfileEntity mua, List<MuaStyleEntity> styles) {
        if (mua == null) {
            return null;
        }

        List<CertificateRes> certResList = toCertificateResList(mua.getCertificates());
        List<MuaStyleRes> styleResList = styleMapper.toResList(styles);

        String fullName = mua.getUser() != null ? mua.getUser().getFullName() : null;
        String avatarUrl = mua.getUser() != null ? mua.getUser().getAvatarUrl() : null;

        return MuaProfileRes.builder()
                .muaId(mua.getId())
                .muaCode(mua.getMuaCode())
                .fullName(fullName)
                .avatarUrl(avatarUrl)
                .bio(mua.getBio())
                .experienceYears(mua.getExperienceYears())
                .maxServiceRadiusKm(mua.getMaxServiceRadiusKm())
                .ratingAverage(mua.getRatingAvg())
                .totalReviews(mua.getTotalReviews())
                .totalCompletedJobs(mua.getTotalCompletedJobs())
                .certificates(certResList)
                .styles(styleResList)
                .portfolioImages(mua.getPortfolioImages())
                .baseAddressText(mua.getBaseAddressText())
                .baseAddressLat(mua.getBaseAddressLat())
                .baseAddressLng(mua.getBaseAddressLng())
                .isSurgeEnabled(mua.getIsSurgeEnabled())
                .updatedAt(mua.getUpdatedAt())
                .build();
    }
}
