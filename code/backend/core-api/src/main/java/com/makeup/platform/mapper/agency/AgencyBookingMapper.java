package com.makeup.platform.mapper.agency;

import com.makeup.platform.dto.response.agency.AgencyBookingRes;
import com.makeup.platform.dto.response.agency.StaffAssignmentDetailRes;
import com.makeup.platform.dto.response.catalog.PackageItemRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.entity.booking.AssignmentRole;
import com.makeup.platform.entity.booking.AssignmentStatus;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStaffAssignmentEntity;
import com.makeup.platform.entity.catalog.ServicePackageEntity;
import com.makeup.platform.mapper.booking.BookingStaffAssignmentMapper;
import com.makeup.platform.repository.AgencyStaffRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class AgencyBookingMapper {

    private final AgencyStaffRepository agencyStaffRepository;
    private final BookingStaffAssignmentMapper bookingStaffAssignmentMapper;

    public AgencyBookingRes toRes(BookingEntity b, AgencyProfileEntity agency) {
        if (b == null) {
            return null;
        }

        String customerName = null;
        String customerPhone = null;
        Long customerId = null;
        if (b.getCustomer() != null) {
            customerId = b.getCustomer().getId();
            customerName = b.getCustomer().getFullName();
            customerPhone = b.getCustomer().getPhoneNumber();
        }

        Long staffMuaId = null;
        String staffName = null;
        String staffPhone = null;
        BigDecimal staffCommissionRate = (agency != null && agency.getCommissionRateInternal() != null)
                ? agency.getCommissionRateInternal()
                : BigDecimal.valueOf(30.0);

        if (b.getMua() != null) {
            staffMuaId = b.getMua().getId();
            if (b.getMua().getUser() != null) {
                staffName = b.getMua().getUser().getFullName();
                staffPhone = b.getMua().getUser().getPhoneNumber();
            }

            if (agency != null) {
                Optional<AgencyStaffEntity> staffOpt = agencyStaffRepository.findByAgencyIdAndMuaId(agency.getId(), staffMuaId);
                if (staffOpt.isPresent() && staffOpt.get().getAgreedCommissionRate() != null) {
                    staffCommissionRate = staffOpt.get().getAgreedCommissionRate();
                }
            }
        }

        BigDecimal totalAmount = b.getTotalAmount() != null ? b.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal commissionMultiplier = staffCommissionRate.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        BigDecimal estimatedStaffCommission = totalAmount.multiply(commissionMultiplier).setScale(2, RoundingMode.HALF_UP);
        BigDecimal estimatedStudioNet = totalAmount.subtract(estimatedStaffCommission).setScale(2, RoundingMode.HALF_UP);

        String servicePkgName = null;
        Long pkgId = null;
        String packageDescription = null;
        BigDecimal packagePrice = null;
        Integer packageDurationMinutes = null;
        String categoryName = null;
        List<PackageItemRes> packageItems = Collections.emptyList();

        ServicePackageEntity pkg = b.getServicePackage();
        if (pkg != null) {
            pkgId = pkg.getId();
            servicePkgName = pkg.getPackageName();
            packageDescription = pkg.getDescription();
            packagePrice = pkg.getPrice();
            packageDurationMinutes = pkg.getEstimatedDurationMinutes();
            if (pkg.getMasterCategory() != null) {
                categoryName = pkg.getMasterCategory().getCategoryName();
            }
            if (pkg.getPackageItems() != null) {
                packageItems = pkg.getPackageItems().stream()
                        .map(item -> PackageItemRes.builder()
                                .id(item.getId())
                                .itemType(item.getItemType())
                                .itemName(item.getItemName())
                                .stepOrder(item.getStepOrder())
                                .itemPrice(item.getItemPrice())
                                .durationMinutes(item.getDurationMinutes())
                                .isRequired(item.getIsRequired())
                                .isActive(item.getIsActive())
                                .build())
                        .toList();
            }
        }

        LocalDateTime scheduledStartTime = (b.getBookingDate() != null && b.getStartTime() != null)
                ? b.getBookingDate().atTime(b.getStartTime()) : null;
        LocalDateTime scheduledEndTime = (scheduledStartTime != null && packageDurationMinutes != null)
                ? scheduledStartTime.plusMinutes(packageDurationMinutes) : null;

        final List<StaffAssignmentDetailRes> assignedStaff = (b.getStaffAssignments() != null && !b.getStaffAssignments().isEmpty())
                ? bookingStaffAssignmentMapper.toDetailResList(
                        b.getStaffAssignments().stream()
                                .filter(sa -> sa.getStatus() != AssignmentStatus.REPLACED)
                                .toList()
                  )
                : Collections.emptyList();

        if (staffName == null && !assignedStaff.isEmpty()) {
            var primary = assignedStaff.stream()
                    .filter(s -> s.getRole() == AssignmentRole.PRIMARY_MUA && s.getStatus() == AssignmentStatus.ACTIVE)
                    .findFirst()
                    .or(() -> assignedStaff.stream()
                            .filter(s -> s.getRole() == AssignmentRole.PRIMARY_MUA)
                            .findFirst())
                    .orElse(assignedStaff.get(0));
            staffName = primary.getStaffName();
            staffPhone = primary.getStaffPhone();
            staffMuaId = primary.getStaffId();
        }

        return AgencyBookingRes.builder()
                .id(b.getId())
                .bookingId(b.getId())
                .bookingCode(b.getBookingCode())
                .customerId(customerId)
                .customerName(customerName)
                .customerPhone(customerPhone)
                .staffMuaId(staffMuaId)
                .staffName(staffName)
                .staffPhone(staffPhone)
                .staffCommissionRate(staffCommissionRate)
                .bookingType(b.getBookingType() != null ? b.getBookingType().name() : null)
                .status(b.getStatus() != null ? b.getStatus().name() : null)
                .bookingStatus(b.getStatus() != null ? b.getStatus().name() : null)
                .packageId(pkgId)
                .servicePackageName(servicePkgName)
                .packageName(servicePkgName)
                .packageDescription(packageDescription)
                .packagePrice(packagePrice)
                .packageDurationMinutes(packageDurationMinutes)
                .categoryName(categoryName)
                .packageItems(packageItems)
                .scheduledStartTime(scheduledStartTime)
                .scheduledEndTime(scheduledEndTime)
                .destinationAddress(b.getDestinationAddress())
                .bookingDate(b.getBookingDate())
                .startTime(b.getStartTime())
                .totalAmount(totalAmount)
                .depositAmount(b.getDepositAmount() != null ? b.getDepositAmount() : BigDecimal.ZERO)
                .estimatedStaffCommission(estimatedStaffCommission)
                .estimatedStudioNet(estimatedStudioNet)
                .needsEmergencyReassignment(b.getNeedsEmergencyReassignment())
                .emergencyReason(b.getEmergencyReason())
                .emergencyReportedAt(b.getEmergencyReportedAt() != null ? b.getEmergencyReportedAt().toLocalDateTime() : null)
                .emergencyProofUrl(b.getEmergencyProofUrl())
                .assignedStaff(assignedStaff)
                .createdAt(b.getCreatedAt())
                .build();
    }
}
