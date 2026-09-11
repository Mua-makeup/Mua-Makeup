package com.makeup.platform.service.catalog;

import com.makeup.platform.common.base.PageResponse;
import com.makeup.platform.dto.request.mua.CreatePortfolioReq;
import com.makeup.platform.dto.request.mua.UpdatePortfolioFeaturedReq;
import com.makeup.platform.dto.request.mua.UpdatePortfolioReq;
import com.makeup.platform.dto.request.mua.UpdatePortfolioVisibilityReq;
import com.makeup.platform.dto.response.mua.PortfolioDetailRes;
import com.makeup.platform.dto.response.mua.PortfolioSummaryRes;
import org.springframework.data.domain.Pageable;

public interface PortfolioService {

    PortfolioDetailRes createPortfolioShowcase(Long userId, CreatePortfolioReq req);

    PortfolioDetailRes updatePortfolioShowcase(Long userId, Long portfolioId, UpdatePortfolioReq req);

    PortfolioDetailRes updateFeaturedStatus(Long userId, Long portfolioId, UpdatePortfolioFeaturedReq req);

    PortfolioDetailRes updateVisibilityStatus(Long userId, Long portfolioId, UpdatePortfolioVisibilityReq req);

    void softDeletePortfolio(Long userId, Long portfolioId);

    PageResponse<PortfolioSummaryRes> getPublicGallery(Long muaId, Integer styleId, Boolean isFeatured, Pageable pageable);

    PageResponse<PortfolioDetailRes> getMyPortfolios(Long userId, Pageable pageable);

    PortfolioDetailRes getPortfolioDetail(Long portfolioId);
}
