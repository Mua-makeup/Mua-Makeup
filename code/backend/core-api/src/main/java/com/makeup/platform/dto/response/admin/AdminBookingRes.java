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

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminBookingRes {

    private Long id;
    private String bookingCode;

    // Customer Info
    private Long customerId;
    private String customerName;
    private String customerPhone;
    private String customerEmail;

    // Assigned MUA Info
    private Long muaId;
    private String muaName;
    private String muaPhone;

    // Agency Info (if any)
    private Long agencyId;
    private String agencyName;

    // Booking Details
    private String bookingType;
    private String bookingPartner;
    private String status;
    private String destinationAddress;
    private BigDecimal destinationLatitude;
    private BigDecimal destinationLongitude;
    private LocalDate bookingDate;
    private LocalTime startTime;

    // Financials
    private BigDecimal serviceSubtotal;
    private BigDecimal distanceFee;
    private BigDecimal surchargeFee;
    private BigDecimal totalAmount;
    private BigDecimal depositAmount;

    // Meta & Completion
    private String completionPhotoUrl;
    private String cancellationReason;
    private LocalDateTime createdAt;
}
