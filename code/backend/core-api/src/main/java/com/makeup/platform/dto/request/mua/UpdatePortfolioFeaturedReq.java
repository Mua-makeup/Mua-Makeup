package com.makeup.platform.dto.request.mua;

import jakarta.validation.constraints.NotNull;
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
public class UpdatePortfolioFeaturedReq {

    @NotNull(message = "Trạng thái tiêu biểu không được để trống")
    private Boolean isFeatured;
}
