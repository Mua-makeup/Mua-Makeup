package com.makeup.platform.dto.response.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminRevenueSettlementItemRes {

    private Long bookingId;

    private String bookingCode;

    private String bookingType;

    private String bookingPartner;

    private String providerName;

    private Long agencyId;

    private String agencyName;

    private Long muaId;

    private String muaName;

    private String customerName;

    private String customerPhone;

    private String packageName;

    private BigDecimal totalAmount;

    private BigDecimal platformFeeRate;

    private BigDecimal platformFeeAmount;

    private BigDecimal netPartnerEarnings;

    private String status;

    private String payoutStatus;

    private LocalDate bookingDate;

    private LocalDateTime createdAt;

    private OffsetDateTime settledAt;
}

