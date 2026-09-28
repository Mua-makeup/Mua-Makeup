package com.makeup.platform.dto.response.agency;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmergencyApprovalRes {

    private Long bookingId;
    private Long staffId;
    private boolean approved;
    private String adminReviewNote;
    private LocalDateTime reviewedAt;
}
