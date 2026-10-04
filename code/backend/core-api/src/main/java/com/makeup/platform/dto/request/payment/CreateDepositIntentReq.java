package com.makeup.platform.dto.request.payment;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateDepositIntentReq {

    @NotBlank(message = "{validation.payment_gateway_required}")
    private String gatewayCode;

    private String pricingVersion;
}
