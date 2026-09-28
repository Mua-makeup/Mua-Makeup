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
public class DispatchAssignmentRes {

    private Long bookingId;
    private String bookingCode;
    private String bookingStatus;
    private Long agencyId;
    private LocalDateTime assignedAt;

    @Builder.Default
    private List<StaffAssignmentDetailRes> assignedStaff = List.of();
}
