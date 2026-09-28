package com.makeup.platform.dto.response.agency;

import com.makeup.platform.entity.booking.AssignmentRole;
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
public class EmergencyReassignmentRes {

    private Long bookingId;
    private String bookingCode;
    private Long oldStaffId;
    private String oldStaffName;
    private Long newStaffId;
    private String newStaffName;
    private AssignmentRole role;
    private String emergencyReason;
    private String emergencyTier;
    private LocalDateTime reassignedAt;
}
