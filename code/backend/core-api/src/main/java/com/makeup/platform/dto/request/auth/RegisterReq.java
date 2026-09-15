package com.makeup.platform.dto.request.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class RegisterReq {

    @NotBlank(message = "{validation.phone_required}")
    @Pattern(regexp = "^(0|\\+84)(\\d{9})$", message = "{validation.phone_pattern}")
    private String phoneNumber;

    @Email(message = "{validation.email_invalid}")
    private String email;

    @NotBlank(message = "{validation.password_required}")
    @Size(min = 8, max = 50, message = "{validation.password_size}")
    @Pattern(regexp = "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!._-]).*$",
            message = "{validation.password_pattern}")
    private String password;

    @NotBlank(message = "{validation.full_name_required}")
    @Size(min = 2, max = 100, message = "{validation.full_name_size}")
    private String fullName;

    private String gender;

    @NotNull(message = "{validation.account_type_required}")
    private AccountType accountType;

    @Valid
    private MuaRegisterDetails muaDetails;

    @Valid
    private AgencyRegisterDetails agencyDetails;
}
