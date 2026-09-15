package com.makeup.platform.dto.request.agency;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AcceptInvitationReq {

    @NotBlank(message = "{validation.invite_code_required}")
    private String inviteCode;
}
