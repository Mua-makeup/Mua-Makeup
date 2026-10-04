package com.makeup.platform.dto.response.customer;

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
public class CustomerAddressRes {

    private Long id;

    private String label;

    private String addressLine;

    private BigDecimal latitude;

    private BigDecimal longitude;

    private String recipientName;

    private String recipientPhone;

    private Boolean isDefault;

    private LocalDateTime createdAt;
}
