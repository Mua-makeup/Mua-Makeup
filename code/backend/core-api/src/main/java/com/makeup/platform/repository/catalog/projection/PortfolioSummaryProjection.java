package com.makeup.platform.repository.catalog.projection;

import java.time.LocalDateTime;


public interface PortfolioSummaryProjection {

    Long getId();

    String getTitle();

    String getThumbnailUrl();

    String getImageUrl();

    String getStyleName();

    Long getPackageId();

    Boolean getIsFeatured();

    LocalDateTime getCreatedAt();
}
