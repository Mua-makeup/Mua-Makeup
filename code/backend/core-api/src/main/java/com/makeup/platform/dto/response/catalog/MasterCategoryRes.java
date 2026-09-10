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
public class MasterCategoryRes {

    private Integer id;
    private String categoryCode;
    private String categoryName;
    private String description;
    private String iconUrl;
    private Boolean isActive;
}
