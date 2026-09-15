package com.makeup.platform.dto.response.agency;

import com.makeup.platform.entity.agency.StaffProficiencyLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignedPackageRes {

    private Long packageId;
    private String packageName;
    private String categoryName;
    private BigDecimal price;
    private StaffProficiencyLevel proficiencyLevel;
    private Boolean isQualified;
}
