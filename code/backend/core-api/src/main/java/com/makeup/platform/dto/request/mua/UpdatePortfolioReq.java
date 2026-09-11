package com.makeup.platform.dto.request.mua;

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
public class UpdatePortfolioReq {

    @NotBlank(message = "{validation.title_required}")
    @Size(min = 2, max = 150, message = "{validation.title_size}")
    private String title;

    private String description;

    private Integer styleId;

    private Long packageId;
}
