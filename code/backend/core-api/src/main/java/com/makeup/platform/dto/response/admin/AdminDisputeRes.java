package com.makeup.platform.dto.response.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminDisputeRes {

    private Long id;
    private Long bookingId;
    private String bookingCode;
    private String status;
    private String bookingType;
    private LocalDate bookingDate;
    private LocalTime startTime;
    private String destinationAddress;

    // Customer
    private Long customerId;
    private String customerName;
    private String customerPhone;
    private String customerAvatar;

    // MUA
    private Long muaId;
    private String muaName;
    private String muaPhone;
    private String muaAvatar;
    private String agencyName;

    // Dispute details
    private String emergencyReason;
    private String emergencyProofUrl;
    private OffsetDateTime emergencyReportedAt;
    private String cancellationReason;

    // Financials
    private BigDecimal serviceSubtotal;
    private BigDecimal surchargeFee;
    private BigDecimal distanceFee;
    private BigDecimal totalAmount;
    private BigDecimal depositAmount;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
