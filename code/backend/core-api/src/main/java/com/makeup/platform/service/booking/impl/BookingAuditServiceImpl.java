package com.makeup.platform.service.booking.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingHistoryEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.repository.booking.BookingHistoryRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.service.booking.BookingAuditService;
import com.makeup.platform.dto.response.booking.BookingHistoryRes;
import com.makeup.platform.mapper.booking.BookingHistoryMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingAuditServiceImpl implements BookingAuditService {

    private final BookingHistoryRepository bookingHistoryRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final BookingHistoryMapper bookingHistoryMapper;

    @Override
    @Transactional
    public BookingHistoryEntity logTransition(BookingEntity booking, BookingStatus fromStatus, BookingStatus toStatus, Long changedByUserId, String note) {
        UserEntity changedByUser = null;
        if (changedByUserId != null) {
            changedByUser = userRepository.findById(changedByUserId).orElse(null);
        }

        String finalNote = enrichTransitionNote(booking, toStatus, note);

        BookingHistoryEntity history = BookingHistoryEntity.builder()
                .booking(booking)
                .fromStatus(fromStatus)
                .toStatus(toStatus)
                .changedByUser(changedByUser)
                .note(finalNote)
                .build();

        log.info("[BookingAudit] Transition logged for bookingId={}, fromStatus={}, toStatus={}, userId={}, note={}",
                booking.getId(), fromStatus, toStatus, changedByUserId, finalNote);

        return bookingHistoryRepository.save(history);
    }

    private String enrichTransitionNote(BookingEntity booking, BookingStatus toStatus, String rawNote) {
        if (booking == null || toStatus == null) {
            return rawNote;
        }

        String artistName = (booking.getMua() != null && booking.getMua().getUser() != null)
                ? booking.getMua().getUser().getFullName()
                : "Chuyên viên trang điểm";
        String artistPhone = (booking.getMua() != null && booking.getMua().getUser() != null)
                ? booking.getMua().getUser().getPhoneNumber()
                : "";
        String dest = booking.getDestinationAddress() != null ? booking.getDestinationAddress() : "địa chỉ hẹn";
        String origin = "Điểm xuất phát của chuyên viên";
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
            origin = sb.isEmpty() ? booking.getAgency().getAgencyName() : sb.toString();
        } else if (booking.getMua() != null && booking.getMua().getBaseAddressText() != null && !booking.getMua().getBaseAddressText().isBlank()) {
            origin = booking.getMua().getBaseAddressText();
        }

        return switch (toStatus) {
            case REQUESTED -> "Khách hàng tạo đơn và hoàn tất đặt cọc. Đơn hàng đang chờ chuyên viên tiếp nhận.";
            case ACCEPTED -> "Chuyên viên " + artistName + " đã xác nhận tiếp nhận đơn hàng thành công.";
            case ON_THE_WAY -> "Chuyên viên " + artistName + " đã xuất phát từ " + origin + " và đang di chuyển đến: " + dest + (artistPhone.isBlank() ? "" : " (SĐT: " + artistPhone + ")");
            case ARRIVED -> "Chuyên viên " + artistName + " đã có mặt tại điểm hẹn: " + dest + ". Quý khách vui lòng kiểm tra điện thoại.";
            case IN_PROGRESS -> {
                String pkgName = booking.getServicePackage() != null ? booking.getServicePackage().getPackageName() : "dịch vụ";
                String styleName = booking.getStyle() != null ? booking.getStyle().getStyleName() : "tiêu chuẩn";
                yield "Chuyên viên " + artistName + " đang thực hiện làm đẹp (" + pkgName + " - Phong cách: " + styleName + ").";
            }
            case COMPLETED -> {
                String total = booking.getTotalAmount() != null ? String.format("%,.0f đ", booking.getTotalAmount()) : "";
                yield "Chuyên viên đã hoàn tất ca làm đẹp xuất sắc. Tổng thanh toán: " + total + ". Cảm ơn Quý khách!";
            }
            case PAID_OUT -> "Hệ thống hoàn tất quyết toán đơn hàng.";
            case CANCELLED, CANCELLED_EXPIRED -> (rawNote != null && !rawNote.isBlank() && !rawNote.startsWith("Chuyển trạng thái")) ? rawNote : "Đơn hàng đã bị hủy theo yêu cầu.";
            case DISPUTED -> (rawNote != null && !rawNote.isBlank() && !rawNote.startsWith("Chuyển trạng thái")) ? rawNote : "Khách hàng đã gửi yêu cầu xử lý sự cố / khiếu nại.";
            default -> (rawNote != null && !rawNote.isBlank()) ? rawNote : "Cập nhật trạng thái sang " + toStatus.name();
        };
    }

    @Override
    @Transactional
    public BookingHistoryEntity logTransition(Long bookingId, BookingStatus fromStatus, BookingStatus toStatus, Long changedByUserId, String note) {
        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND, "booking.not_found", HttpStatus.NOT_FOUND));

        return logTransition(booking, fromStatus, toStatus, changedByUserId, note);
    }

    @Override
    @Transactional(readOnly = true)
    public BookingHistoryRes getBookingHistory(Long bookingId) {
        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND, "booking.not_found", HttpStatus.NOT_FOUND));

        List<BookingHistoryEntity> historyList = bookingHistoryRepository.findByBookingIdOrderByCreatedAtAsc(bookingId);
        return bookingHistoryMapper.toHistoryRes(booking, historyList);
    }
}
