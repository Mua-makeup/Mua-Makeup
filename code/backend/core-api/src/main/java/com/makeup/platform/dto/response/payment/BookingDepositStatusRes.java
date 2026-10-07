package com.makeup.platform.dto.response.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingDepositStatusRes {

    private Long depositId;
    private Long bookingId;
    private String bookingCode;
    private BigDecimal totalAmount;
    private BigDecimal requiredDepositAmount;
    private BigDecimal paidAmount;
    private String depositStatus;
    private String pricingVersion;
    private OffsetDateTime expiresAt;
    private OffsetDateTime paidAt;

    /** Checkout payment hiện hành (nếu đang PENDING) */
    private String currentPaymentCode;
    private String currentPaymentUrl;
    private String currentQrCodeUrl;
    private OffsetDateTime currentPaymentExpiresAt;
    private String currentGatewayCode;
    private String currentApplicationStatus;

    /** Trạng thái đơn & kiểm tra trùng slot */
    private String bookingStatus;
    private Boolean isSlotTaken;
    private Boolean isRefunded;
    private BigDecimal refundAmount;
    private String cancellationReason;
    private String message;
}
