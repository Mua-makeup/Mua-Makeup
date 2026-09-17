package com.makeup.platform.dto.request.catalog;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
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
public class MakeupStyleReq {

    @NotBlank(message = "{style.code_required}")
    @Size(max = 50, message = "{style.code_max}")
    private String styleCode;

    @NotBlank(message = "{style.name_required}")
    @Size(max = 100, message = "{style.name_max}")
    private String styleName;

    private String description;

    @Builder.Default
    private Boolean isActive = true;
}
