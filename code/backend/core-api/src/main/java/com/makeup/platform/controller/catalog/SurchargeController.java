package com.makeup.platform.controller.catalog;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.request.catalog.CalculateSurchargeReq;
import com.makeup.platform.dto.request.catalog.ConfigureSurchargeReq;
import com.makeup.platform.dto.response.catalog.SurchargeCalculationRes;
import com.makeup.platform.dto.response.catalog.SurchargeDetailRes;
import com.makeup.platform.service.catalog.SurchargeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/surcharges")
@RequiredArgsConstructor
public class SurchargeController extends BaseController {

    private final SurchargeService surchargeService;

    @PostMapping
    @PreAuthorize("hasAnyRole('AGENCY_ADMIN', 'FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<SurchargeDetailRes>> configureSurcharge(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody ConfigureSurchargeReq req) {
        SurchargeDetailRes res = surchargeService.configureSurcharge(userId, req);
        return created(res, "Thiết lập phụ phí thành công!");
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('AGENCY_ADMIN', 'FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<SurchargeDetailRes>> updateSurcharge(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id,
            @Valid @RequestBody ConfigureSurchargeReq req) {
        SurchargeDetailRes res = surchargeService.updateSurcharge(userId, id, req);
        return ok(res, "Cập nhật phụ phí thành công!");
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('AGENCY_ADMIN', 'FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<Void>> deleteSurcharge(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id) {
        surchargeService.deleteSurcharge(userId, id);
        return ok(null, "Xóa cấu hình phụ phí thành công!");
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('AGENCY_ADMIN', 'FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<List<SurchargeDetailRes>>> listMySurcharges(
            @AuthenticationPrincipal Long userId) {
        return ok(surchargeService.listMySurcharges(userId));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<SurchargeDetailRes>>> listSurcharges(
            @RequestParam(required = false) Long agencyId,
            @RequestParam(required = false) Long muaId) {
        return ok(surchargeService.listSurchargesByOwner(agencyId, muaId));
    }

    @PostMapping("/calculate")
    public ResponseEntity<ApiResponse<SurchargeCalculationRes>> calculateSurcharges(
            @Valid @RequestBody CalculateSurchargeReq req) {
        SurchargeCalculationRes res = surchargeService.calculateSurcharges(req);
        return ok(res, "Tính toán phụ phí thành công!");
    }
}
