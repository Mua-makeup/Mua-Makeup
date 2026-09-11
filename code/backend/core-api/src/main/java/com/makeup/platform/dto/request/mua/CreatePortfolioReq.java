package com.makeup.platform.dto.request.mua;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreatePortfolioReq {

    @NotBlank(message = "Tiêu đề tác phẩm không được để trống")
    @Size(min = 2, max = 150, message = "Tiêu đề tác phẩm phải từ 2 đến 150 ký tự")
    private String title;

    private String description;

    private Integer styleId;

    private Long packageId;

    @Builder.Default
    private Boolean isFeatured = false;

    private MultipartFile imageFile;

    private List<MultipartFile> additionalFiles;
}
