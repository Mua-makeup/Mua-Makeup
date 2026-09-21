package com.makeup.platform.service.mua;

import com.makeup.platform.dto.request.admin.VerifyCertificateReq;
import com.makeup.platform.dto.request.mua.UpdateMuaProfileReq;
import com.makeup.platform.dto.request.mua.UploadCertificateReq;
import com.makeup.platform.dto.response.admin.AdminMuaCertificateRes;
import com.makeup.platform.dto.response.mua.CertificateRes;
import com.makeup.platform.dto.response.mua.MuaProfileRes;

import java.util.List;

public interface MuaProfileService {

    MuaProfileRes getPublicProfile(Long muaId);

    MuaProfileRes getMyProfile(Long userId);

    MuaProfileRes updateMyProfile(Long userId, UpdateMuaProfileReq req);

    CertificateRes uploadCertificate(Long userId, UploadCertificateReq req);

    CertificateRes verifyCertificate(Long muaId, VerifyCertificateReq req);

    List<AdminMuaCertificateRes> getAllCertificatesForAdmin(String status);

    List<String> uploadPortfolioImages(Long userId, List<org.springframework.web.multipart.MultipartFile> files);

    List<String> deletePortfolioImage(Long userId, String imageUrl);
}
