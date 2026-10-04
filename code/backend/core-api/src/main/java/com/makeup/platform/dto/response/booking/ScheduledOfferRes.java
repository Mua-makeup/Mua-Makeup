package com.makeup.platform.dto.response.booking;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduledOfferRes {
    private Long bookingId;
    private String bookingCode;
    private String customerName;
    private String customerPhone;
    private String customerAvatar;
    private String packageName;
    private String styleName;
    private LocalDate bookingDate;
    private LocalTime startTime;
    private String destinationAddress;
    private BigDecimal destinationLatitude;
    private BigDecimal destinationLongitude;
    private BigDecimal totalAmount;
    private BigDecimal depositAmount;
    private BigDecimal earningsAmount;
    private OffsetDateTime confirmDeadline;
    private Long confirmTimeoutSeconds;
    private Long createdAt;
}
