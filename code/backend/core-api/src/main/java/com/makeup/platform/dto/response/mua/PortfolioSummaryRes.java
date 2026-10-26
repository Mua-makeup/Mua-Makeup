package com.makeup.platform.dto.response.mua;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PortfolioSummaryRes {

    private Long id;
    private String title;
    private String description;
    private String thumbnailUrl;
    private String imageUrl;
    private List<String> additionalImages;
    private String styleName;
    private Long packageId;
    private String packageName;
    private Boolean isFeatured;
    private LocalDateTime createdAt;
}
