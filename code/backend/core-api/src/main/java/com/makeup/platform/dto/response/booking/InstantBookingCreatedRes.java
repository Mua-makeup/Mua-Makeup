package com.makeup.platform.dto.response.booking;

import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.booking.BookingType;
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
public class InstantBookingCreatedRes {

    private Long bookingId;
    private String bookingCode;
    private BookingStatus status;
    private BookingType bookingType;
    private String destinationAddress;
    private BigDecimal destinationLatitude;
    private BigDecimal destinationLongitude;
    private BigDecimal totalAmount;
    private BigDecimal depositAmount;
    private BigDecimal surchargeFee;
    private int potentialProvidersFound;
    private int searchTimeoutSeconds;
    private LocalDateTime createdAt;
}
