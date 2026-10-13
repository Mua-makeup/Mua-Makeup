package com.makeup.platform.mapper.agency;

import com.makeup.platform.dto.response.agency.StaffAssignmentDetailRes;
import com.makeup.platform.dto.response.agency.StaffAvailabilityMatrixRes;
import com.makeup.platform.dto.response.agency.StaffMatrixItemRes;
import com.makeup.platform.entity.booking.AssignmentStatus;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStaffAssignmentEntity;
import com.makeup.platform.entity.catalog.MakeupStyleEntity;
import com.makeup.platform.entity.catalog.ServicePackageEntity;
import com.makeup.platform.mapper.booking.BookingStaffAssignmentMapper;
import com.makeup.platform.repository.custom.projection.StaffMatrixProjection;
import com.makeup.platform.entity.agency.AgencyOvertimeRuleEntity;
import com.makeup.platform.entity.agency.OvertimePenaltyType;
import com.makeup.platform.entity.agency.OvertimePolicyType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DispatchMatrixMapper {

    private final BookingStaffAssignmentMapper bookingStaffAssignmentMapper;

    public StaffMatrixItemRes toItemRes(StaffMatrixProjection projection, BookingEntity booking, List<AgencyOvertimeRuleEntity> activeRules) {
        if (projection == null) {
            return null;
        }

        boolean hasRegularShift = Boolean.TRUE.equals(projection.getHasShift());
        boolean hasOverlappingShift = Boolean.TRUE.equals(projection.getHasOverlappingShift());
        int overtimeMinutes = projection.getShiftOvertimeMinutes() != null ? projection.getShiftOvertimeMinutes() : 0;

        boolean isOvertime = false;
        BigDecimal overtimePay = BigDecimal.ZERO;
        String overtimeRuleName = null;
        boolean hasShift = hasRegularShift;

        // Nếu không có ca trọn vẹn, nhưng có ca bao phủ giờ bắt đầu (quá giờ):
        if (!hasRegularShift && hasOverlappingShift && overtimeMinutes > 0) {
            AgencyOvertimeRuleEntity matchedRule = null;
            if (activeRules != null && !activeRules.isEmpty()) {
                for (AgencyOvertimeRuleEntity rule : activeRules) {
                    if (Boolean.TRUE.equals(rule.getIsActive()) && (rule.getPolicyType() == null || rule.getPolicyType() == OvertimePolicyType.ALLOWANCE)) {
                        int min = rule.getMinOvertimeMinutes() != null ? rule.getMinOvertimeMinutes() : 0;
                        Integer max = rule.getMaxOvertimeMinutes();
                        if (overtimeMinutes >= min && (max == null || overtimeMinutes <= max)) {
                            matchedRule = rule;
                            break;
                        }
                    }
                }
            }

            if (matchedRule != null) {
                isOvertime = true;
                hasShift = true; // Cho phép ĐỦ ĐIỀU KIỆN làm ca tăng ca
                overtimeRuleName = matchedRule.getRuleName();

                if (matchedRule.getPenaltyType() == OvertimePenaltyType.FIXED_AMOUNT) {
                    overtimePay = matchedRule.getPenaltyValue() != null ? matchedRule.getPenaltyValue() : BigDecimal.ZERO;
                } else if (matchedRule.getPenaltyType() == OvertimePenaltyType.PERCENT_COMMISSION && booking != null && booking.getTotalAmount() != null) {
                    BigDecimal pct = matchedRule.getPenaltyValue() != null ? matchedRule.getPenaltyValue() : BigDecimal.ZERO;
                    overtimePay = booking.getTotalAmount().multiply(pct).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
                }
            } else {
                isOvertime = true;
                hasShift = true;
                overtimeRuleName = "Làm thêm giờ";
            }
        }

        boolean hasPackage = Boolean.TRUE.equals(projection.getHasPackage());
        boolean hasStyle = Boolean.TRUE.equals(projection.getHasStyle());
        boolean hasCalendarFree = Boolean.TRUE.equals(projection.getHasCalendarFree());
        boolean hasReportedBusy = Boolean.TRUE.equals(projection.getHasReportedBusy());

        boolean isFullyQualified = hasShift && hasPackage && hasStyle && hasCalendarFree && !hasReportedBusy;

        List<String> reasons = new ArrayList<>();
        if (hasReportedBusy) {
            reasons.add("Đã báo bận ca này");
        }
        if (!hasShift) {
            reasons.add("Chưa xếp ca làm việc");
        }
        if (!hasPackage) {
            reasons.add("Chưa gán kỹ năng gói dịch vụ");
        }
        if (!hasStyle) {
            reasons.add("Chưa gán phong cách này");
        }
        if (!hasCalendarFree) {
            reasons.add("Trùng lịch bận / đơn khác");
        }

        String disqualificationReason = reasons.isEmpty() ? null : String.join(", ", reasons);

        return StaffMatrixItemRes.builder()
                .staffId(projection.getStaffId())
                .staffName(projection.getStaffName())
                .staffPhone(projection.getStaffPhone())
                .staffAvatarUrl(projection.getStaffAvatarUrl())
                .hasShift(hasShift)
                .hasPackage(hasPackage)
                .hasStyle(hasStyle)
                .hasCalendarFree(hasCalendarFree)
                .hasReportedBusy(hasReportedBusy)
                .isFullyQualified(isFullyQualified)
                .disqualificationReason(disqualificationReason)
                .cancellationReason(projection.getCancellationReason())
                .currentRole(projection.getCurrentRole())
                .isOvertime(isOvertime)
                .overtimeMinutes(isOvertime ? overtimeMinutes : 0)
                .overtimePay(overtimePay)
                .overtimeRuleName(overtimeRuleName)
                .build();
    }

    public StaffAvailabilityMatrixRes toMatrixRes(BookingEntity booking, List<StaffMatrixProjection> projections, List<AgencyOvertimeRuleEntity> activeRules) {
        if (booking == null) {
            return null;
        }

        List<StaffAssignmentDetailRes> currentAssignments = List.of();
        if (booking.getStaffAssignments() != null && !booking.getStaffAssignments().isEmpty()) {
            List<BookingStaffAssignmentEntity> activeAssignments = booking.getStaffAssignments().stream()
                    .filter(a -> a.getStatus() == AssignmentStatus.ACTIVE)
                    .toList();
            currentAssignments = bookingStaffAssignmentMapper.toDetailResList(activeAssignments);
        }

        List<StaffMatrixItemRes> staffList = Collections.emptyList();
        int qualifiedCount = 0;

        if (projections != null && !projections.isEmpty()) {
            staffList = new ArrayList<>(projections.size());
            for (StaffMatrixProjection p : projections) {
                StaffMatrixItemRes item = toItemRes(p, booking, activeRules);
                if (item != null) {
                    if (currentAssignments != null && !currentAssignments.isEmpty()) {
                        for (StaffAssignmentDetailRes assign : currentAssignments) {
                            if (assign.getStaffId() != null && assign.getStaffId().equals(item.getStaffId())) {
                                item.setCommissionRate(assign.getCommissionRate());
                                item.setCommissionAmount(assign.getCommissionAmount());
                                item.setCommissionNote(assign.getCommissionNote());
                                break;
                            }
                        }
                    }
                    staffList.add(item);
                    if (item.isFullyQualified()) {
                        qualifiedCount++;
                    }
                }
            }
        }

        ServicePackageEntity servicePackage = booking.getServicePackage();
        MakeupStyleEntity style = booking.getStyle();

        Long packageId = servicePackage != null ? servicePackage.getId() : null;
        String packageName = servicePackage != null ? servicePackage.getPackageName() : null;
        Long styleId = (style != null && style.getId() != null) ? style.getId().longValue() : null;
        String styleName = style != null ? style.getStyleName() : null;

        return StaffAvailabilityMatrixRes.builder()
                .bookingId(booking.getId())
                .bookingCode(booking.getBookingCode())
                .packageId(packageId)
                .packageName(packageName)
                .styleId(styleId)
                .styleName(styleName)
                .scheduledStartTime(booking.getScheduledStartTime())
                .scheduledEndTime(booking.getScheduledEndTime())
                .destinationAddress(booking.getDestinationAddress())
                .needsEmergencyReassignment(Boolean.TRUE.equals(booking.getNeedsEmergencyReassignment()))
                .emergencyReason(booking.getEmergencyReason())
                .emergencyProofUrl(booking.getEmergencyProofUrl())
                .totalStaffCount(staffList.size())
                .qualifiedCount(qualifiedCount)
                .totalAmount(booking.getTotalAmount())
                .depositAmount(booking.getDepositAmount())
                .staffList(staffList)
                .currentAssignments(currentAssignments)
                .build();
    }

    // Overload for backward compatibility if needed
    public StaffAvailabilityMatrixRes toMatrixRes(BookingEntity booking, List<StaffMatrixProjection> projections) {
        return toMatrixRes(booking, projections, Collections.emptyList());
    }
}
