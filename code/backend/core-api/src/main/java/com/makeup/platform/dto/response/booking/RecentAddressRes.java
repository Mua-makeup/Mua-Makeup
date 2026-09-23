package com.makeup.platform.dto.response.booking;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecentAddressRes {

    private String address;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private LocalDateTime lastUsedAt;
    private Long orderCount;
}
