package com.makeup.platform.dto.response.booking;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;

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
    private String customerName;
    private String customerPhone;
    private String customerAvatar;
    private String packageName;
    private String styleName;
    private String bookingType;
    private LocalDate bookingDate;
    private LocalTime startTime;
    private Integer estimatedDurationMinutes;
    private List<String> packageItems;
    private BigDecimal rating;
    private BigDecimal totalAmount;
    private BigDecimal depositAmount;
    private BigDecimal serviceSubtotal;
    private BigDecimal surchargeFee;
    private BigDecimal distanceFee;
    private BigDecimal platformFee;
    private BigDecimal earningsAmount;
    private String completionPhotoUrl;
    private String cancellationReason;
    private Boolean isDepositPaid;
    private Integer depositTimeoutSeconds;
    private OffsetDateTime confirmDeadline;
    private Integer confirmTimeoutSeconds;
    private Integer inProgressElapsedSeconds;
    private LocalDateTime updatedAt;
}
