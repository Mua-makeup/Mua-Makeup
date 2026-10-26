package com.makeup.platform.dto.request.agency;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateStaffCommissionSplitReq {

    @NotEmpty(message = "{validation.splits_not_empty}")
    @Valid
    private List<StaffCommissionSplitItem> splits;
}
