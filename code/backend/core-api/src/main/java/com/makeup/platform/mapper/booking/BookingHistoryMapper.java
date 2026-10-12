package com.makeup.platform.mapper.booking;

import com.makeup.platform.dto.response.booking.BookingHistoryLogRes;
import com.makeup.platform.dto.response.booking.BookingHistoryRes;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingHistoryEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;

@Component
public class BookingHistoryMapper {

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm - dd/MM/yyyy");

    public BookingHistoryLogRes toRes(BookingHistoryEntity entity) {
        if (entity == null) {
            return null;
        }

        BookingEntity booking = entity.getBooking();
        return toRes(entity, booking);
    }

    public BookingHistoryLogRes toRes(BookingHistoryEntity entity, BookingEntity booking) {
        if (entity == null) {
            return null;
        }

        String changedBy = null;
        Long changedByUserId = null;
        if (entity.getChangedByUser() != null) {
            changedByUserId = entity.getChangedByUser().getId();
            changedBy = entity.getChangedByUser().getFullName();
        }

        String artistName = null;
        String artistPhone = null;
        String destinationAddress = null;
        String originAddress = null;

        if (booking != null) {
            destinationAddress = booking.getDestinationAddress();
            if (booking.getMua() != null && booking.getMua().getUser() != null) {
                artistName = booking.getMua().getUser().getFullName();
                artistPhone = booking.getMua().getUser().getPhoneNumber();
            }
            if (booking.getAgency() != null) {
                StringBuilder sb = new StringBuilder();
                if (booking.getAgency().getAddressStreet() != null) sb.append(booking.getAgency().getAddressStreet());
                if (booking.getAgency().getDistrict() != null) {
                    if (!sb.isEmpty()) sb.append(", ");
                    sb.append(booking.getAgency().getDistrict());
                }
                if (booking.getAgency().getCity() != null) {
                    if (!sb.isEmpty()) sb.append(", ");
                    sb.append(booking.getAgency().getCity());
                }
                originAddress = sb.isEmpty() ? booking.getAgency().getAgencyName() : sb.toString();
            } else if (booking.getMua() != null && booking.getMua().getBaseAddressText() != null && !booking.getMua().getBaseAddressText().isBlank()) {
                originAddress = booking.getMua().getBaseAddressText();
            } else if (artistName != null) {
                originAddress = "Địa chỉ chuyên viên " + artistName;
            }

            boolean isTravelOrAssignedStatus = entity.getToStatus() != null && (
                    entity.getToStatus() == BookingStatus.ACCEPTED
                    || entity.getToStatus() == BookingStatus.AGENCY_ASSIGNED
                    || entity.getToStatus() == BookingStatus.ON_THE_WAY
                    || entity.getToStatus() == BookingStatus.ARRIVED
            );

            if (!isTravelOrAssignedStatus) {
                originAddress = null;
            }
        }

        String actionTitle = resolveActionTitle(entity.getToStatus());
        String formattedTime = entity.getCreatedAt() != null ? entity.getCreatedAt().format(TIME_FORMATTER) : null;

        String note = entity.getNote();
        if ((note == null || note.isBlank() || note.startsWith("Chuyển trạng thái") || note.equals("Đơn hàng đã bị hủy theo yêu cầu.")) && booking != null) {
            if (entity.getToStatus() == BookingStatus.CANCELLED || entity.getToStatus() == BookingStatus.CANCELLED_EXPIRED) {
                if (booking.getCancellationReason() != null && !booking.getCancellationReason().isBlank()) {
                    note = booking.getCancellationReason();
                }
            } else if (entity.getToStatus() == BookingStatus.DISPUTED || entity.getToStatus() == BookingStatus.DISPUTE_REFUNDED || entity.getToStatus() == BookingStatus.DISPUTE_COMPENSATED) {
                String disputeReason = booking.getEmergencyReason() != null ? booking.getEmergencyReason() : booking.getCancellationReason();
                if (disputeReason != null && !disputeReason.isBlank()) {
                    note = disputeReason;
                }
            }
        }

        return BookingHistoryLogRes.builder()
                .id(entity.getId())
                .fromStatus(entity.getFromStatus() != null ? entity.getFromStatus().name() : null)
                .toStatus(entity.getToStatus() != null ? entity.getToStatus().name() : null)
                .actionTitle(actionTitle)
                .changedByUserId(changedByUserId)
                .changedBy(changedBy)
                .artistName(artistName)
                .artistPhone(artistPhone)
                .originAddress(originAddress)
                .destinationAddress(destinationAddress)
                .note(note)
                .formattedTime(formattedTime)
                .createdAt(entity.getCreatedAt())
                .build();
    }

    public List<BookingHistoryLogRes> toResList(List<BookingHistoryEntity> entities, BookingEntity booking) {
        if (entities == null || entities.isEmpty()) {
            return Collections.emptyList();
        }
        return entities.stream().map(e -> toRes(e, booking)).toList();
    }

    public List<BookingHistoryLogRes> toResList(List<BookingHistoryEntity> entities) {
        if (entities == null || entities.isEmpty()) {
            return Collections.emptyList();
        }
        return entities.stream().map(this::toRes).toList();
    }

    public BookingHistoryRes toHistoryRes(BookingEntity booking, List<BookingHistoryEntity> historyEntities) {
        if (booking == null) {
            return null;
        }

        return BookingHistoryRes.builder()
                .bookingId(booking.getId())
                .bookingCode(booking.getBookingCode())
                .currentStatus(booking.getStatus() != null ? booking.getStatus().name() : null)
                .historyLogs(toResList(historyEntities, booking))
                .build();
    }

    private String resolveActionTitle(BookingStatus status) {
        if (status == null) {
            return "Cập nhật trạng thái";
        }
        return switch (status) {
            case PENDING_DEPOSIT -> "Chờ thanh toán tiền cọc";
            case REQUESTED -> "Khởi tạo ca hẹn & Đã đặt cọc";
            case PENDING_AGENCY_DISPATCH -> "Chờ Studio phân phối thợ";
            case AGENCY_ASSIGNED -> "Studio đã chỉ định thợ";
            case ACCEPTED -> "Chuyên viên đã tiếp nhận ca";
            case ON_THE_WAY -> "Chuyên viên đang di chuyển";
            case ARRIVED -> "Chuyên viên đã đến điểm hẹn";
            case IN_PROGRESS -> "Đang thực hiện làm đẹp";
            case COMPLETED -> "Hoàn thành ca làm đẹp";
            case PAID_OUT -> "Đã quyết toán dịch vụ";
            case CANCELLED, CANCELLED_EXPIRED -> "Ca hẹn đã bị hủy";
            case DISPUTED -> "Báo cáo sự cố / Khiếu nại";
            case DISPUTE_REFUNDED -> "Khiếu nại: Đã hoàn tiền";
            case DISPUTE_COMPENSATED -> "Khiếu nại: Đã bồi thường/quyết toán";
            default -> status.name();
        };
    }
}
