package com.makeup.platform.service.admin;

import com.makeup.platform.common.base.PageResponse;
import com.makeup.platform.dto.response.admin.AdminRevenueOverviewRes;
import com.makeup.platform.dto.response.admin.AdminRevenueSettlementItemRes;
import org.springframework.data.domain.Pageable;

public interface AdminRevenueService {

    AdminRevenueOverviewRes getRevenueOverview();

    PageResponse<AdminRevenueSettlementItemRes> getRevenueSettlements(
            String partner,
            String status,
            String keyword,
            Pageable pageable
    );
}

