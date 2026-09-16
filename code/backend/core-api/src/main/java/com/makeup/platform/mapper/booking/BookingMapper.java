package com.makeup.platform.mapper.booking;

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
}
