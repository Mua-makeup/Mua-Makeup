package com.makeup.platform.dto.response.agency;

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
public class AgencyDisputeRes {

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

    // Staff
    private Long staffId;
    private String staffName;
    private String staffPhone;
    private String staffAvatar;
    private String assignmentRole;

    // Dispute details
    private String emergencyReason;
    private String emergencyProofUrl;
    private OffsetDateTime emergencyReportedAt;
    private String cancellationReason;
    private String disputeOrigin;
    private Boolean isEscalatedToAdmin;
    private Boolean isStudioRejected;

    // Financials
    private BigDecimal serviceSubtotal;
    private BigDecimal surchargeFee;
    private BigDecimal totalAmount;
    private BigDecimal depositAmount;

    // Service Completion Proof
    private String completionPhotoUrl;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
