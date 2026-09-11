package com.makeup.platform.dto.request.catalog;

import com.makeup.platform.entity.catalog.PackageItemType;
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

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreatePackageItemReq {

    @NotNull(message = "Loại mục quy trình/add-on không được để trống")
    private PackageItemType itemType;

    @NotBlank(message = "Tên bước/dịch vụ mua thêm không được để trống")
    @Size(max = 150, message = "Tên không được vượt quá 150 ký tự")
    private String itemName;

    @NotNull(message = "Thứ tự bước không được để trống")
    @Min(value = 1, message = "Thứ tự bước phải lớn hơn hoặc bằng 1")
    private Integer stepOrder;

    @NotNull(message = "Giá không được để trống")
    @DecimalMin(value = "0.00", message = "Giá không được nhỏ hơn 0 VNĐ")
    private BigDecimal itemPrice;

    @Builder.Default
    private Boolean isRequired = true;

    @Builder.Default
    private Boolean isActive = true;
}
