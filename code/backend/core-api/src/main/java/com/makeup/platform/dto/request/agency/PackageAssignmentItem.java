package com.makeup.platform.dto.request.agency;

import com.makeup.platform.entity.agency.StaffProficiencyLevel;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PackageAssignmentItem {

    @NotNull(message = "{validation.package_id_required}")
    private Long packageId;

    @NotNull(message = "{validation.proficiency_level_required}")
    @Builder.Default
    private StaffProficiencyLevel proficiencyLevel = StaffProficiencyLevel.PRIMARY_MUA;

    @NotNull(message = "{validation.is_qualified_required}")
    @Builder.Default
    private Boolean isQualified = true;
}
