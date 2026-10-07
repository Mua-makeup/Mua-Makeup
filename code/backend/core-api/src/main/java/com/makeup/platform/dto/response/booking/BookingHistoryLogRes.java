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
public class BookingHistoryLogRes {

    private Long id;
    private String fromStatus;
    private String toStatus;
    private String actionTitle;
    private Long changedByUserId;
    private String changedBy;
    private String artistName;
    private String artistPhone;
    private String originAddress;
    private String destinationAddress;
    private String note;
    private String formattedTime;
    private LocalDateTime createdAt;
}
