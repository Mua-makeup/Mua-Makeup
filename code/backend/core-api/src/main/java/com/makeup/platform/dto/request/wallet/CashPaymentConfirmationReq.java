package com.makeup.platform.dto.request.wallet;

import java.util.UUID;

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

    private String idempotencyKey;

    public String getIdempotencyKey() {
        if (idempotencyKey == null || idempotencyKey.trim().isEmpty()) {
            return UUID.randomUUID().toString();
        }
        return idempotencyKey.trim();
    }
}
