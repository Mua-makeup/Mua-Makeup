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
public class MasterCategoryReq {

    @NotBlank(message = "{category.code_required}")
    @Size(max = 50, message = "{category.code_max}")
    private String categoryCode;

    @NotBlank(message = "{category.name_required}")
    @Size(max = 100, message = "{category.name_max}")
    private String categoryName;

    private String description;
    private String iconUrl;

    @Builder.Default
    private Boolean isActive = true;
}
