package com.makeup.platform.entity.booking;

import com.makeup.platform.common.base.BaseEntity;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "bookings", schema = "booking_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingEntity extends BaseEntity {

    @Column(name = "booking_code", unique = true, nullable = false, length = 30)
    private String bookingCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private UserEntity customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agency_id")
    private AgencyProfileEntity agency;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mua_id")
    private MuaProfileEntity mua;

    @Enumerated(EnumType.STRING)
    @Column(name = "booking_type", nullable = false, length = 30)
    private BookingType bookingType;

    @Enumerated(EnumType.STRING)
    @Column(name = "booking_partner", nullable = false, length = 30)
    private BookingPartner bookingPartner;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private BookingStatus status = BookingStatus.REQUESTED;

    @Column(name = "destination_address", nullable = false, columnDefinition = "TEXT")
    private String destinationAddress;

    @Column(name = "destination_latitude", nullable = false, precision = 10, scale = 8)
    private BigDecimal destinationLatitude;

    @Column(name = "destination_longitude", nullable = false, precision = 11, scale = 8)
    private BigDecimal destinationLongitude;

    @Column(name = "booking_date", nullable = false)
    private LocalDate bookingDate;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "service_subtotal", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal serviceSubtotal = BigDecimal.ZERO;

    @Column(name = "distance_fee", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal distanceFee = BigDecimal.ZERO;

    @Column(name = "surcharge_fee", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal surchargeFee = BigDecimal.ZERO;

    @Column(name = "surge_multiplier", precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal surgeMultiplier = BigDecimal.ONE;

    @Column(name = "discount_amount", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "deposit_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal depositAmount = BigDecimal.ZERO;

    @Column(name = "completion_photo_url", columnDefinition = "TEXT")
    private String completionPhotoUrl;

    @Column(name = "cancellation_reason", columnDefinition = "TEXT")
    private String cancellationReason;

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Long version = 0L;
}
