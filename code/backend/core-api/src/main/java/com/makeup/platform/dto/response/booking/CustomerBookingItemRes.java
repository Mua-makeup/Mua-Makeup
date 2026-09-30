package com.makeup.platform.dto.response.booking;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerBookingItemRes {
    private Long id;
    private String bookingCode;
    private Long muaId;
    private String muaName;
    private String muaAvatarUrl;
    private String muaPhoneNumber;
    private String packageName;
    private String packageCoverUrl;
    private LocalDateTime bookingTime;
    private String destinationAddress;
    private BigDecimal destinationLatitude;
    private BigDecimal destinationLongitude;
    private String status;
    private BigDecimal totalAmount;
    private BigDecimal depositAmount;
    private BigDecimal remainingAmount;
    private String note;
    private LocalDateTime createdAt;
}
