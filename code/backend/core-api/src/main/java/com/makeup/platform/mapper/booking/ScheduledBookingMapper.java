package com.makeup.platform.mapper.booking;

import com.makeup.platform.dto.response.booking.ScheduledBookingCreatedRes;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.OffsetDateTime;

@Component
public class ScheduledBookingMapper {

    public ScheduledBookingCreatedRes toCreatedResponse(
            BookingEntity entity,
            String packageName,
            LocalTime estimatedEndTime,
            String scheduleSummary,
            OffsetDateTime reminder24hAt,
            OffsetDateTime reminder2hAt) {
        if (entity == null) {
            return null;
        }

        ScheduledBookingCreatedRes.AssignedMuaRes assignedMua = null;
        if (entity.getMua() != null) {
            MuaProfileEntity mua = entity.getMua();
            String fullName = (mua.getUser() != null) ? mua.getUser().getFullName() : null;
            String phone = (mua.getUser() != null) ? mua.getUser().getPhoneNumber() : null;
            String avatar = (mua.getUser() != null) ? mua.getUser().getAvatarUrl() : null;

            assignedMua = ScheduledBookingCreatedRes.AssignedMuaRes.builder()
                    .muaId(mua.getId())
                    .fullName(fullName)
                    .phoneNumber(phone)
                    .avatarUrl(avatar)
                    .build();
        }

        BigDecimal total = entity.getTotalAmount() != null ? entity.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal deposit = entity.getDepositAmount() != null ? entity.getDepositAmount() : BigDecimal.ZERO;
        BigDecimal remaining = total.subtract(deposit);

        ScheduledBookingCreatedRes.FinancialSummaryRes financialSummary = ScheduledBookingCreatedRes.FinancialSummaryRes.builder()
                .serviceSubtotal(entity.getServiceSubtotal())
                .distanceFee(entity.getDistanceFee())
                .surchargeFee(entity.getSurchargeFee())
                .discountAmount(entity.getDiscountAmount())
                .totalAmount(total)
                .depositAmount(deposit)
                .remainingAmount(remaining)
                .build();

        ScheduledBookingCreatedRes.RemindersRes reminders = ScheduledBookingCreatedRes.RemindersRes.builder()
                .reminder24hAt(reminder24hAt)
                .reminder2hAt(reminder2hAt)
                .build();

        return ScheduledBookingCreatedRes.builder()
                .bookingId(entity.getId())
                .bookingCode(entity.getBookingCode())
                .status(entity.getStatus() != null ? entity.getStatus().name() : null)
                .depositExpiredAt(entity.getDepositExpiredAt())
                .bookingType(entity.getBookingType() != null ? entity.getBookingType().name() : null)
                .bookingPartner(entity.getBookingPartner() != null ? entity.getBookingPartner().name() : null)
                .bookingDate(entity.getBookingDate())
                .startTime(entity.getStartTime())
                .estimatedEndTime(estimatedEndTime)
                .packageName(packageName)
                .scheduleSummary(scheduleSummary)
                .totalAmount(total)
                .depositAmount(deposit)
                .assignedMua(assignedMua)
                .financialSummary(financialSummary)
                .reminders(reminders)
                .build();
    }
}
