package com.makeup.platform.dto.request.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileReq {

    @Size(min = 2, max = 100, message = "{validation.full_name_size}")
    private String fullName;

    @Email(message = "{validation.email_invalid}")
    @Size(max = 100, message = "{validation.email_size}")
    private String email;

    private String gender;
}
