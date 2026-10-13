package com.makeup.platform.dto.response.agency;

import com.makeup.platform.entity.booking.AssignmentRole;
import com.makeup.platform.entity.booking.AssignmentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffAssignmentDetailRes {

    private Long id;
    private Long staffId;
    private Long muaId;
    private Long userId;
    private String staffName;
    private String staffPhone;
    private String staffAvatarUrl;
    private AssignmentRole role;
    private AssignmentStatus status;
    private LocalDateTime assignedAt;
    private LocalDateTime confirmedAt;
    private Boolean isConfirmedByStaff;
    private String cancellationReason;
    private String proofDocumentUrl;
    private BigDecimal commissionRate;
    private BigDecimal commissionAmount;
    private String commissionNote;
    private String payoutStatus;
    private LocalDateTime payoutAt;
}
