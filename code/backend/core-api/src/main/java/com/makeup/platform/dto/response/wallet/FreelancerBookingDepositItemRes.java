package com.makeup.platform.dto.response.wallet;

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
public class FreelancerBookingDepositItemRes {

    private Long depositId;
    private Long bookingId;
    private String bookingCode;
    private String bookingType;
    private BigDecimal depositAmount;
    private String depositStatus;
    private OffsetDateTime paidAt;
    private OffsetDateTime expiresAt;
}
