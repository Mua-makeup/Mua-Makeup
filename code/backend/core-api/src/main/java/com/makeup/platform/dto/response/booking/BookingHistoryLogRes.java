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
    private Long changedByUserId;
    private String changedBy;
    private String note;
    private LocalDateTime createdAt;
}
