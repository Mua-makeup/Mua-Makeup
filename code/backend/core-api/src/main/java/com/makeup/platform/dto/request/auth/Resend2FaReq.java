package com.makeup.platform.dto.request.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Resend2FaReq {

    @NotBlank(message = "{auth.temp_token_required}")
    private String tempToken;
}
