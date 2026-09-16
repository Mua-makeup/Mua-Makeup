package com.makeup.platform.dto.request.booking;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateInstantBookingReq {

    private Long packageId;

    @NotBlank(message = "Địa chỉ điểm đến không được để trống.")
    @Size(max = 500, message = "Địa chỉ điểm đến không được vượt quá 500 ký tự.")
    private String destinationAddress;

    @NotNull(message = "Vĩ độ điểm đến không được để trống.")
    @DecimalMin(value = "-90.0", message = "Vĩ độ tối thiểu là -90.0")
    @DecimalMax(value = "90.0", message = "Vĩ độ tối đa là 90.0")
    @JsonAlias({"customerLatitude", "destinationLatitude", "lat", "latitude"})
    private BigDecimal destinationLatitude;

    @NotNull(message = "Kinh độ điểm đến không được để trống.")
    @DecimalMin(value = "-180.0", message = "Kinh độ tối thiểu là -180.0")
    @DecimalMax(value = "180.0", message = "Kinh độ tối đa là 180.0")
    @JsonAlias({"customerLongitude", "destinationLongitude", "lng", "longitude"})
    private BigDecimal destinationLongitude;

    private String note;
}
