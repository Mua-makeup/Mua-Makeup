package com.makeup.platform.entity.wallet;

import com.makeup.platform.entity.booking.BookingEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;

/**
 * Quyết toán đơn (Booking Settlement).
 * Lưu snapshot T/D/C/F/E/N khi cả hai bên xác nhận tiền mặt.
 * Unique booking_id: mỗi đơn chỉ có 1 lần quyết toán.
 * status: PENDING -> SETTLED | PARTIAL | PENDING_FEE_COLLECTION | DISPUTED | FAILED
 */
@Entity
@Table(name = "booking_settlements", schema = "wallet_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingSettlementEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false, unique = true)
    private BookingEntity booking;

    @Column(name = "settlement_version", nullable = false)
    @Builder.Default
    private Integer settlementVersion = 1;

    /** T: tổng hóa đơn cuối */
    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    /** D: tiền cọc hệ thống đang giữ */
    @Column(name = "deposit_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal depositAmount;

    /** C: tiền mặt khách đã trả trực tiếp cho thợ, C = T - D */
    @Column(name = "cash_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal cashAmount;

    /** F: phí nền tảng theo snapshot chính sách */
    @Column(name = "commission_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal commissionAmount;

    /** E: tổng thu nhập thợ được hưởng, E = T - F */
    @Column(name = "freelancer_earnings", nullable = false, precision = 12, scale = 2)
    private BigDecimal freelancerEarnings;

    /** N: phần cộng vào ví thợ qua hệ thống, N = E - C = D - F */
    @Column(name = "wallet_credited_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal walletCreditedAmount;

    @Column(name = "commission_rate", nullable = false, precision = 5, scale = 4)
    private BigDecimal commissionRate;

    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "settled_at")
    private OffsetDateTime settledAt;

    @Column(name = "failure_reason", columnDefinition = "TEXT")
    private String failureReason;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
