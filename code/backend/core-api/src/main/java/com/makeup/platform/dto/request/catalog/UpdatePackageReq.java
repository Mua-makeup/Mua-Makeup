package com.makeup.platform.dto.request.catalog;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdatePackageReq {

    @NotNull(message = "Danh mục dịch vụ gốc không được để trống")
    private Integer masterCategoryId;

    @NotBlank(message = "Tên gói dịch vụ không được để trống")
    @Size(max = 150, message = "Tên gói dịch vụ không vượt quá 150 ký tự")
    private String packageName;

    private String description;

    @NotNull(message = "Giá gói dịch vụ không được để trống")
    @DecimalMin(value = "50000.00", message = "Giá tối thiểu của gói dịch vụ là 50,000 VNĐ")
    private BigDecimal price;

    @NotNull(message = "Thời gian thực hiện dự kiến không được để trống")
    @Min(value = 30, message = "Thời gian thực hiện tối thiểu 30 phút")
    private Integer estimatedDurationMinutes;

    private Boolean isAvailable;

    private List<Integer> styleIds;
}
