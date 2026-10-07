package com.makeup.platform.dto.response.booking;

import com.makeup.platform.dto.response.catalog.PackageItemRes;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidatePackageRes {

    private Long id;
    private String packageName;
    private String description;
    private BigDecimal price;
    private Integer estimatedDurationMinutes;
    private String coverImageUrl;
    private List<String> items;
    private List<PackageItemRes> availableAddons;
}
