package com.makeup.platform.dto.response.booking;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FreelancerBookingItemRes {
    private Long id;
    private String bookingCode;
    private String status;
    private String bookingType;
    private String customerName;
    private String customerPhone;
    private String packageName;
    private String packageCoverUrl;
    private String destinationAddress;
    private BigDecimal destinationLatitude;
    private BigDecimal destinationLongitude;
    private LocalDate bookingDate;
    private LocalTime startTime;
    private BigDecimal totalAmount;
    private BigDecimal depositAmount;
    private BigDecimal earningsAmount;
    private String note;
    private String completionPhotoUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
