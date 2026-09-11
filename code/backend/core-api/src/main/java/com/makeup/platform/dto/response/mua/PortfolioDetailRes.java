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
public class PortfolioDetailRes {

    private Long id;
    private Long muaId;
    private String title;
    private String description;
    private String imageUrl;
    private String thumbnailUrl;
    private List<String> additionalImages;
    private Integer styleId;
    private String styleName;
    private Long packageId;
    private String packageName;
    private Boolean isFeatured;
    private Boolean isVisible;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
