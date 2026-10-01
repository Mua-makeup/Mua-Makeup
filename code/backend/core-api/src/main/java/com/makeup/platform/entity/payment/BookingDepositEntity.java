package com.makeup.platform.entity.payment;

import com.makeup.platform.common.base.BaseEntity;
import com.makeup.platform.entity.booking.BookingEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "booking_deposits", schema = "wallet_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingDepositEntity extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false, unique = true)
    private BookingEntity booking;

    @Column(name = "required_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal requiredAmount;

    @Column(name = "paid_amount", precision = 12, scale = 2)
    private BigDecimal paidAmount;

    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private String status = "UNPAID";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "applied_payment_id")
    private PaymentTransactionEntity appliedPayment;

    @Column(name = "pricing_version", length = 20)
    private String pricingVersion;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "paid_at")
    private OffsetDateTime paidAt;
}
