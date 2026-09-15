package com.makeup.platform.dto.request.catalog;

import com.makeup.platform.entity.catalog.PackageItemType;
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

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreatePackageItemReq {

    @NotNull(message = "{validation.catalog_item_type_required}")
    private PackageItemType itemType;

    @NotBlank(message = "{validation.catalog_item_name_required}")
    @Size(max = 150, message = "{validation.catalog_item_name_size}")
    private String itemName;

    @NotNull(message = "{validation.catalog_item_step_order_required}")
    @Min(value = 1, message = "{validation.catalog_item_step_order_min}")
    private Integer stepOrder;

    @NotNull(message = "{validation.catalog_item_price_required}")
    @DecimalMin(value = "0.00", message = "{validation.catalog_item_price_min}")
    private BigDecimal itemPrice;

    @Builder.Default
    private Boolean isRequired = true;

    @Builder.Default
    private Boolean isActive = true;
}
