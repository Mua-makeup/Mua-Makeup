package com.makeup.platform.dto.request.wallet;

import jakarta.validation.constraints.NotBlank;
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
public class CashPaymentConfirmationReq {

    @NotBlank(message = "{validation.invoice_version_required}")
    private String invoiceVersion;

    @NotBlank(message = "{validation.idempotency_key_required}")
    private String idempotencyKey;
}
