package com.makeup.platform.dto.request.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateLanguageReq {

    @NotBlank(message = "Ngôn ngữ không được để trống")
    @Pattern(regexp = "^(en|vi)$", message = "Ngôn ngữ chỉ được phép là 'en' hoặc 'vi'")
    private String language;
}
