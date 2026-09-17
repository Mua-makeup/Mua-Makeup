package com.makeup.platform.dto.request.booking;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransitionBookingStateReq {

    @NotBlank(message = "{validation.booking_target_status_required}")
    @Pattern(
        regexp = "^(ACCEPTED|PENDING_AGENCY_DISPATCH|AGENCY_ASSIGNED|ON_THE_WAY|ARRIVED|IN_PROGRESS|COMPLETED|CANCELLED|DISPUTED)$",
        message = "{validation.booking_target_status_invalid}"
    )
    private String targetStatus;

    @Size(max = 500, message = "{validation.booking_reason_max}")
    private String reason;

    private String completionPhotoUrl;
}
