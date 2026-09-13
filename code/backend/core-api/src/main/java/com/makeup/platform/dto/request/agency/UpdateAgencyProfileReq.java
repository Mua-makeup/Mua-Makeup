package com.makeup.platform.dto.request.agency;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateAgencyProfileReq {

    @NotBlank(message = "Tên Studio / Đại lý không được để trống")
    @Size(max = 150, message = "Tên Studio không được vượt quá 150 ký tự")
    private String agencyName;

    @NotBlank(message = "Số hotline không được để trống")
    @Size(max = 20, message = "Số hotline không được vượt quá 20 ký tự")
    private String hotline;

    @NotBlank(message = "Địa chỉ không được để trống")
    private String addressStreet;

    @NotBlank(message = "Quận/Huyện không được để trống")
    @Size(max = 50, message = "Quận/Huyện không được vượt quá 50 ký tự")
    private String district;

    @NotBlank(message = "Thành phố không được để trống")
    @Size(max = 50, message = "Thành phố không được vượt quá 50 ký tự")
    private String city;

    private String logoUrl;
}
