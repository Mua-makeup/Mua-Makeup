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

    @NotBlank(message = "{validation.language_required}")
    @Pattern(regexp = "^(en|vi)$", message = "{validation.language_pattern}")
    private String language;
}
