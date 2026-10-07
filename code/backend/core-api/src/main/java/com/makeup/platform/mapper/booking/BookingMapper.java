package com.makeup.platform.mapper.booking;

import com.makeup.platform.dto.response.admin.AdminBookingRes;
import com.makeup.platform.dto.response.agency.StaffAssignmentDetailRes;
import com.makeup.platform.dto.response.booking.BookingAcceptanceRes;
import com.makeup.platform.dto.response.booking.BookingCompletionPhotoRes;
import com.makeup.platform.dto.response.booking.BookingStateTransitionRes;
import com.makeup.platform.dto.response.booking.CustomerBookingItemRes;
import com.makeup.platform.dto.response.booking.FreelancerBookingItemRes;
import com.makeup.platform.dto.response.catalog.PackageItemRes;
import com.makeup.platform.entity.booking.AssignmentRole;
import com.makeup.platform.entity.booking.AssignmentStatus;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStaffAssignmentEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class BookingMapper {

    private final BookingStaffAssignmentMapper bookingStaffAssignmentMapper;

    public BookingStateTransitionRes toTransitionRes(BookingEntity entity, BookingStatus previousStatus, Long updatedByUserId) {
        if (entity == null) {
            return null;
        }

        return BookingStateTransitionRes.builder()
                .bookingId(entity.getId())
                .bookingCode(entity.getBookingCode())
                .previousStatus(previousStatus != null ? previousStatus.name() : null)
                .currentStatus(entity.getStatus() != null ? entity.getStatus().name() : null)
                .updatedByUserId(updatedByUserId)
                .transitionedAt(LocalDateTime.now())
                .build();
    }

    public BookingCompletionPhotoRes toCompletionPhotoRes(BookingEntity entity, String thumbnailUrl, String publicId) {
        if (entity == null) {
            return null;
        }

        return BookingCompletionPhotoRes.builder()
                .bookingId(entity.getId())
                .bookingCode(entity.getBookingCode())
                .completionPhotoUrl(entity.getCompletionPhotoUrl())
                .thumbnailUrl(thumbnailUrl)
                .publicId(publicId)
                .uploadedAt(LocalDateTime.now())
                .build();
    }

    public BookingAcceptanceRes toAcceptanceRes(BookingEntity entity) {
        if (entity == null) {
            return null;
        }

        BookingAcceptanceRes.CustomerSummary customerSummary = null;
        if (entity.getCustomer() != null) {
            customerSummary = BookingAcceptanceRes.CustomerSummary.builder()
                    .fullName(entity.getCustomer().getFullName())
                    .phoneNumber(entity.getCustomer().getPhoneNumber())
                    .build();
        }

        Long assignedMuaId = null;
        if (entity.getMua() != null) {
            assignedMuaId = entity.getMua().getId();
        }

        return BookingAcceptanceRes.builder()
                .bookingId(entity.getId())
                .bookingCode(entity.getBookingCode())
                .status(entity.getStatus() != null ? entity.getStatus().name() : null)
                .assignedMuaId(assignedMuaId)
                .destinationAddress(entity.getDestinationAddress())
                .serviceTotalAmount(entity.getTotalAmount())
                .escrowDepositLocked(entity.getDepositAmount())
                .customerInfo(customerSummary)
                .acceptedAt(LocalDateTime.now())
                .build();
    }

    public AdminBookingRes toAdminBookingRes(BookingEntity entity) {
        if (entity == null) {
            return null;
        }

        String customerName = null;
        String customerPhone = null;
        String customerEmail = null;
        Long customerId = null;
        if (entity.getCustomer() != null) {
            customerId = entity.getCustomer().getId();
            customerName = entity.getCustomer().getFullName();
            customerPhone = entity.getCustomer().getPhoneNumber();
            customerEmail = entity.getCustomer().getEmail();
        }

        Long muaId = null;
        String muaName = null;
        String muaPhone = null;
        if (entity.getMua() != null) {
            muaId = entity.getMua().getId();
            if (entity.getMua().getUser() != null) {
                muaName = entity.getMua().getUser().getFullName();
                muaPhone = entity.getMua().getUser().getPhoneNumber();
            }
        }

        Long agencyId = null;
        String agencyName = null;
        if (entity.getAgency() != null) {
            agencyId = entity.getAgency().getId();
            agencyName = entity.getAgency().getAgencyName();
        }

        Long packageId = null;
        String packageName = null;
        String packageDescription = null;
        BigDecimal packagePrice = null;
        Integer packageDurationMinutes = null;
        String categoryName = null;
        List<PackageItemRes> packageItems = List.of();

        if (entity.getServicePackage() != null) {
            var pkg = entity.getServicePackage();
            packageId = pkg.getId();
            packageName = pkg.getPackageName();
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

        final List<StaffAssignmentDetailRes> assignedStaff = (entity.getStaffAssignments() != null && !entity.getStaffAssignments().isEmpty())
                ? bookingStaffAssignmentMapper.toDetailResList(
                        entity.getStaffAssignments().stream()
                                .filter(sa -> sa.getStatus() != AssignmentStatus.REPLACED)
                                .toList()
                  )
                : List.of();

        if (muaName == null && !assignedStaff.isEmpty()) {
            var primary = assignedStaff.stream()
                    .filter(s -> s.getRole() == AssignmentRole.PRIMARY_MUA && s.getStatus() == AssignmentStatus.ACTIVE)
                    .findFirst()
                    .or(() -> assignedStaff.stream()
                            .filter(s -> s.getRole() == AssignmentRole.PRIMARY_MUA)
                            .findFirst())
                    .orElse(assignedStaff.get(0));
            muaName = primary.getStaffName();
            muaPhone = primary.getStaffPhone();
            muaId = primary.getStaffId();
        }

        return AdminBookingRes.builder()
                .id(entity.getId())
                .bookingCode(entity.getBookingCode())
                .customerId(customerId)
                .customerName(customerName)
                .customerPhone(customerPhone)
                .customerEmail(customerEmail)
                .muaId(muaId)
                .muaName(muaName)
                .muaPhone(muaPhone)
                .assignedStaff(assignedStaff)
                .agencyId(agencyId)
                .agencyName(agencyName)
                .packageId(packageId)
                .packageName(packageName)
                .packageDescription(packageDescription)
                .packagePrice(packagePrice)
                .packageDurationMinutes(packageDurationMinutes)
                .categoryName(categoryName)
                .packageItems(packageItems)
                .bookingType(entity.getBookingType() != null ? entity.getBookingType().name() : null)
                .bookingPartner(entity.getBookingPartner() != null ? entity.getBookingPartner().name() : null)
                .status(entity.getStatus() != null ? entity.getStatus().name() : null)
                .destinationAddress(entity.getDestinationAddress())
                .destinationLatitude(entity.getDestinationLatitude())
                .destinationLongitude(entity.getDestinationLongitude())
                .bookingDate(entity.getBookingDate())
                .startTime(entity.getStartTime())
                .serviceSubtotal(entity.getServiceSubtotal())
                .distanceFee(entity.getDistanceFee())
                .surchargeFee(entity.getSurchargeFee())
                .totalAmount(entity.getTotalAmount())
                .depositAmount(entity.getDepositAmount())
                .completionPhotoUrl(entity.getCompletionPhotoUrl())
                .cancellationReason(entity.getCancellationReason())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    public FreelancerBookingItemRes toFreelancerBookingRes(BookingEntity entity) {
        if (entity == null) {
            return null;
        }

        String customerName = entity.getCustomer() != null ? entity.getCustomer().getFullName() : null;
        String customerPhone = entity.getCustomer() != null ? entity.getCustomer().getPhoneNumber() : null;
        String customerAvatar = entity.getCustomer() != null ? entity.getCustomer().getAvatarUrl() : null;

        String packageName = "Trang điểm";
        String packageCoverUrl = null;
        if (entity.getServicePackage() != null) {
            packageName = entity.getServicePackage().getPackageName();
        } else if (entity.getStyle() != null) {
            packageName = entity.getStyle().getStyleName();
        }

        BigDecimal earnings = BigDecimal.ZERO;
        if (entity.getTotalAmount() != null) {
            BigDecimal platformFee = entity.getTotalAmount().multiply(BigDecimal.valueOf(0.20)).setScale(0, RoundingMode.HALF_UP);
            earnings = entity.getTotalAmount().subtract(platformFee);
        } else if (entity.getServiceSubtotal() != null) {
            BigDecimal platformFee = entity.getServiceSubtotal().multiply(BigDecimal.valueOf(0.20)).setScale(0, RoundingMode.HALF_UP);
            earnings = entity.getServiceSubtotal().subtract(platformFee);
        }

        return FreelancerBookingItemRes.builder()
                .id(entity.getId())
                .bookingCode(entity.getBookingCode())
                .status(entity.getStatus() != null ? entity.getStatus().name() : null)
                .bookingType(entity.getBookingType() != null ? entity.getBookingType().name() : null)
                .customerName(customerName)
                .customerPhone(customerPhone)
                .customerAvatar(customerAvatar)
                .packageName(packageName)
                .packageCoverUrl(packageCoverUrl)
                .destinationAddress(entity.getDestinationAddress())
                .destinationLatitude(entity.getDestinationLatitude())
                .destinationLongitude(entity.getDestinationLongitude())
                .bookingDate(entity.getBookingDate())
                .startTime(entity.getStartTime())
                .totalAmount(entity.getTotalAmount())
                .depositAmount(entity.getDepositAmount())
                .earningsAmount(earnings)
                .note(entity.getEmergencyReason())
                .completionPhotoUrl(entity.getCompletionPhotoUrl())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public CustomerBookingItemRes toCustomerBookingRes(BookingEntity entity) {
        return toCustomerBookingRes(entity, false);
    }

    public CustomerBookingItemRes toCustomerBookingRes(BookingEntity entity, boolean hasPaidDeposit) {
        if (entity == null) {
            return null;
        }

        Long muaId = null;
        String muaName = null;
        String muaAvatarUrl = null;
        String muaPhoneNumber = null;

        if (entity.getMua() != null) {
            muaId = entity.getMua().getId();
            if (entity.getMua().getUser() != null) {
                muaName = entity.getMua().getUser().getFullName();
                muaAvatarUrl = entity.getMua().getUser().getAvatarUrl();
                muaPhoneNumber = entity.getMua().getUser().getPhoneNumber();
            }
        }

        String packageName = "Trang điểm";
        String packageCoverUrl = null;
        if (entity.getServicePackage() != null) {
            packageName = entity.getServicePackage().getPackageName();
        } else if (entity.getStyle() != null) {
            packageName = entity.getStyle().getStyleName();
        }

        LocalDateTime bookingTime = null;
        if (entity.getBookingDate() != null && entity.getStartTime() != null) {
            bookingTime = entity.getBookingDate().atTime(entity.getStartTime());
        }

        BigDecimal remainingAmount = BigDecimal.ZERO;
        if (entity.getTotalAmount() != null) {
            BigDecimal deposit = entity.getDepositAmount() != null ? entity.getDepositAmount() : BigDecimal.ZERO;
            remainingAmount = entity.getTotalAmount().subtract(deposit);
            if (remainingAmount.compareTo(BigDecimal.ZERO) < 0) {
                remainingAmount = BigDecimal.ZERO;
            }
        }

        boolean isDepositPaid = hasPaidDeposit;
        if (!isDepositPaid) {
            if (entity.getStatus() == BookingStatus.ON_THE_WAY
                    || entity.getStatus() == BookingStatus.ARRIVED
                    || entity.getStatus() == BookingStatus.IN_PROGRESS
                    || entity.getStatus() == BookingStatus.COMPLETED
                    || entity.getStatus() == BookingStatus.PAID_OUT) {
                isDepositPaid = true;
            }
        }

        boolean isDepositRefunded = false;
        if (entity.getStatus() == BookingStatus.CANCELLED || entity.getStatus() == BookingStatus.DISPUTE_REFUNDED) {
            String reason = entity.getCancellationReason();
            if (reason != null && (reason.toLowerCase().contains("khách hàng khác")
                    || reason.toLowerCase().contains("trùng")
                    || reason.toLowerCase().contains("hoàn trả")
                    || reason.toLowerCase().contains("hoàn cọc"))) {
                isDepositRefunded = true;
            }
        }

        return CustomerBookingItemRes.builder()
                .id(entity.getId())
                .bookingCode(entity.getBookingCode())
                .muaId(muaId)
                .muaName(muaName)
                .muaAvatarUrl(muaAvatarUrl)
                .muaPhoneNumber(muaPhoneNumber)
                .packageName(packageName)
                .packageCoverUrl(packageCoverUrl)
                .bookingTime(bookingTime)
                .destinationAddress(entity.getDestinationAddress())
                .destinationLatitude(entity.getDestinationLatitude())
                .destinationLongitude(entity.getDestinationLongitude())
                .status(entity.getStatus() != null ? entity.getStatus().name() : null)
                .totalAmount(entity.getTotalAmount())
                .depositAmount(entity.getDepositAmount())
                .remainingAmount(remainingAmount)
                .note(entity.getEmergencyReason())
                .isDepositPaid(isDepositPaid)
                .cancellationReason(entity.getCancellationReason())
                .isDepositRefunded(isDepositRefunded)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}

