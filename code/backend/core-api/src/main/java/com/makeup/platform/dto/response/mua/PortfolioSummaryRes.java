package com.makeup.platform.dto.response.mua;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PortfolioSummaryRes {

    private Long id;
    private String title;
    private String thumbnailUrl;
    private String imageUrl;
    private String styleName;
    private Boolean isFeatured;
    private LocalDateTime createdAt;
}
