package com.makeup.platform.dto.request.catalog;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.makeup.platform.entity.catalog.SurchargeType;
import jakarta.validation.constraints.DecimalMin;
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
public class ConfigureSurchargeReq {

    @NotBlank(message = "{validation.catalog_surcharge_name_required}")
    @Size(max = 100, message = "{validation.catalog_surcharge_name_size}")
    @Builder.Default
    private String surchargeName = "Phụ phí dịch vụ";

    @NotNull(message = "{validation.catalog_surcharge_type_required}")
    private SurchargeType surchargeType;

    @JsonSetter("surchargeType")
    public void setSurchargeType(Object val) {
        if (val == null) {
            this.surchargeType = null;
            return;
        }
        if (val instanceof SurchargeType st) {
            this.surchargeType = st;
        } else {
            String str = val.toString().trim().toUpperCase();
            this.surchargeType = switch (str) {
                case "DISTANCE", "OUT_OF_RADIUS" -> SurchargeType.OUT_OF_RADIUS;
                case "NIGHT", "EARLY_MORNING" -> SurchargeType.EARLY_MORNING;
                case "HOLIDAY" -> SurchargeType.HOLIDAY;
                case "CUSTOM" -> SurchargeType.CUSTOM;
                default -> {
                    try {
                        yield SurchargeType.valueOf(str);
                    } catch (IllegalArgumentException e) {
                        yield null;
                    }
                }
            };
        }
        if (this.surchargeName == null || this.surchargeName.equals("Phụ phí dịch vụ")) {
            if (this.surchargeType == SurchargeType.OUT_OF_RADIUS) this.surchargeName = "Phụ phí khoảng cách di chuyển";
            else if (this.surchargeType == SurchargeType.EARLY_MORNING) this.surchargeName = "Phụ phí làm việc sáng sớm / đêm";
            else if (this.surchargeType == SurchargeType.HOLIDAY) this.surchargeName = "Phụ phí ngày Lễ Tết";
        }
    }

    @NotNull(message = "{validation.catalog_surcharge_amount_required}")
    @DecimalMin(value = "0.00", message = "{validation.catalog_surcharge_amount_min}")
    @JsonAlias({"extraPricePerKm", "percentage", "amount"})
    @Builder.Default
    private BigDecimal amount = BigDecimal.ZERO;

    @Builder.Default
    private Boolean isActive = true;
}
