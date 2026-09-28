package com.makeup.platform.dto.response.payment;

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
public class PaymentGatewayInfoRes {

    private String code;
    private String name;
    private String description;
    private String logoUrl;
    private boolean isEnabled;
}
