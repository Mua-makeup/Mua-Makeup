package com.makeup.platform.entity.agency;

import com.makeup.platform.common.base.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
import java.time.LocalDateTime;

@Entity
@Table(name = "agency_staff_overtime_reports", schema = "agency_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgencyStaffOvertimeReportEntity extends BaseEntity {

    @Column(name = "booking_id", nullable = false)
    private Long bookingId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_id", nullable = false)
    private AgencyStaffEntity staff;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agency_id", nullable = false)
    private AgencyProfileEntity agency;

    @Column(name = "overtime_minutes", nullable = false)
    private Integer overtimeMinutes;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason_type", nullable = false, length = 50)
    private OvertimeReasonType reasonType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rule_id")
    private AgencyOvertimeRuleEntity rule;

    @Column(name = "explanation_text", nullable = false, columnDefinition = "TEXT")
    private String explanationText;

    @Column(name = "proof_image_url", columnDefinition = "TEXT")
    private String proofImageUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private OvertimeReportStatus status = OvertimeReportStatus.PENDING_AGENCY_REVIEW;

    @Column(name = "penalty_amount_applied", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal penaltyAmountApplied = BigDecimal.ZERO;

    @Column(name = "customer_surcharge_amount", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal customerSurchargeAmount = BigDecimal.ZERO;

    @Column(name = "charge_reason", columnDefinition = "TEXT")
    private String chargeReason;

    @Column(name = "admin_notes", columnDefinition = "TEXT")
    private String adminNotes;

    @Column(name = "reviewed_by_user_id")
    private Long reviewedByUserId;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;
}
