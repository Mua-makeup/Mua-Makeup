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
public class BookingAcceptanceRes {

    private Long bookingId;
    private String bookingCode;
    private String status;
    private Long assignedMuaId;
    private String destinationAddress;
    private BigDecimal serviceTotalAmount;
    private BigDecimal escrowDepositLocked;
    private CustomerSummary customerInfo;
    private LocalDateTime acceptedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomerSummary {
        private String fullName;
        private String phoneNumber;
    }
}
