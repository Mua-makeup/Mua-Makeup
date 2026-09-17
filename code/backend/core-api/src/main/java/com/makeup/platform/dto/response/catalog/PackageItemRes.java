package com.makeup.platform.dto.response.catalog;

import com.makeup.platform.entity.catalog.PackageItemType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PackageItemRes {

    private Long id;
    private PackageItemType itemType;
    private String itemName;
    private Integer stepOrder;
    private BigDecimal itemPrice;
    private Integer durationMinutes;
    private Boolean isRequired;
    private Boolean isActive;
}
