package com.makeup.platform.mapper.agency;

import com.makeup.platform.dto.response.agency.AgencyDisputeRes;
import com.makeup.platform.entity.booking.AssignmentRole;
import com.makeup.platform.entity.booking.AssignmentStatus;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStaffAssignmentEntity;
import org.springframework.stereotype.Component;
import com.makeup.platform.service.booking.StudioDisputeFinanceService;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class AgencyDisputeMapper {
    private final StudioDisputeFinanceService studioFinance;

    public AgencyDisputeRes toRes(BookingEntity entity) {
        if (entity == null) {
            return null;
        }

        Long staffId = null;
        String staffName = null;
        String staffPhone = null;
        String staffAvatar = null;
        String staffRole = null;

        if (entity.getStaffAssignments() != null && !entity.getStaffAssignments().isEmpty()) {
            BookingStaffAssignmentEntity primaryOrFirst = entity.getStaffAssignments().stream()
                    .filter(sa -> sa.getAssignmentRole() == AssignmentRole.PRIMARY_MUA && sa.getStatus() != AssignmentStatus.REPLACED)
                    .findFirst()
                    .orElseGet(() -> entity.getStaffAssignments().stream()
                            .filter(sa -> sa.getStatus() != AssignmentStatus.REPLACED)
                            .findFirst()
                            .orElse(entity.getStaffAssignments().get(0)));

            if (primaryOrFirst != null && primaryOrFirst.getStaff() != null) {
                staffId = primaryOrFirst.getStaff().getId();
                staffRole = primaryOrFirst.getAssignmentRole() != null ? primaryOrFirst.getAssignmentRole().name() : null;
                if (primaryOrFirst.getStaff().getMua() != null && primaryOrFirst.getStaff().getMua().getUser() != null) {
                    staffName = primaryOrFirst.getStaff().getMua().getUser().getFullName();
                    staffPhone = primaryOrFirst.getStaff().getMua().getUser().getPhoneNumber();
                    staffAvatar = primaryOrFirst.getStaff().getMua().getUser().getAvatarUrl();
                }
            }
        }

        String customerName = entity.getCustomer() != null ? entity.getCustomer().getFullName() : null;
        String customerPhone = entity.getCustomer() != null ? entity.getCustomer().getPhoneNumber() : null;
        String customerAvatar = entity.getCustomer() != null ? entity.getCustomer().getAvatarUrl() : null;
        Long customerId = entity.getCustomer() != null ? entity.getCustomer().getId() : null;

        String rawReason = entity.getEmergencyReason() != null ? entity.getEmergencyReason() : entity.getCancellationReason();
        String disputeOrigin = "CUSTOMER";
        if (rawReason != null) {
            String lower = rawReason.toLowerCase();
            boolean hasCustomerTag = rawReason.contains("[Khách hàng]");
            boolean hasMuaTag = rawReason.contains("[Chuyên viên MUA]");
            if (hasCustomerTag && hasMuaTag) {
                disputeOrigin = "DUAL";
            } else if (hasCustomerTag) {
                disputeOrigin = "CUSTOMER";
            } else if (hasMuaTag) {
                disputeOrigin = "MUA";
            } else if (lower.contains("vắng mặt") || lower.contains("no-show") || lower.contains("không gặp khách") || lower.contains("khách không có mặt")) {
                disputeOrigin = "MUA";
            } else {
                disputeOrigin = "CUSTOMER";
            }
        }

        var financials = studioFinance.inspect(entity);
        return AgencyDisputeRes.builder()
                .bookingId(entity.getId())
                .bookingCode(entity.getBookingCode())
                .status(entity.getStatus() != null ? entity.getStatus().name() : null)
                .bookingType(entity.getBookingType() != null ? entity.getBookingType().name() : null)
                .bookingDate(entity.getBookingDate())
                .startTime(entity.getStartTime())
                .destinationAddress(entity.getDestinationAddress())
                .customerId(customerId)
                .customerName(customerName)
                .customerPhone(customerPhone)
                .customerAvatar(customerAvatar)
                .staffId(staffId)
                .staffName(staffName)
                .staffPhone(staffPhone)
                .staffAvatar(staffAvatar)
                .assignmentRole(staffRole)
                .emergencyReason(entity.getEmergencyReason())
                .emergencyProofUrl(entity.getEmergencyProofUrl())
                .emergencyReportedAt(entity.getEmergencyReportedAt())
                .cancellationReason(entity.getCancellationReason())
                .disputeOrigin(disputeOrigin)
                .financials(financials)
                .completedService(financials.completedService())
                .isEscalatedToAdmin((entity.getCancellationReason() != null && entity.getCancellationReason().contains("[LEO_THANG_ADMIN]"))
                        || (entity.getEmergencyReason() != null && entity.getEmergencyReason().contains("[LEO_THANG_ADMIN]")))
                .isStudioRejected(entity.getCancellationReason() != null && entity.getCancellationReason().contains("[STUDIO_TU_CHOI]"))
                .serviceSubtotal(entity.getServiceSubtotal())
                .surchargeFee(entity.getSurchargeFee())
                .totalAmount(entity.getTotalAmount())
                .depositAmount(entity.getDepositAmount())
                .completionPhotoUrl(entity.getCompletionPhotoUrl())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
