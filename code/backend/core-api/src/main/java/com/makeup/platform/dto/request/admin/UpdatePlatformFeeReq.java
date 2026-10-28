package com.makeup.platform.dto.request.admin;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;


public class UpdatePlatformFeeReq {

    @NotNull(message = "Phí sàn không được để trống.")
    @DecimalMin(value = "0.00", message = "Phí sàn phải >= 0%.")
    @DecimalMax(value = "1.00", message = "Phí sàn phải <= 100%.")
    private BigDecimal feeRate;

    public BigDecimal getFeeRate() {
        return feeRate;
    }

    public void setFeeRate(BigDecimal feeRate) {
        this.feeRate = feeRate;
    }
}

