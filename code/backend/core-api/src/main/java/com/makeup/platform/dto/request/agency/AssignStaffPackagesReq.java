package com.makeup.platform.dto.request.agency;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignStaffPackagesReq {

    @NotNull(message = "{validation.staff_id_required}")
    private Long staffId;

    @Valid
    private List<PackageAssignmentItem> packageAssignments;

    private List<Long> packageIds;
}
