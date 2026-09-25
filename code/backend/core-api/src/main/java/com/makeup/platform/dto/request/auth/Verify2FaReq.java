package com.makeup.platform.dto.request.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Verify2FaReq {

    @NotBlank(message = "{auth.temp_token_required}")
    private String tempToken;

    @NotBlank(message = "{auth.otp_required}")
    @Pattern(regexp = "^[0-9]{6}$", message = "{auth.otp_format_invalid}")
    private String otpCode;
}
