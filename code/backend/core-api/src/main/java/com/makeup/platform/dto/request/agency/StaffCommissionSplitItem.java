package com.makeup.platform.dto.request.agency;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffCommissionSplitItem {

    @NotNull(message = "{validation.staff_id_required}")
    private Long staffId;

    @DecimalMin(value = "0.00", message = "{validation.commission_rate_min}")
    @DecimalMax(value = "100.00", message = "{validation.commission_rate_max}")
    private BigDecimal commissionRate;

    @DecimalMin(value = "0.00", message = "{validation.commission_amount_min}")
    private BigDecimal commissionAmount;

    private String commissionNote;

    public void setNote(String note) {
        if (this.commissionNote == null || this.commissionNote.isBlank()) {
            this.commissionNote = note;
        }
    }
}
