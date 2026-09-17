package com.makeup.platform.mapper.booking;

import com.makeup.platform.dto.response.admin.AdminBookingRes;
import com.makeup.platform.dto.response.booking.BookingAcceptanceRes;
import com.makeup.platform.dto.response.booking.BookingCompletionPhotoRes;
import com.makeup.platform.dto.response.booking.BookingStateTransitionRes;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class BookingMapper {

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
                .agencyId(agencyId)
                .agencyName(agencyName)
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
}

