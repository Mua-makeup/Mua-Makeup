package com.makeup.platform.dto.request.customer;

import jakarta.validation.constraints.DecimalMax;
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
public class SaveCustomerAddressReq {

    @NotBlank(message = "{validation.address_label_required}")
    @Size(max = 50, message = "{validation.address_label_max}")
    private String label;

    @NotBlank(message = "{validation.address_line_required}")
    @Size(max = 500, message = "{validation.address_line_max}")
    private String addressLine;

    @NotNull(message = "{validation.latitude_required}")
    @DecimalMin(value = "-90.0", message = "{validation.latitude_min}")
    @DecimalMax(value = "90.0", message = "{validation.latitude_max}")
    private BigDecimal latitude;

    @NotNull(message = "{validation.longitude_required}")
    @DecimalMin(value = "-180.0", message = "{validation.longitude_min}")
    @DecimalMax(value = "180.0", message = "{validation.longitude_max}")
    private BigDecimal longitude;

    @Size(max = 100, message = "{validation.recipient_name_max}")
    private String recipientName;

    @Size(max = 20, message = "{validation.recipient_phone_max}")
    private String recipientPhone;

    @Builder.Default
    private Boolean isDefault = false;
}
