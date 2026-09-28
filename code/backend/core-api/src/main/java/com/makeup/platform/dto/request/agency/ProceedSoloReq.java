package com.makeup.platform.dto.request.agency;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProceedSoloReq {

    @Size(max = 500, message = "{dispatch.reassign_reason.max_len}")
    private String resolutionNote;
}
