package com.makeup.platform.dto.response.catalog;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PackageDetailRes {

    private Long id;
    private Integer masterCategoryId;
    private String categoryName;
    private Long agencyId;
    private String agencyName;
    private Long muaId;
    private String muaName;
    private String packageName;
    private String description;
    private BigDecimal price;
    private Integer estimatedDurationMinutes;
    private Integer durationMinutes;
    private Boolean isAvailable;
    private List<MakeupStyleRes> styles;
    private List<PackageItemRes> items;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
