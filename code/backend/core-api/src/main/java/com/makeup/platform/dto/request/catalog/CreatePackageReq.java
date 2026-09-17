package com.makeup.platform.dto.request.catalog;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreatePackageReq {

    @NotNull(message = "{validation.catalog_category_required}")
    @JsonAlias({"categoryId", "masterCategoryId"})
    private Integer masterCategoryId;

    @NotBlank(message = "{validation.catalog_package_name_required}")
    @Size(max = 150, message = "{validation.catalog_package_name_size}")
    private String packageName;

    private String description;

    @NotNull(message = "{validation.catalog_package_price_required}")
    @DecimalMin(value = "50000.00", message = "{validation.catalog_package_price_min}")
    private BigDecimal price;

    @NotNull(message = "{validation.catalog_package_duration_required}")
    @Min(value = 30, message = "{validation.catalog_package_duration_min}")
    @JsonAlias({"durationMinutes", "estimatedDurationMinutes"})
    private Integer estimatedDurationMinutes;

    private List<Integer> styleIds;

    @Valid
    private List<CreatePackageItemReq> items;
}
