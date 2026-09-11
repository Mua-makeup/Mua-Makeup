package com.makeup.platform.dto.request.admin;

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
public class VerifyCertificateReq {

    private Integer certIndex;

    private String imageUrl;

    @NotNull(message = "Trạng thái phê duyệt không được để trống")
    private Boolean isVerified;

    private String notes;
}
