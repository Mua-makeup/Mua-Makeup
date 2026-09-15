package com.makeup.platform.controller.mua;

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
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1/muas")
@RequiredArgsConstructor
public class MuaPortfolioController extends BaseController {

    private final PortfolioService portfolioService;


    @PostMapping(value = "/my-profile/portfolios", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('FREELANCE_MUA') and hasAuthority('portfolio:upload')")
    public ResponseEntity<ApiResponse<PortfolioDetailRes>> createPortfolio(
            @AuthenticationPrincipal Long userId,
            @RequestParam("image_file") MultipartFile imageFile,
            @RequestParam(value = "additional_files", required = false) List<MultipartFile> additionalFiles,
            @RequestParam("title") String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "style_id", required = false) Integer styleId,
            @RequestParam(value = "package_id", required = false) Long packageId,
            @RequestParam(value = "is_featured", defaultValue = "false") Boolean isFeatured) {

        CreatePortfolioReq req = CreatePortfolioReq.builder()
                .imageFile(imageFile)
                .additionalFiles(additionalFiles)
                .title(title)
                .description(description)
                .styleId(styleId)
                .packageId(packageId)
                .isFeatured(isFeatured)
                .build();

        PortfolioDetailRes res = portfolioService.createPortfolioShowcase(userId, req);
        return created(res, "mua.portfolio_create_success");
    }

    @PutMapping("/my-profile/portfolios/{id}")
    @PreAuthorize("hasRole('FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<PortfolioDetailRes>> updatePortfolio(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id,
            @Valid @RequestBody UpdatePortfolioReq req) {
        PortfolioDetailRes res = portfolioService.updatePortfolioShowcase(userId, id, req);
        return ok(res, "mua.portfolio_update_success");
    }

    @PatchMapping("/my-profile/portfolios/{id}/featured")
    @PreAuthorize("hasRole('FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<PortfolioDetailRes>> updateFeaturedStatus(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id,
            @Valid @RequestBody UpdatePortfolioFeaturedReq req) {
        PortfolioDetailRes res = portfolioService.updateFeaturedStatus(userId, id, req);
        return ok(res, "mua.portfolio_update_success");
    }

    @PatchMapping("/my-profile/portfolios/{id}/visibility")
    @PreAuthorize("hasRole('FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<PortfolioDetailRes>> updateVisibilityStatus(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id,
            @Valid @RequestBody UpdatePortfolioVisibilityReq req) {
        PortfolioDetailRes res = portfolioService.updateVisibilityStatus(userId, id, req);
        return ok(res, "mua.portfolio_update_success");
    }

    @DeleteMapping("/my-profile/portfolios/{id}")
    @PreAuthorize("hasRole('FREELANCE_MUA') and hasAuthority('portfolio:delete')")
    public ResponseEntity<ApiResponse<Void>> deletePortfolio(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id) {
        portfolioService.softDeletePortfolio(userId, id);
        return ok(null, "mua.portfolio_delete_success");
    }

    @GetMapping("/{muaId}/portfolios")
    public ResponseEntity<ApiResponse<PageResponse<PortfolioSummaryRes>>> getPublicGallery(
            @PathVariable Long muaId,
            @RequestParam(value = "style_id", required = false) Integer styleId,
            @RequestParam(value = "is_featured", required = false) Boolean isFeatured,
            @RequestParam(value = "page", defaultValue = "0") @Min(value = 0, message = "{validation.page_min}") int page,
            @RequestParam(value = "size", defaultValue = "12")
            @Min(value = 1, message = "{validation.page_size_min}")
            @Max(value = 50, message = "{validation.page_size_max}") int size) {

        PageResponse<PortfolioSummaryRes> res = portfolioService.getPublicGallery(
                muaId, styleId, isFeatured, PageRequest.of(page, size)
        );
        return ok(res, "mua.portfolios_list_success");
    }


    @GetMapping("/my-profile/portfolios")
    @PreAuthorize("hasRole('FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<PageResponse<PortfolioDetailRes>>> getMyPortfolios(
            @AuthenticationPrincipal Long userId,
            @RequestParam(value = "page", defaultValue = "0") @Min(value = 0, message = "{validation.page_min}") int page,
            @RequestParam(value = "size", defaultValue = "12")
            @Min(value = 1, message = "{validation.page_size_min}")
            @Max(value = 50, message = "{validation.page_size_max}") int size) {

        PageResponse<PortfolioDetailRes> res = portfolioService.getMyPortfolios(userId, PageRequest.of(page, size));
        return ok(res, "mua.portfolios_list_success");
    }

    @GetMapping("/my-profile/portfolios/{id}")
    @PreAuthorize("hasRole('FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<PortfolioDetailRes>> getPortfolioDetail(
            @PathVariable Long id) {
        PortfolioDetailRes res = portfolioService.getPortfolioDetail(id);
        return ok(res, "mua.portfolio_get_success");
    }
}
