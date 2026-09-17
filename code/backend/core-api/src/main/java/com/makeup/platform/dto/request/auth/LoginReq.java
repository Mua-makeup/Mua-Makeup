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
public class LoginReq {

    @NotBlank(message = "{validation.phone_or_email_required}")
    private String loginIdentifier;

    @NotBlank(message = "{validation.password_required}")
    private String password;
}
