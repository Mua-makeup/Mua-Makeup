package com.makeup.platform.entity.mua;

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

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "mua_calendars", schema = "mua_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MUACalendarEntity extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mua_id", nullable = false)
    private MuaProfileEntity mua;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private BookingEntity booking;

    @Column(name = "booking_date", nullable = false)
    private LocalDate bookingDate;

    @Column(name = "start_at", nullable = false)
    private OffsetDateTime startAt;

    @Column(name = "end_at", nullable = false)
    private OffsetDateTime endAt;

    @Column(name = "is_locked", nullable = false)
    @Builder.Default
    private Boolean isLocked = true;

    @Column(name = "reason", nullable = false, length = 255)
    private String reason;
}
