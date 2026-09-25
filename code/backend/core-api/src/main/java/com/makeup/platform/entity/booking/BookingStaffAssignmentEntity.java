package com.makeup.platform.entity.booking;

import com.makeup.platform.common.base.BaseEntity;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
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
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "booking_staff_assignments", schema = "booking_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingStaffAssignmentEntity extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private BookingEntity booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_id", nullable = false)
    private AgencyStaffEntity staff;

    @Enumerated(EnumType.STRING)
    @Column(name = "assignment_role", nullable = false, length = 30)
    private AssignmentRole assignmentRole;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private AssignmentStatus status = AssignmentStatus.ACTIVE;

    @Column(name = "dispatch_notes", columnDefinition = "TEXT")
    private String dispatchNotes;

    @Column(name = "is_confirmed_by_staff", nullable = false)
    @Builder.Default
    private Boolean isConfirmedByStaff = false;

    @Column(name = "confirmed_at")
    private OffsetDateTime confirmedAt;

    @Column(name = "cancellation_reason", length = 255)
    private String cancellationReason;

    @Column(name = "cancelled_at")
    private OffsetDateTime cancelledAt;

    @Column(name = "proof_document_url", columnDefinition = "TEXT")
    private String proofDocumentUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "replaced_by_staff_id")
    private AgencyStaffEntity replacedByStaff;

    @CreationTimestamp
    @Column(name = "assigned_at", nullable = false, updatable = false)
    private OffsetDateTime assignedAt;
}
