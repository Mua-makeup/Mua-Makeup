package com.makeup.platform.mapper.booking;

import com.makeup.platform.dto.response.booking.InstantBookingCreatedRes;
import com.makeup.platform.entity.booking.BookingEntity;
import org.springframework.stereotype.Component;

@Component
public class InstantBookingMapper {

    public InstantBookingCreatedRes toCreatedRes(BookingEntity entity, int potentialProvidersFound, int searchTimeoutSeconds) {
        if (entity == null) {
            return null;
        }

        return InstantBookingCreatedRes.builder()
                .bookingId(entity.getId())
                .bookingCode(entity.getBookingCode())
                .status(entity.getStatus())
                .bookingType(entity.getBookingType())
                .destinationAddress(entity.getDestinationAddress())
                .destinationLatitude(entity.getDestinationLatitude())
                .destinationLongitude(entity.getDestinationLongitude())
                .totalAmount(entity.getTotalAmount())
                .depositAmount(entity.getDepositAmount())
                .surchargeFee(entity.getSurchargeFee())
                .potentialProvidersFound(potentialProvidersFound)
                .searchTimeoutSeconds(searchTimeoutSeconds)
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
