package com.makeup.platform.dto.response.agency;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffMatrixItemRes {

    private Long staffId;
    private String staffName;
    private String staffPhone;
    private String staffAvatarUrl;

    // 4-way qualification flags
    private boolean hasShift;
    private boolean hasPackage;
    private boolean hasStyle;
    private boolean hasCalendarFree;

    @JsonProperty("hasReportedBusy")
    private boolean hasReportedBusy;

    // Combined eligibility
    @JsonProperty("isFullyQualified")
    private boolean isFullyQualified;
    private String disqualificationReason;

    // Current assignment if already assigned
    private String currentRole; // PRIMARY_MUA, ASSISTANT_MUA, or null
    private Double distanceMeters;
}
