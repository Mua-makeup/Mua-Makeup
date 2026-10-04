package com.makeup.platform.dto.request.payment;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class CreatePaymentIntentReq {

    @NotNull(message = "{validation.payment_amount_required}")
    @DecimalMin(value = "1000.00", message = "{validation.payment_amount_min}")
    private BigDecimal amount;

    @NotBlank(message = "{validation.payment_gateway_required}")
    private String gatewayCode;
}
