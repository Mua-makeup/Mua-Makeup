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
public class BookingStatusDetailRes {

    private Long bookingId;
    private String bookingCode;
    private String status;
    private String destinationAddress;
    private BigDecimal destinationLatitude;
    private BigDecimal destinationLongitude;
    private Long muaId;
    private String muaName;
    private String muaPhone;
    private String muaAvatar;
    private BigDecimal rating;
    private BigDecimal totalAmount;
    private String completionPhotoUrl;
    private LocalDateTime updatedAt;
}
