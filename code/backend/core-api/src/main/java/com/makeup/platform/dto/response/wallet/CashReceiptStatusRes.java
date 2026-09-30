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
public class CashReceiptStatusRes {

    private Long bookingId;
    private String bookingCode;
    private String invoiceVersion;
    private BigDecimal expectedAmount;
    private String status;
    private OffsetDateTime customerConfirmedAt;
    private OffsetDateTime freelancerConfirmedAt;
    private boolean customerConfirmed;
    private boolean freelancerConfirmed;
    private String disputeReason;
}
