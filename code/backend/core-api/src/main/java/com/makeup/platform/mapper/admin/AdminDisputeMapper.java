package com.makeup.platform.mapper.admin;

import com.makeup.platform.dto.response.admin.AdminDisputeRes;
import com.makeup.platform.entity.booking.BookingEntity;
import org.springframework.stereotype.Component;

@Component
public class AdminDisputeMapper {

    public AdminDisputeRes toRes(BookingEntity booking) {
        if (booking == null) {
            return null;
        }

        String customerName = null;
        String customerPhone = null;
        String customerAvatar = null;
        Long customerId = null;
        if (booking.getCustomer() != null) {
            customerId = booking.getCustomer().getId();
            customerName = booking.getCustomer().getFullName();
            customerPhone = booking.getCustomer().getPhoneNumber();
            customerAvatar = booking.getCustomer().getAvatarUrl();
        }

        String muaName = null;
        String muaPhone = null;
        String muaAvatar = null;
        Long muaId = null;
        String agencyName = null;
        if (booking.getMua() != null) {
            muaId = booking.getMua().getId();
            if (booking.getMua().getUser() != null) {
                muaName = booking.getMua().getUser().getFullName();
                muaPhone = booking.getMua().getUser().getPhoneNumber();
                muaAvatar = booking.getMua().getUser().getAvatarUrl();
            }
        }
        if (booking.getAgency() != null) {
            agencyName = booking.getAgency().getAgencyName();
        }

        return AdminDisputeRes.builder()
                .id(booking.getId())
                .bookingId(booking.getId())
                .bookingCode(booking.getBookingCode())
                .status(booking.getStatus() != null ? booking.getStatus().name() : null)
                .bookingType(booking.getBookingType() != null ? booking.getBookingType().name() : null)
                .bookingDate(booking.getBookingDate())
                .startTime(booking.getStartTime())
                .destinationAddress(booking.getDestinationAddress())
                .customerId(customerId)
                .customerName(customerName)
                .customerPhone(customerPhone)
                .customerAvatar(customerAvatar)
                .muaId(muaId)
                .muaName(muaName)
                .muaPhone(muaPhone)
                .muaAvatar(muaAvatar)
                .agencyName(agencyName)
                .emergencyReason(booking.getEmergencyReason())
                .emergencyProofUrl(booking.getEmergencyProofUrl())
                .emergencyReportedAt(booking.getEmergencyReportedAt())
                .cancellationReason(booking.getCancellationReason())
                .serviceSubtotal(booking.getServiceSubtotal())
                .surchargeFee(booking.getSurchargeFee())
                .distanceFee(booking.getDistanceFee())
                .totalAmount(booking.getTotalAmount())
                .depositAmount(booking.getDepositAmount())
                .createdAt(booking.getCreatedAt())
                .updatedAt(booking.getUpdatedAt())
                .build();
    }
}
