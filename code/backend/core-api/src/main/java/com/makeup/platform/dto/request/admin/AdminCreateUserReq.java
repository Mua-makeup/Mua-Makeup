package com.makeup.platform.dto.request.admin;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminCreateUserReq {

    @NotBlank(message = "{validation.full_name_required}")
    @Size(min = 2, max = 100, message = "{validation.full_name_size}")
    private String fullName;

    @NotBlank(message = "{validation.phone_required}")
    @Pattern(regexp = "^(0|\\+84)(\\d{9})$", message = "{validation.phone_pattern}")
    private String phoneNumber;

    @Email(message = "{validation.email_invalid}")
    private String email;

    private String gender; // MALE, FEMALE, OTHER

    @NotBlank(message = "{validation.password_required}")
    @Size(min = 8, max = 50, message = "{validation.password_size}")
    @Pattern(regexp = "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!._-]).*$",
            message = "{validation.password_pattern}")
    private String password;

    @NotBlank(message = "{validation.role_required}")
    private String role; // ROLE_CUSTOMER, ROLE_FREELANCE_MUA

    private Integer experienceYears;
    private BigDecimal maxServiceRadiusKm;
    private String bio;
}
