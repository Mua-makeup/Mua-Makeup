package com.makeup.platform.dto.request.auth;

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
public class ChangePasswordReq {

    @NotBlank(message = "{validation.current_password_required}")
    private String currentPassword;

    @NotBlank(message = "{validation.new_password_required}")
    @Size(min = 8, max = 50, message = "{validation.password_size}")
    @Pattern(regexp = "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!._-]).*$",
            message = "{validation.password_pattern}")
    private String newPassword;

    @NotBlank(message = "{validation.confirm_password_required}")
    private String confirmPassword;
}
