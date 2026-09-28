package com.makeup.platform.dto.response.agency;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffAvailabilityMatrixRes {

    private Long bookingId;
    private String bookingCode;
    private Long packageId;
    private String packageName;
    private Long styleId;
    private String styleName;
    private LocalDateTime scheduledStartTime;
    private LocalDateTime scheduledEndTime;
    private String destinationAddress;

    private boolean needsEmergencyReassignment;
    private String emergencyReason;
    private String emergencyProofUrl;

    private int totalStaffCount;
    private int qualifiedCount;

    @Builder.Default
    private List<StaffMatrixItemRes> staffList = List.of();
}
