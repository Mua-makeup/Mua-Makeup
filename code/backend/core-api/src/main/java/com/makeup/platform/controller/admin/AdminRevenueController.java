package com.makeup.platform.controller.admin;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.common.base.PageResponse;
import com.makeup.platform.dto.response.admin.AdminRevenueOverviewRes;
import com.makeup.platform.dto.response.admin.AdminRevenueSettlementItemRes;
import com.makeup.platform.service.admin.AdminRevenueService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/revenue")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminRevenueController extends BaseController {

    private final AdminRevenueService adminRevenueService;

    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<AdminRevenueOverviewRes>> getRevenueOverview() {
        AdminRevenueOverviewRes overview = adminRevenueService.getRevenueOverview();
        return ok(overview, "admin.revenue_overview_success");
    }

    @GetMapping("/settlements")
    public ResponseEntity<ApiResponse<PageResponse<AdminRevenueSettlementItemRes>>> getRevenueSettlements(
            @RequestParam(required = false) String partner,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        PageResponse<AdminRevenueSettlementItemRes> settlements = adminRevenueService.getRevenueSettlements(
                partner,
                status,
                keyword,
                pageable
        );
        return ok(settlements, "admin.revenue_settlements_success");
    }
}

