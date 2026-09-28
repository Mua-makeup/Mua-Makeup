package com.makeup.platform.dto.request.agency;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignStaffToBookingReq {

    @NotNull(message = "{dispatch.primary_staff_id.required}")
    private Long primaryStaffId;

    @Size(max = 2, message = "{dispatch.assistants.max_two}")
    private List<Long> assistantStaffIds;

    @Size(max = 500, message = "{dispatch.notes.too_long}")
    private String dispatchNotes;
}
