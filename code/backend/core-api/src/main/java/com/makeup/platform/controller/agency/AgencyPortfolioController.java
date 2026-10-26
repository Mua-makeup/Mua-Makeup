package com.makeup.platform.controller.agency;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.common.base.PageResponse;
import com.makeup.platform.dto.request.mua.CreatePortfolioReq;
import com.makeup.platform.dto.request.mua.UpdatePortfolioFeaturedReq;
import com.makeup.platform.dto.request.mua.UpdatePortfolioReq;
import com.makeup.platform.dto.request.mua.UpdatePortfolioVisibilityReq;
import com.makeup.platform.dto.response.mua.PortfolioDetailRes;
import com.makeup.platform.dto.response.mua.PortfolioSummaryRes;
import com.makeup.platform.service.catalog.PortfolioService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1/agencies")
@RequiredArgsConstructor
public class AgencyPortfolioController extends BaseController {

    private final PortfolioService portfolioService;

    @PostMapping(value = "/my-agency/portfolios", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<PortfolioDetailRes>> createAgencyPortfolio(
            @AuthenticationPrincipal Long userId,
            @Valid @ModelAttribute CreatePortfolioReq req) {
        PortfolioDetailRes res = portfolioService.createAgencyPortfolioShowcase(userId, req);
        return created(res, "agency.portfolio_create_success");
    }

    @PutMapping(value = "/my-agency/portfolios/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<PortfolioDetailRes>> updateAgencyPortfolio(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id,
            @Valid @ModelAttribute UpdatePortfolioReq req) {
        PortfolioDetailRes res = portfolioService.updateAgencyPortfolioShowcase(userId, id, req);
        return ok(res, "agency.portfolio_update_success");
    }

    @PutMapping(value = "/my-agency/portfolios/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<PortfolioDetailRes>> updateAgencyPortfolioJson(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id,
            @Valid @RequestBody UpdatePortfolioReq req) {
        PortfolioDetailRes res = portfolioService.updateAgencyPortfolioShowcase(userId, id, req);
        return ok(res, "agency.portfolio_update_success");
    }

    @PatchMapping("/my-agency/portfolios/{id}/featured")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<PortfolioDetailRes>> updateAgencyFeaturedStatus(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id,
            @Valid @RequestBody UpdatePortfolioFeaturedReq req) {
        PortfolioDetailRes res = portfolioService.updateAgencyFeaturedStatus(userId, id, req);
        return ok(res, "agency.portfolio_update_success");
    }

    @PatchMapping("/my-agency/portfolios/{id}/visibility")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<PortfolioDetailRes>> updateAgencyVisibilityStatus(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id,
            @Valid @RequestBody UpdatePortfolioVisibilityReq req) {
        PortfolioDetailRes res = portfolioService.updateAgencyVisibilityStatus(userId, id, req);
        return ok(res, "agency.portfolio_update_success");
    }

    @DeleteMapping("/my-agency/portfolios/{id}")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteAgencyPortfolio(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id) {
        portfolioService.softDeleteAgencyPortfolio(userId, id);
        return ok(null, "agency.portfolio_delete_success");
    }

    @GetMapping("/my-agency/portfolios")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<PortfolioDetailRes>>> getMyAgencyPortfolios(
            @AuthenticationPrincipal Long userId,
            @RequestParam(value = "page", defaultValue = "0") @Min(value = 0, message = "{validation.page_min}") int page,
            @RequestParam(value = "size", defaultValue = "12") @Min(value = 1, message = "{validation.page_size_min}") @Max(value = 100, message = "{validation.page_size_max}") int size) {

        PageResponse<PortfolioDetailRes> res = portfolioService.getMyAgencyPortfolios(userId, PageRequest.of(page, size));
        return ok(res, "agency.portfolios_list_success");
    }

    @GetMapping("/my-agency/portfolios/{id}")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<PortfolioDetailRes>> getAgencyPortfolioDetail(
            @PathVariable Long id) {
        PortfolioDetailRes res = portfolioService.getPortfolioDetail(id);
        return ok(res, "agency.portfolio_get_success");
    }

    @GetMapping("/{agencyId}/portfolios")
    public ResponseEntity<ApiResponse<PageResponse<PortfolioSummaryRes>>> getAgencyPublicGallery(
            @PathVariable Long agencyId,
            @RequestParam(value = "style_id", required = false) Integer styleId,
            @RequestParam(value = "package_id", required = false) Long packageIdSnake,
            @RequestParam(value = "packageId", required = false) Long packageIdCamel,
            @RequestParam(value = "is_featured", required = false) Boolean isFeatured,
            @RequestParam(value = "page", defaultValue = "0") @Min(value = 0, message = "{validation.page_min}") int page,
            @RequestParam(value = "size", defaultValue = "12") @Min(value = 1, message = "{validation.page_size_min}") @Max(value = 100, message = "{validation.page_size_max}") int size) {

        Long packageId = packageIdSnake != null ? packageIdSnake : packageIdCamel;
        PageResponse<PortfolioSummaryRes> res = portfolioService.getAgencyPublicGallery(
                agencyId, styleId, packageId, isFeatured, PageRequest.of(page, size));
        return ok(res, "agency.portfolios_list_success");
    }
}
