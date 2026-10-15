package com.makeup.platform.dto.request.agency;

import com.makeup.platform.entity.agency.LeaveRequestStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ReviewLeaveRequestReq {

    @NotNull(message = "validation.status_required")
    private LeaveRequestStatus status;

    @Size(max = 255, message = "validation.rejection_reason_max_255")
    private String rejectionReason;
}
