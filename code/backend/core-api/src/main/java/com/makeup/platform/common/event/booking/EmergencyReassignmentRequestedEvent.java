package com.makeup.platform.common.event.booking;

import com.makeup.platform.entity.booking.AssignmentRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmergencyReassignmentRequestedEvent {

    private Long bookingId;
    private String bookingCode;
    private Long agencyId;
    private Long staffId;
    private String staffName;
    private AssignmentRole role;
    private String emergencyReason;
    private String emergencyTier;
    private Double hoursUntilBooking;
    private LocalDateTime scheduledStartTime;
    private String proofDocumentUrl;
}
