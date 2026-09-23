package com.makeup.platform.dto.response.agency;

import com.makeup.platform.dto.response.catalog.PackageItemRes;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgencyBookingRes {

    private Long id;
    private String bookingCode;

    // Customer Info
    private Long customerId;
    private String customerName;
    private String customerPhone;

    // Assigned Staff Info
    private Long staffMuaId;
    private String staffName;
    private String staffPhone;
    private BigDecimal staffCommissionRate;

    // Booking Details
    private String bookingType;
    private String status;
    private String destinationAddress;
    private LocalDate bookingDate;
    private LocalTime startTime;

    // Financials
    private BigDecimal totalAmount;
    private BigDecimal depositAmount;
    private BigDecimal estimatedStaffCommission;
    private BigDecimal estimatedStudioNet;

    // Service Package & Schedule
    private Long bookingId;
    private String bookingStatus;
    private Long packageId;
    private String servicePackageName;
    private String packageName;
    private String packageDescription;
    private BigDecimal packagePrice;
    private Integer packageDurationMinutes;
    private String categoryName;
    @Builder.Default
    private List<PackageItemRes> packageItems = List.of();
    private LocalDateTime scheduledStartTime;
    private LocalDateTime scheduledEndTime;

    // Audit
    private LocalDateTime createdAt;
}
