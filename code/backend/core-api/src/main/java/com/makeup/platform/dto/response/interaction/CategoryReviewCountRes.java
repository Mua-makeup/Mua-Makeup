package com.makeup.platform.dto.response.interaction;

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
public class CategoryReviewCountRes {
    private Integer categoryId;
    private String categoryName;
    private Long count;
}
