package com.makeup.platform.dto.response.booking;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingStateTransitionRes {

    private Long bookingId;
    private String bookingCode;
    private String previousStatus;
    private String currentStatus;
    private Long updatedByUserId;
    private LocalDateTime transitionedAt;
}
