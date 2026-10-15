package com.makeup.platform.dto.response.agency;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.makeup.platform.entity.agency.LeaveRequestStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffLeaveRequestRes {

    private Long id;
    private Long agencyId;
    private String agencyName;
    private Long staffId;
    private String staffName;
    private String staffPhone;
    private LocalDate leaveDate;

    @JsonFormat(pattern = "HH:mm:ss")
    private LocalTime startTime;

    @JsonFormat(pattern = "HH:mm:ss")
    private LocalTime endTime;

    private String shiftName;
    private String reason;
    private LeaveRequestStatus status;
    private String rejectionReason;
    private String reviewedByUserName;
    private OffsetDateTime reviewedAt;
    private LocalDateTime createdAt;
}
