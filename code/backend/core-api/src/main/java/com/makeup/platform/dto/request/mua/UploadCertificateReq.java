package com.makeup.platform.dto.request.mua;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.web.multipart.MultipartFile;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UploadCertificateReq {

    @NotBlank(message = "Tên chứng chỉ / bằng cấp không được để trống")
    private String certName;

    private MultipartFile file;
}
