package com.makeup.platform.dto.request.admin;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
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
public class AdminCreateAgencyReq {

    // === Agency Facility Information ===
    @NotBlank(message = "{validation.studio_name_required}")
    private String agencyName;

    @NotBlank(message = "{validation.studio_hotline_required}")
    private String hotline;

    @NotBlank(message = "{validation.street_address_required}")
    private String addressStreet;

    @NotBlank(message = "{validation.district_required}")
    private String district;

    @NotBlank(message = "{validation.city_required}")
    private String city;

    @DecimalMin(value = "0.00", message = "{validation.commission_rate_min}")
    @DecimalMax(value = "100.00", message = "{validation.commission_rate_max}")
    @Builder.Default
    private BigDecimal commissionRateInternal = new BigDecimal("30.00");

    // === Owner Personal Information (Stored in auth_schema.users) ===
    @NotBlank(message = "{validation.full_name_required}")
    @Size(min = 2, max = 100, message = "{validation.full_name_size}")
    private String ownerFullName;

    @NotBlank(message = "{validation.phone_required}")
    @Pattern(regexp = "^(0|\\+84)(\\d{9})$", message = "{validation.phone_pattern}")
    private String ownerPhone;

    @NotBlank(message = "{validation.email_required}")
    @Email(message = "{validation.email_invalid}")
    private String ownerEmail;

    private String ownerGender; // MALE, FEMALE, OTHER

    @NotBlank(message = "{validation.password_required}")
    @Size(min = 8, max = 50, message = "{validation.password_size}")
    @Pattern(regexp = "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!._-]).*$",
            message = "{validation.password_pattern}")
    private String ownerPassword;
}
