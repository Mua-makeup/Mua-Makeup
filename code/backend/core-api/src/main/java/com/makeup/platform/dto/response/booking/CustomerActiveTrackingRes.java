package com.makeup.platform.dto.response.booking;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerActiveTrackingRes {

    private Long bookingId;
    private String bookingCode;
    private String currentStatus;
    private String bookingType;
    private String destinationAddress;
    private BigDecimal destinationLatitude;
    private BigDecimal destinationLongitude;
    private String bookingDate;
    private String startTime;
    private Long customerId;
    private String customerName;
    private String customerPhone;
    private String customerAvatar;
    private Long muaId;
    private String muaName;
    private String muaPhone;
    private String muaAvatar;
    private Double muaRating;
    private String agencyName;
    private String agencyAddress;
    private String packageName;
    private String styleName;
    private BigDecimal totalAmount;
    private BigDecimal depositAmount;
    private BigDecimal remainingAmount;
    private Boolean isDepositPaid;
    private List<BookingHistoryLogRes> historyLogs;
}
