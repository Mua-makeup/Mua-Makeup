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
public class UpdatePortfolioReq {

    @NotBlank(message = "{validation.title_required}")
    @Size(min = 2, max = 150, message = "{validation.title_size}")
    private String title;

    private String description;

    private Integer styleId;

    private Long packageId;

    private MultipartFile imageFile;

    private List<MultipartFile> additionalFiles;

    private List<String> existingAdditionalImages;

    // Aliases cho FormData snake_case
    public void setImage_file(MultipartFile file) {
        this.imageFile = file;
    }

    public void setFile(MultipartFile file) {
        if (this.imageFile == null) {
            this.imageFile = file;
        }
    }

    public void setAdditional_files(List<MultipartFile> files) {
        this.additionalFiles = files;
    }

    public void setFiles(List<MultipartFile> files) {
        if (this.additionalFiles == null || this.additionalFiles.isEmpty()) {
            this.additionalFiles = files;
        }
    }

    public void setExisting_additional_images(List<String> images) {
        this.existingAdditionalImages = images;
    }

    public void setPackage_id(Long packageId) {
        this.packageId = packageId;
    }

    public void setStyle_id(Integer styleId) {
        this.styleId = styleId;
    }
}
