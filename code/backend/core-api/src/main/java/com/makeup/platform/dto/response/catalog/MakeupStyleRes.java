package com.makeup.platform.dto.response.catalog;

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
public class MakeupStyleRes {

    private Integer id;
    private String styleCode;
    private String styleName;
    private String description;
    private Boolean isActive;
}
