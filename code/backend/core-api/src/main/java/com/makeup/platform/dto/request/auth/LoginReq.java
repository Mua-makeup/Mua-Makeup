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

    @NotBlank(message = "Số điện thoại hoặc Email không được để trống")
    private String loginIdentifier;

    @NotBlank(message = "Mật khẩu không được để trống")
    private String password;
}
