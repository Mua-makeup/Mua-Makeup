package com.makeup.platform.dto.response.admin;

import java.math.BigDecimal;


public class PlatformFeeRes {

    private BigDecimal feeRate;
    private BigDecimal feePercent;

    public PlatformFeeRes(BigDecimal feeRate) {
        this.feeRate = feeRate;
        this.feePercent = feeRate.multiply(BigDecimal.valueOf(100))
                .setScale(2, java.math.RoundingMode.HALF_UP);
    }

    public BigDecimal getFeeRate() {
        return feeRate;
    }

    public BigDecimal getFeePercent() {
        return feePercent;
    }
}

